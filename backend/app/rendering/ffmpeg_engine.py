"""
FFmpeg Render Engine
Renders canonical 1080x1920 vertical short-form video from RenderPlan:
- 1080x1920 (9:16)
- H.264 (yuv420p, BT.709 color matrix)
- AAC 48kHz stereo
- Clean ASS subtitle burning
- Zero watermark guarantee (watermark = false default)
- Multi-format subtitle exports: SRT, VTT, ASS, TXT, JSON
"""

import json
import os
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, Any, List, Optional
from ..config import settings
from .validator import forensic_export_validation

def format_ass_time(seconds: float) -> str:
    """Formats seconds into ASS timestamp: H:MM:SS.cs"""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    cs = int(round((seconds - int(seconds)) * 100))
    if cs >= 100:
        cs = 99
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"

def hex_to_ass_color(hex_str: str = "#ffffff") -> str:
    """Converts #RRGGBB to ASS &H00BBGGRR& format."""
    clean = hex_str.replace("#", "").strip()
    if len(clean) == 6:
        r, g, b = clean[0:2], clean[2:4], clean[4:6]
        return f"&H00{b}{g}{r}&"
    return "&H00FFFFFF&"

def generate_ass_subtitle_content(captions: List[Dict[str, Any]], style: Dict[str, Any]) -> str:
    """Generates professional ASS subtitle file with exact font, word-level highlighting, and gap-free timing."""
    font_name = style.get("fontFamily", "Inter").split(",")[0].strip("\"' ")
    raw_font_size = int(style.get("fontSize", 28)) * 2.2
    font_size = max(54, min(104, int(raw_font_size)))
    primary_color = hex_to_ass_color(style.get("primaryColor", style.get("textColor", "#ffffff")))
    highlight_color = hex_to_ass_color(style.get("highlightColor", "#facc15"))
    stroke_color = hex_to_ass_color(style.get("strokeColor", "#000000"))
    stroke_width = int(style.get("strokeWidth", 3.0) * 1.5)
    shadow = 3 if style.get("hasShadow", True) else 0
    margin_v = int(1920 * (1 - (style.get("positionY", 72) / 100.0)))
    alignment = 1 if style.get("alignment") == "left" else (3 if style.get("alignment") == "right" else 2)

    has_bg = bool(style.get("backgroundColor") and style.get("backgroundColor") != "transparent")
    border_style = 3 if has_bg and style.get("backgroundShape") else 1
    back_color = hex_to_ass_color(style.get("backgroundColor", "#000000")) if has_bg else "&HA0000000"

    header = f"""[Script Info]
Title: Viral Studio Generated Captions
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font_name},{font_size},{primary_color},{highlight_color},{stroke_color},{back_color},-1,0,0,0,100,100,0,0,{border_style},{stroke_width},{shadow},{alignment},40,40,{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    events = []
    uppercase = bool(style.get("uppercase", False))

    for cap in captions:
        start_t = max(0.0, float(cap.get("displayStart", cap.get("start", 0.0))))
        end_t = max(start_t + 0.1, float(cap.get("displayEnd", cap.get("end", start_t + 1.2))))
        words = cap.get("words", [])

        if words and isinstance(words, list) and len(words) > 0:
            sorted_words = sorted(words, key=lambda w: float(w.get("start", 0.0)))
            first_w_start = max(start_t, float(sorted_words[0].get("start", start_t)))

            # Preamble before first word
            if first_w_start > start_t + 0.05:
                preamble_parts = [
                    (w.get("text") or w.get("word", "")).upper() if uppercase else (w.get("text") or w.get("word", ""))
                    for w in sorted_words
                ]
                preamble_str = " ".join(preamble_parts).strip()
                if preamble_str:
                    events.append(f"Dialogue: 0,{format_ass_time(start_t)},{format_ass_time(first_w_start)},Default,,0,0,0,,{preamble_str}")

            # Word-by-word active timing with gap bridging
            last_spoken_end = first_w_start
            for idx, w in enumerate(sorted_words):
                w_start = max(start_t, float(w.get("start", last_spoken_end)))
                if idx + 1 < len(sorted_words):
                    next_start = max(w_start + 0.06, float(sorted_words[idx + 1].get("start", w_start + 0.3)))
                    w_end = min(end_t, next_start)
                else:
                    w_end = min(end_t, max(w_start + 0.1, float(w.get("end", w_start + 0.35))))

                last_spoken_end = max(last_spoken_end, w_end)
                if w_end <= w_start:
                    w_end = w_start + 0.06

                s_time = format_ass_time(w_start)
                e_time = format_ass_time(w_end)

                line_parts = []
                for p_idx, pw in enumerate(sorted_words):
                    pw_text = (pw.get("text") or pw.get("word", "")).strip()
                    if uppercase:
                        pw_text = pw_text.upper()
                    is_hero = pw.get("emphasis") == "hero" or pw.get("isHighlight", False)
                    pop_scale = 110 if is_hero else 106

                    if p_idx == idx:
                        line_parts.append(f"{{\\c{highlight_color}\\b1\\fscx{pop_scale}\\fscy{pop_scale}}}{pw_text}{{\\c{primary_color}\\b0\\fscx100\\fscy100}}")
                    elif is_hero:
                        line_parts.append(f"{{\\c{highlight_color}}}{pw_text}{{\\c{primary_color}}}")
                    else:
                        line_parts.append(pw_text)

                line_text = " ".join(line_parts).strip()
                if line_text:
                    events.append(f"Dialogue: 0,{s_time},{e_time},Default,,0,0,0,,{line_text}")

            # Post-speech hold
            if end_t > last_spoken_end + 0.05:
                hold_parts = [
                    (w.get("text") or w.get("word", "")).upper() if uppercase else (w.get("text") or w.get("word", ""))
                    for w in sorted_words
                ]
                hold_str = " ".join(hold_parts).strip()
                if hold_str:
                    events.append(f"Dialogue: 0,{format_ass_time(last_spoken_end)},{format_ass_time(end_t)},Default,,0,0,0,,{hold_str}")
        else:
            text = str(cap.get("text", "")).strip()
            if uppercase:
                text = text.upper()
            ass_start = format_ass_time(start_t)
            ass_end = format_ass_time(end_t)
            events.append(f"Dialogue: 0,{ass_start},{ass_end},Default,,0,0,0,,{text}")

    return header + "\n".join(events) + "\n"

def render_video_export(
    source_video_path: str,
    output_mp4_path: str,
    render_plan: Dict[str, Any],
    on_progress = None
) -> Dict[str, Any]:
    """
    Executes FFmpeg filtergraph to produce clean 1080x1920 vertical video with subtitles.
    """
    captions = render_plan.get("captions", [])
    style = render_plan.get("captionStyle", {})
    watermark_enabled = render_plan.get("watermark", settings.WATERMARK_ENABLED)

    temp_dir = tempfile.mkdtemp(prefix="render_")
    ass_path = os.path.join(temp_dir, "captions.ass")

    # 1. Write ASS subtitle file
    with open(ass_path, "w", encoding="utf-8") as f:
        f.write(generate_ass_subtitle_content(captions, style))

    # 2. Build FFmpeg command with 1080x1920 vertical canvas
    filter_complex = [
        "scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos",
        "crop=1080:1920",
        f"subtitles='{ass_path}'"
    ]

    # Watermark guard: NEVER inject unless explicitly enabled
    if watermark_enabled and render_plan.get("watermarkText"):
        wm_text = render_plan.get("watermarkText")
        filter_complex.append(f"drawtext=text='{wm_text}':x=w-tw-40:y=h-th-40:fontsize=24:fontcolor=white@0.6")

    vf_string = ",".join(filter_complex)

    cmd = [
        settings.FFMPEG_PATH,
        "-y",
        "-i", source_video_path,
        "-vf", vf_string,
        "-c:v", "libx264",
        "-preset", "fast",
        "-profile:v", "high",
        "-level", "4.2",
        "-pix_fmt", "yuv420p",
        "-colorspace", "bt709",
        "-color_primaries", "bt709",
        "-color_trc", "bt709",
        "-c:a", "aac",
        "-b:a", "192k",
        "-ar", "48000",
        "-ac", "2",
        "-movflags", "+faststart",
        output_mp4_path
    ]

    print(f"[FFmpegEngine] Starting render -> {output_mp4_path}")
    process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    stdout, stderr = process.communicate()

    if process.returncode != 0:
        raise RuntimeError(f"FFmpeg rendering failed: {stderr[-500:]}")

    # 3. Perform forensic export validation
    validation = forensic_export_validation(output_mp4_path)

    # 4. Generate companion subtitle files (.srt, .vtt, .ass, .txt, .json)
    base_stem = Path(output_mp4_path).stem
    out_dir = Path(output_mp4_path).parent

    # SRT export
    srt_lines = []
    for i, c in enumerate(captions, 1):
        s_t = float(c.get("displayStart", c.get("start", 0.0)))
        e_t = float(c.get("displayEnd", c.get("end", 0.0)))
        srt_lines.append(f"{i}\n{format_ass_time(s_t).replace('.', ',')} --> {format_ass_time(e_t).replace('.', ',')}\n{c.get('text', '')}\n")
    with open(out_dir / f"{base_stem}.srt", "w", encoding="utf-8") as f:
        f.write("\n".join(srt_lines))

    # VTT export
    vtt_lines = ["WEBVTT\n"]
    for i, c in enumerate(captions, 1):
        s_t = float(c.get("displayStart", c.get("start", 0.0)))
        e_t = float(c.get("displayEnd", c.get("end", 0.0)))
        vtt_lines.append(f"{format_ass_time(s_t)} --> {format_ass_time(e_t)}\n{c.get('text', '')}\n")
    with open(out_dir / f"{base_stem}.vtt", "w", encoding="utf-8") as f:
        f.write("\n".join(vtt_lines))

    # ASS export
    with open(out_dir / f"{base_stem}.ass", "w", encoding="utf-8") as f:
        f.write(generate_ass_subtitle_content(captions, style))

    # Plain text export
    with open(out_dir / f"{base_stem}.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(c.get("text", "") for c in captions))

    # JSON export
    with open(out_dir / f"{base_stem}.json", "w", encoding="utf-8") as f:
        json.dump(render_plan, f, indent=2)

    return {
        "exportPath": output_mp4_path,
        "validation": validation,
        "watermarkInjected": watermark_enabled
    }
