"""
Test faster-whisper transcription service end-to-end
"""

import os
import sys
import tempfile
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from backend.app.config import settings
from backend.app.transcription.whisper_service import whisper_service
from backend.app.schemas.transcription import TranscriptionOptions

def test_whisper_run():
    print("\n--- Testing faster-whisper transcription pipeline ---")
    with tempfile.TemporaryDirectory() as tmp_dir:
        test_audio_path = os.path.join(tmp_dir, "speech_sample.wav")
        
        # Generate 3 seconds of synthetic speech-range audio with tonal markers
        cmd = [
            settings.FFMPEG_PATH,
            "-y",
            "-f", "lavfi",
            "-i", "sine=frequency=220:duration=1.5",
            "-f", "lavfi",
            "-i", "sine=frequency=440:duration=1.5",
            "-filter_complex", "[0:a][1:a]concat=n=2:v=0:a=1",
            "-ar", "16000",
            "-ac", "1",
            test_audio_path
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        assert res.returncode == 0, f"FFmpeg failed: {res.stderr}"

        print("Audio sample created. Transcribing with faster-whisper tiny/base...")
        opts = TranscriptionOptions(model="tiny", language="en")
        result = whisper_service.transcribe(test_audio_path, opts)

        print(f"Transcription complete! Duration: {result.duration}s, Detected Language: {result.detected_language}")
        assert result.duration >= 2.8, "Duration detected correctly"
        assert result.id.startswith("trn_"), "Transcript ID correctly generated"
        print("✓ faster-whisper transcription service test passed!\n")

if __name__ == "__main__":
    test_whisper_run()
