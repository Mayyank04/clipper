/**
 * VIRALCLIP STUDIO — SUBTITLE FORMATTER
 * Formats high-precision ASS (Advanced SubStation Alpha) v4+ subtitles for 1080x1920 MP4 export.
 * Preserves per-word highlighting, scripts/fonts (Devanagari, Gurmukhi, CJK, etc.), and timing parity.
 */

export function hexToAssColor(hex: string = '#ffffff'): string {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 6) {
    const r = clean.substring(0, 2);
    const g = clean.substring(2, 4);
    const b = clean.substring(4, 6);
    return `&H00${b}${g}${r}&`;
  }
  return '&H00FFFFFF&';
}

export function detectScriptFont(text: string, defaultFont: string): string {
  if (!text) return defaultFont || 'Arial';
  // Devanagari (Hindi, Marathi, Sanskrit)
  if (/[\u0900-\u097F]/.test(text)) return 'Noto Sans Devanagari';
  // Gurmukhi (Punjabi)
  if (/[\u0A00-\u0A7F]/.test(text)) return 'Noto Sans Gurmukhi';
  // Arabic / Urdu
  if (/[\u0600-\u06FF]/.test(text)) return 'Geeza Pro';
  // Bengali
  if (/[\u0980-\u09FF]/.test(text)) return 'Noto Sans Bengali';
  // Gujarati
  if (/[\u0A80-\u0AFF]/.test(text)) return 'Noto Sans Gujarati';
  // Tamil
  if (/[\u0B80-\u0BFF]/.test(text)) return 'Noto Sans Tamil';
  // Telugu
  if (/[\u0C00-\u0C7F]/.test(text)) return 'Noto Sans Telugu';
  // Kannada
  if (/[\u0C80-\u0CFF]/.test(text)) return 'Noto Sans Kannada';
  // Malayalam
  if (/[\u0D00-\u0D7F]/.test(text)) return 'Noto Sans Malayalam';
  // CJK (Chinese, Japanese, Korean)
  if (/[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/.test(text)) return 'PingFang SC';
  return defaultFont || 'Arial';
}

export function formatAssTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds - Math.floor(seconds)) * 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

// Helper to generate ASS subtitles for burning into exported video
export function formatAssSubtitle(captions: any[] = [], captionConfig?: any): string {
  const allText = (captions || []).map((c: any) => c.text || '').join(' ');
  const baseFont = captionConfig?.fontFamily?.split(',')[0]?.replace(/['"]/g, '').trim() || 'Arial';
  const font = detectScriptFont(allText, baseFont);
  // Crisp typography for 1080x1920: scale font size appropriately and clamp within safe bounds (54..104px)
  const rawFontSize = Math.round((captionConfig?.fontSize || 28) * 2.2);
  const fontSize = Math.max(54, Math.min(104, rawFontSize));
  const primaryColor = hexToAssColor(captionConfig?.primaryColor || '#ffffff');
  const highlightColor = hexToAssColor(captionConfig?.highlightColor || '#facc15');
  const strokeColor = hexToAssColor(captionConfig?.strokeColor || '#000000');
  const strokeWidth = captionConfig?.strokeWidth !== undefined ? Math.round(captionConfig.strokeWidth * 1.5) : 4;
  const shadow = captionConfig?.hasShadow ? 3 : 0;
  const marginV = Math.round(1920 * (1 - (captionConfig?.positionY ?? 72) / 100));

  // Alignment: 1 = Bottom-Left, 2 = Bottom-Center, 3 = Bottom-Right
  const alignment = captionConfig?.alignment === 'left' ? 1 : captionConfig?.alignment === 'right' ? 3 : 2;

  // Background Box / Pill style support
  const hasBg = Boolean(captionConfig?.backgroundColor && captionConfig.backgroundColor !== 'transparent');
  const borderStyle = hasBg && captionConfig?.backgroundShape ? 3 : 1; // 3 = opaque box in ASS
  const backColor = hasBg
    ? hexToAssColor(captionConfig.backgroundColor)
    : '&HA0000000';

  let content = `[Script Info]
Title: ViralClip Subtitles
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${font},${fontSize},${primaryColor},${highlightColor},${strokeColor},${backColor},-1,0,0,0,100,100,0,0,${borderStyle},${strokeWidth},${shadow},${alignment},40,40,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  for (const cap of captions) {
    const rawStart = Number(cap.displayStart !== undefined ? cap.displayStart : cap.start) || 0;
    const rawEnd = Number(cap.displayEnd !== undefined ? cap.displayEnd : cap.end) || (rawStart + 1.2);
    const start = Math.max(0, rawStart);
    const end = Math.max(start + 0.1, rawEnd);
    const words = Array.isArray(cap.words) && cap.words.length > 0 ? cap.words : null;

    if (words && words.length > 0) {
      // Sort words by start time
      const sortedWords = [...words].sort((a, b) => (Number(a.start) || 0) - (Number(b.start) || 0));
      const firstWordStart = Math.max(start, Number(sortedWords[0].start) || start);

      // 1. If beat starts earlier than first spoken word, show static line until first word
      if (firstWordStart > start + 0.05) {
        const preambleText = sortedWords.map((w: any) => {
          let str = String(w.word || w.text || '').trim();
          return captionConfig?.uppercase ? str.toUpperCase() : str;
        }).join(' ').trim();
        if (preambleText) {
          content += `Dialogue: 0,${formatAssTime(start)},${formatAssTime(firstWordStart)},Default,,0,0,0,,${preambleText}\n`;
        }
      }

      // 2. Continuous per-word active timing events: bridge gaps between consecutive words to prevent blinking
      let lastSpokenEnd = firstWordStart;
      for (let wIdx = 0; wIdx < sortedWords.length; wIdx++) {
        const activeW = sortedWords[wIdx];
        const nextW = sortedWords[wIdx + 1];

        const wStart = Math.max(start, Number(activeW.start) || lastSpokenEnd);
        // Bridge until the start of the next word to eliminate inter-word blackouts
        let wEnd: number;
        if (nextW) {
          const nextStart = Math.max(wStart + 0.06, Number(nextW.start) || (wStart + 0.3));
          wEnd = Math.min(end, nextStart);
        } else {
          // Last word: keep active until word end or end of segment
          wEnd = Math.min(end, Math.max(wStart + 0.1, Number(activeW.end) || (wStart + 0.35)));
        }
        lastSpokenEnd = Math.max(lastSpokenEnd, wEnd);

        if (wEnd <= wStart) {
          wEnd = wStart + 0.06;
        }

        const sTime = formatAssTime(wStart);
        const eTime = formatAssTime(wEnd);

        // Active word wrapped in highlight color and subtle kinetic pop (106% default or 110% for hero emphasis)
        const lineParts = sortedWords.map((w: any, idx: number) => {
          let wordStr = String(w.word || w.text || '').trim();
          if (captionConfig?.uppercase) wordStr = wordStr.toUpperCase();
          const isHero = w?.emphasis === 'hero' || w?.isHighlight;
          const popScale = isHero ? 110 : 106;

          if (idx === wIdx) {
            return `{\\c${highlightColor}\\b1\\fscx${popScale}\\fscy${popScale}}${wordStr}{\\c${primaryColor}\\b0\\fscx100\\fscy100}`;
          }
          if (captionConfig?.animationMode === 'WORD_BY_WORD' && idx > wIdx) {
            return `{\\alpha&HFF&}${wordStr}{\\alpha&H00&}`;
          }
          if (isHero) {
            return `{\\c${highlightColor}}${wordStr}{\\c${primaryColor}}`;
          }
          return wordStr;
        });

        const lineText = lineParts.join(' ').replace(/[\r\n]+/g, ' ').trim();
        if (lineText) {
          content += `Dialogue: 0,${sTime},${eTime},Default,,0,0,0,,${lineText}\n`;
        }
      }

      // 3. Post-speech visual hold: keep the segment displayed until beatEnd so viewer finishes reading
      if (end > lastSpokenEnd + 0.05) {
        const holdText = sortedWords.map((w: any) => {
          let str = String(w.word || w.text || '').trim();
          return captionConfig?.uppercase ? str.toUpperCase() : str;
        }).join(' ').trim();
        if (holdText) {
          content += `Dialogue: 0,${formatAssTime(lastSpokenEnd)},${formatAssTime(end)},Default,,0,0,0,,${holdText}\n`;
        }
      }
    } else {
      const sTime = formatAssTime(start);
      const eTime = formatAssTime(end);
      let text = String(cap.text || '').replace(/[\r\n]+/g, ' ').replace(/{/g, '').replace(/}/g, '').trim();
      if (captionConfig?.uppercase) text = text.toUpperCase();
      if (text) {
        content += `Dialogue: 0,${sTime},${eTime},Default,,0,0,0,,${text}\n`;
      }
    }
  }
  return content;
}

export function formatSrtTime(seconds: number): string {
  const totalMs = Math.round(seconds * 1000);
  const h = Math.floor(totalMs / 3600000);
  const m = Math.floor((totalMs % 3600000) / 60000);
  const s = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

export function formatVttTime(seconds: number): string {
  const totalMs = Math.round(seconds * 1000);
  const h = Math.floor(totalMs / 3600000);
  const m = Math.floor((totalMs % 3600000) / 60000);
  const s = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

export function formatSrtSubtitle(captions: any[] = []): string {
  let output = '';
  let index = 1;
  for (const cap of captions) {
    const start = Math.max(0, Number(cap.start) || 0);
    const end = Math.max(start + 0.1, Number(cap.end) || (start + 1));
    const text = String(cap.text || (cap.words || []).map((w: any) => w.word || w.text || '').join(' ')).trim();
    if (text) {
      output += `${index}\n${formatSrtTime(start)} --> ${formatSrtTime(end)}\n${text}\n\n`;
      index++;
    }
  }
  return output.trim() + '\n';
}

export function formatVttSubtitle(captions: any[] = []): string {
  let output = 'WEBVTT\n\n';
  for (const cap of captions) {
    const start = Math.max(0, Number(cap.start) || 0);
    const end = Math.max(start + 0.1, Number(cap.end) || (start + 1));
    const text = String(cap.text || (cap.words || []).map((w: any) => w.word || w.text || '').join(' ')).trim();
    if (text) {
      output += `${formatVttTime(start)} --> ${formatVttTime(end)}\n${text}\n\n`;
    }
  }
  return output.trim() + '\n';
}

export function formatTxtSubtitle(captions: any[] = []): string {
  return (captions || [])
    .map((cap: any) => String(cap.text || (cap.words || []).map((w: any) => w.word || w.text || '').join(' ')).trim())
    .filter(Boolean)
    .join(' ');
}

export function formatJsonSubtitle(captions: any[] = [], metadata?: any): string {
  return JSON.stringify({
    generator: 'ViralClip Studio',
    version: '2.0',
    exportedAt: new Date().toISOString(),
    metadata,
    captions,
  }, null, 2);
}
