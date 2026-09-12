import React from 'react';
import { CaptionSegment, AudioToVideoConfig } from '../../types';
import { getTypingCaptionState, TYPING_STYLES } from '../../utils/typingCaptionEngine';

interface TypingCaptionOverlayProps {
  captions: CaptionSegment[];
  currentTime: number;
  config: AudioToVideoConfig;
}

export const TypingCaptionOverlay: React.FC<TypingCaptionOverlayProps> = ({
  captions,
  currentTime,
  config,
}) => {
  const state = getTypingCaptionState(captions, currentTime, config);
  const styleDef = TYPING_STYLES[config.typingStyle] || TYPING_STYLES.minimal_type;

  if (!state.segment) {
    return null;
  }

  const posY = config.captionPositionY ?? 50;
  const isKaraokeOrWord = config.typingMode === 'word_by_word' || config.typingMode === 'karaoke';

  return (
    <div
      className="absolute inset-x-4 z-25 flex flex-col items-center justify-center pointer-events-none transition-all duration-150"
      style={{
        top: `${posY}%`,
        transform: 'translateY(-50%)',
      }}
    >
      <div
        className="max-w-[92%] text-center select-none"
        style={{
          fontFamily: styleDef.fontFamily,
          fontSize: `${styleDef.defaultFontSize || 38}px`,
          letterSpacing: styleDef.letterSpacing || 'normal',
          textTransform: styleDef.uppercase ? 'uppercase' : 'none',
          lineHeight: 1.25,
        }}
      >
        {/* CHAR-BY-CHAR TYPEWRITER MODE */}
        {!isKaraokeOrWord && (
          <div
            className="inline-block px-3 py-1.5 rounded-lg transition-all"
            style={{
              color: styleDef.primaryColor,
              backgroundColor: styleDef.boxBackground || 'transparent',
              textShadow: styleDef.textShadow || '0 2px 8px rgba(0,0,0,0.85)',
            }}
          >
            <span>{state.fullRevealedText}</span>
            {state.cursorVisible && (
              <span
                className="inline-block ml-0.5 animate-pulse text-amber-400 font-extrabold"
              >
                |
              </span>
            )}
          </div>
        )}

        {/* WORD-BY-WORD & KARAOKE MODE */}
        {isKaraokeOrWord && (
          <div
            className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 px-3 py-2 rounded-xl transition-all"
            style={{
              backgroundColor: styleDef.boxBackground || 'transparent',
            }}
          >
            {state.renderedWords.map((w, idx) => {
              const isWordByWord = config.typingMode === 'word_by_word';

              // Hide future words in word-by-word mode
              if (isWordByWord && w.isFuture) {
                return null;
              }

              return (
                <span
                  key={idx}
                  className="inline-block transition-all duration-100"
                  style={{
                    color: w.color,
                    opacity: w.opacity,
                    transform: `scale(${w.scale})`,
                    backgroundColor: w.backgroundColor || undefined,
                    padding: w.backgroundColor ? '2px 6px' : undefined,
                    borderRadius: w.backgroundColor ? '4px' : undefined,
                    textDecoration: w.hasUnderline ? 'underline' : undefined,
                    textShadow: w.hasGlow
                      ? `0 0 20px ${w.glowColor || styleDef.highlightColor}, 0 2px 10px rgba(0,0,0,0.9)`
                      : styleDef.textShadow || '0 2px 10px rgba(0,0,0,0.85)',
                    fontWeight: w.isActive ? 900 : 700,
                  }}
                >
                  {w.word}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
