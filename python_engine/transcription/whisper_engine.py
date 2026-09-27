"""
VIRALCLIP STUDIO — LOCAL MULTILINGUAL WHISPER ENGINE
High-performance speech-to-text inference supporting:
- Apple Silicon Metal GPU via mlx-whisper (Device(gpu, 0))
- faster-whisper / CTranslate2 (CPU / CUDA fallback)
- Multilingual & Indian language matrix (English, Hindi, Hinglish, Bengali, Assamese, etc.)
- Native word timestamps, repetition suppression, and caption segmentation
"""

import os
import sys
import time
import subprocess
from typing import Dict, Any, List, Optional, Callable

from python_engine.transcription.language_detector import classify_transcript_language
from python_engine.transcription.quality_analyzer import analyze_and_clean_word_stream
from python_engine.transcription.caption_segmenter import segment_into_beats
from workers.worker_health import detect_transcription_backend, get_ffmpeg_info

class MultilingualWhisperEngine:
    _instance: Optional['MultilingualWhisperEngine'] = None

    def __init__(self):
        self.backend_info = detect_transcription_backend()
        self.backend = self.backend_info["backend"]
        self.device = self.backend_info["device"]
        self.is_accelerated = self.backend_info["accelerated"]
        self.loaded_model = None
        self.model_instance = None

    @classmethod
    def get_instance(cls) -> 'MultilingualWhisperEngine':
        if cls._instance is None:
            cls._instance = MultilingualWhisperEngine()
        return cls._instance

    def load_model(self, model_size: str = "base") -> Any:
        size = (model_size or "base").lower().strip()
        if size in ("tiny", "fast"):
            mkey = "tiny"
        elif size in ("medium", "quality"):
            mkey = "medium"
        elif size in ("small", "balanced"):
            mkey = "small"
        else:
            mkey = "base"

        target_model = f"mlx-community/whisper-{mkey}-mlx" if self.backend == "mlx-whisper" else mkey
        if self.model_instance is not None and self.loaded_model == target_model:
            return self.model_instance

        if self.backend == "mlx-whisper":
            import mlx_whisper
            self.model_instance = target_model
        elif self.backend == "faster-whisper":
            from faster_whisper import WhisperModel
            comp_type = self.backend_info.get("computeType", "int8_float32")
            self.model_instance = WhisperModel(target_model, device="cpu", compute_type=comp_type)
        else:
            self.model_instance = target_model

        self.loaded_model = target_model
        return self.model_instance

    def transcribe(
        self,
        audio_path: str,
        duration: float,
        language: str = "auto",
        model_size: str = "base",
        caption_mode: str = "DYNAMIC",
        on_progress: Optional[Callable[[Dict[str, Any]], None]] = None
    ) -> Dict[str, Any]:
        """
        Executes multilingual transcription with word-level timestamps.
        """
        self.load_model(model_size)
        t0 = time.time()

        ffmpeg_info = get_ffmpeg_info()
        ffmpeg_path = ffmpeg_info["path"]

        # Adaptive chunk size (60s chunks)
        CHUNK_SIZE = 60.0
        if duration <= 75.0:
            chunk_ranges = [(0.0, duration)]
        else:
            chunk_ranges = []
            cur = 0.0
            while cur < duration:
                nxt = min(cur + CHUNK_SIZE, duration)
                chunk_ranges.append((cur, nxt))
                cur = nxt

        total_chunks = len(chunk_ranges)
        all_raw_words: List[Dict[str, Any]] = []
        whisper_detected_lang = language if language != "auto" else "en"

        temp_dir = os.path.join(os.path.dirname(audio_path), f"chunks_{int(time.time()*1000)}")
        os.makedirs(temp_dir, exist_ok=True)

        try:
            for idx, (c_start, c_end) in enumerate(chunk_ranges):
                c_dur = c_end - c_start
                chunk_wav = os.path.join(temp_dir, f"chunk_{idx:03d}.wav")

                if total_chunks > 1:
                    cmd = [
                        ffmpeg_path, "-y",
                        "-ss", f"{c_start:.3f}",
                        "-i", audio_path,
                        "-t", f"{c_dur:.3f}",
                        "-c:a", "pcm_s16le",
                        chunk_wav
                    ]
                    res = subprocess.run(cmd, capture_output=True, text=True)
                    chunk_target = chunk_wav if res.returncode == 0 and os.path.exists(chunk_wav) else audio_path
                else:
                    chunk_target = audio_path

                t_chunk_start = time.time()

                # Execute Whisper inference
                if self.backend == "mlx-whisper":
                    import mlx_whisper
                    kwargs = {
                        "path_or_hf_repo": self.loaded_model,
                        "word_timestamps": True,
                    }
                    if language and language not in ("auto", "hinglish"):
                        kwargs["language"] = language

                    result = mlx_whisper.transcribe(chunk_target, **kwargs)
                    chunk_segments = result.get("segments", [])
                    if result.get("language"):
                        whisper_detected_lang = result["language"]
                elif self.backend == "faster-whisper":
                    model_inst = self.model_instance
                    t_kwargs = {"word_timestamps": True}
                    if language and language not in ("auto", "hinglish"):
                        t_kwargs["language"] = language
                    segments_gen, info = model_inst.transcribe(chunk_target, **t_kwargs)
                    chunk_segments = []
                    for s in segments_gen:
                        chunk_segments.append({
                            "start": s.start,
                            "end": s.end,
                            "text": s.text,
                            "words": [{"word": w.word, "start": w.start, "end": w.end, "probability": w.probability} for w in (s.words or [])]
                        })
                    if info and info.language:
                        whisper_detected_lang = info.language
                else:
                    chunk_segments = []

                # Offset word timestamps by chunk start to guarantee ABSOLUTE timing
                offset = c_start if total_chunks > 1 else 0.0
                for seg in chunk_segments:
                    for w in seg.get("words", []):
                        w_text = str(w.get("word") or w.get("text") or "").strip()
                        w_start = float(w.get("start", 0.0)) + offset
                        w_end = float(w.get("end", w_start + 0.2)) + offset
                        w_prob = float(w.get("probability", w.get("confidence", 0.95)))
                        all_raw_words.append({
                            "text": w_text,
                            "start": w_start,
                            "end": w_end,
                            "confidence": w_prob
                        })

                if on_progress:
                    processed = min(c_end, duration)
                    on_progress({
                        "stage": "transcription",
                        "audioProcessed": processed,
                        "audioTotal": duration,
                        "progress": round((processed / max(1.0, duration)) * 100, 2),
                        "chunkIndex": idx + 1,
                        "chunkTotal": total_chunks,
                        "chunkElapsed": round(time.time() - t_chunk_start, 2)
                    })

                if os.path.exists(chunk_wav):
                    try:
                        os.remove(chunk_wav)
                    except Exception:
                        pass
        finally:
            if os.path.exists(temp_dir):
                import shutil
                shutil.rmtree(temp_dir, ignore_errors=True)

        # Post-Processing: Loop suppression, quality analysis, language detection, caption segmentation
        cleaned_words, quality_report = analyze_and_clean_word_stream(all_raw_words)
        full_text = " ".join([w["text"] for w in cleaned_words])
        lang_classification = classify_transcript_language(full_text, whisper_detected_lang)
        caption_beats = segment_into_beats(cleaned_words, mode=caption_mode)

        total_elapsed = time.time() - t0
        rt_factor = (duration / total_elapsed) if total_elapsed > 0 else 1.0

        return {
            "text": full_text,
            "duration": round(duration, 3),
            "elapsed": round(total_elapsed, 2),
            "realtimeFactor": round(rt_factor, 2),
            "backend": self.backend,
            "device": self.device,
            "model": self.loaded_model,
            "language": lang_classification["code"],
            "languageName": lang_classification["name"],
            "languageConfidence": lang_classification["confidence"],
            "isHinglish": lang_classification["code"] == "hinglish",
            "quality": quality_report,
            "words": cleaned_words,
            "beats": caption_beats,
            "segments": [
                {
                    "id": f"seg_{i+1}",
                    "start": b["start"],
                    "end": b["end"],
                    "text": b["text"],
                    "words": b["words"]
                }
                for i, b in enumerate(caption_beats)
            ]
        }
