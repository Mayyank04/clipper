"""
FastAPI Whisper Service using faster-whisper
- Model caching (prevents reloading across requests)
- 16kHz mono PCM audio conversion
- Full duration transcription (no artificial 15s/30s cutoff)
- True word-level native timestamps
- Monotonic validation (start >= 0, end > start)
- Indian language detection and Hinglish Romanization support
- Post-ASR caption corrections
"""

import os
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Optional, Dict, Any, List

from ..config import settings
from ..schemas.transcription import (
    TranscriptWord,
    TranscriptSegment,
    TranscriptionOptions,
    TranscriptResult,
)
from .indian_languages import (
    SUPPORTED_INDIAN_LANGUAGES,
    is_devanagari,
    detect_hinglish,
    normalize_hinglish_text,
)
from .correction import apply_caption_corrections

# Model cache: (model_name, device, compute_type) -> WhisperModel instance
_MODEL_CACHE: Dict[tuple, Any] = {}

class WhisperService:
    def __init__(
        self,
        default_model: str = settings.WHISPER_MODEL,
        device: str = settings.WHISPER_DEVICE,
        compute_type: str = settings.WHISPER_COMPUTE_TYPE
    ):
        self.default_model = default_model
        self.device = device
        self.compute_type = compute_type

    def get_model(self, model_name: Optional[str] = None):
        """Loads and caches faster-whisper models to avoid reloading overhead."""
        name = model_name or self.default_model
        cache_key = (name, self.device, self.compute_type)

        if cache_key not in _MODEL_CACHE:
            from faster_whisper import WhisperModel
            print(f"[WhisperService] Loading model '{name}' on device='{self.device}', compute='{self.compute_type}'...")
            start_load = time.time()
            model = WhisperModel(
                name,
                device=self.device,
                compute_type=self.compute_type,
                cpu_threads=4
            )
            _MODEL_CACHE[cache_key] = model
            print(f"[WhisperService] Model '{name}' cached in {time.time() - start_load:.2f}s")

        return _MODEL_CACHE[cache_key]

    def extract_pcm_audio(self, video_or_audio_path: str, output_wav_path: str) -> float:
        """
        Extracts 16kHz mono 16-bit PCM WAV using FFmpeg.
        Returns audio duration in seconds.
        """
        cmd = [
            settings.FFMPEG_PATH,
            "-y",
            "-i", video_or_audio_path,
            "-vn",
            "-acodec", "pcm_s16le",
            "-ar", "16000",
            "-ac", "1",
            output_wav_path
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0:
            raise RuntimeError(f"FFmpeg audio extraction failed: {res.stderr[:500]}")

        # Probe duration
        probe_cmd = [
            settings.FFPROBE_PATH,
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            output_wav_path
        ]
        probe_res = subprocess.run(probe_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        try:
            return float(probe_res.stdout.strip())
        except Exception:
            return 0.0

    def transcribe(
        self,
        media_path: str,
        options: Optional[TranscriptionOptions] = None,
        on_progress = None
    ) -> TranscriptResult:
        """
        Transcribes media file from 00:00 through completion.
        Guarantees native word-level timestamps with rigorous validation.
        """
        options = options or TranscriptionOptions()
        model_name = options.model or self.default_model
        model = self.get_model(model_name)

        # 1. Convert to 16kHz mono PCM WAV
        temp_dir = tempfile.mkdtemp(prefix="whisper_audio_")
        wav_path = os.path.join(temp_dir, "audio_16k.wav")
        duration = self.extract_pcm_audio(media_path, wav_path)

        try:
            lang_param = None if options.language in (None, "auto", "") else options.language
            if lang_param == "hinglish":
                lang_param = "hi"  # Whisper transcribes Hindi phonetics

            # 2. Execute faster-whisper transcription with word-level timestamps
            segments_gen, info = model.transcribe(
                wav_path,
                language=lang_param,
                word_timestamps=True,
                vad_filter=True,
                vad_parameters=dict(min_silence_duration_ms=400),
                beam_size=5
            )

            detected_lang = info.language
            lang_prob = info.language_probability

            raw_words: List[TranscriptWord] = []
            raw_segments: List[TranscriptSegment] = []
            full_text_list: List[str] = []

            last_end_time = 0.0
            seg_idx = 0

            for seg in segments_gen:
                seg_idx += 1
                seg_text = seg.text.strip()
                full_text_list.append(seg_text)

                seg_words: List[TranscriptWord] = []
                if hasattr(seg, "words") and seg.words:
                    for w in seg.words:
                        w_text = w.word.strip()
                        if not w_text:
                            continue
                        
                        # Validate and enforce monotonic timestamps
                        w_start = max(round(float(w.start), 3), last_end_time, 0.0)
                        w_end = max(round(float(w.end), 3), w_start + 0.05)
                        w_conf = round(float(w.probability), 3) if hasattr(w, 'probability') else 0.95

                        word_obj = TranscriptWord(
                            text=w_text,
                            start=w_start,
                            end=w_end,
                            confidence=w_conf,
                            speechStart=w_start,
                            speechEnd=w_end
                        )
                        raw_words.append(word_obj)
                        seg_words.append(word_obj)
                        last_end_time = w_end

                raw_segments.append(
                    TranscriptSegment(
                        id=f"seg_{seg_idx}",
                        start=round(float(seg.start), 3),
                        end=round(float(seg.end), 3),
                        text=seg_text,
                        words=seg_words,
                        language=detected_lang
                    )
                )

                if on_progress and duration > 0:
                    prog = min(int((seg.end / duration) * 100), 100)
                    on_progress(prog, f"Transcribed {int(seg.end)}s of {int(duration)}s")

            # 3. Post-ASR Corrections
            cleaned_words = apply_caption_corrections(
                raw_words,
                apply_correction=options.apply_correction,
                remove_fillers=options.remove_fillers,
                filter_noise=options.filter_music_tokens
            )

            # 4. Hinglish Detection & Transliteration
            combined_text = " ".join(w.text for w in cleaned_words)
            is_hinglish = (detected_lang == "hi" and detect_hinglish(combined_text)) or (options.language == "hinglish")
            romanized_text = None

            if options.transliterate_hinglish or options.language == "hinglish":
                romanized_text = normalize_hinglish_text(combined_text)
                # Also Romanize individual word items if Devanagari
                for w in cleaned_words:
                    if is_devanagari(w.text):
                        w.text = normalize_hinglish_text(w.text)

            transcript_id = f"trn_{int(time.time() * 1000)}"
            return TranscriptResult(
                id=transcript_id,
                duration=round(duration, 3),
                language=options.language or detected_lang,
                detected_language=detected_lang,
                language_probability=round(lang_prob, 3),
                text=combined_text,
                words=cleaned_words,
                segments=raw_segments,
                is_hinglish=is_hinglish,
                romanized_text=romanized_text
            )

        finally:
            # Clean temporary audio files
            if os.path.exists(wav_path):
                try:
                    os.remove(wav_path)
                    os.rmdir(temp_dir)
                except Exception:
                    pass

whisper_service = WhisperService()
