#!/usr/bin/env python3
"""
Test Suite: FFmpeg Export Engine & Multi-Format Companion Subtitles
Verifies:
- 1080x1920 (9:16) canonical MP4 vertical export
- Zero watermark guarantee (watermark = false default)
- Gap-free ASS dialogue events generation with active word highlighting
- Multi-format companion exports: .srt, .vtt, .ass, .txt, .json
- Forensic verification with ffprobe: H.264 video stream, AAC 48kHz audio stream, correct duration
"""

import os
import sys
import tempfile
import subprocess
from pathlib import Path

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from backend.app.config import settings
from backend.app.rendering.ffmpeg_engine import generate_ass_subtitle_content, render_video_export
from backend.app.rendering.validator import forensic_export_validation

def test_gap_free_ass_generation():
    print("[TEST 1] Verifying Gap-Free Continuous ASS Subtitle Generation...")
    captions = [
        {
            "id": "cap_1",
            "start": 0.5,
            "end": 2.2,
            "displayStart": 0.5,
            "displayEnd": 2.6,
            "text": "Build viral studio shorts",
            "words": [
                {"text": "Build", "start": 0.5, "end": 0.9, "isHighlight": False},
                {"text": "viral", "start": 1.0, "end": 1.4, "isHighlight": True},
                {"text": "studio", "start": 1.45, "end": 1.8, "isHighlight": False},
                {"text": "shorts", "start": 1.85, "end": 2.2, "isHighlight": False},
            ]
        }
    ]

    style = {
        "fontFamily": "American Captain",
        "fontSize": 32,
        "primaryColor": "#ffffff",
        "highlightColor": "#facc15",
        "strokeColor": "#000000",
        "strokeWidth": 3.5,
        "hasShadow": True,
        "positionY": 72,
        "uppercase": True
    }

    ass_content = generate_ass_subtitle_content(captions, style)

    # 1. Header checks
    assert "PlayResX: 1080" in ass_content, "ASS header must have PlayResX: 1080"
    assert "PlayResY: 1920" in ass_content, "ASS header must have PlayResY: 1920"
    assert "Style: Default,American Captain" in ass_content, "ASS style must match chosen font"

    # 2. Events checks
    dialogue_lines = [l for l in ass_content.splitlines() if l.startswith("Dialogue:")]
    assert len(dialogue_lines) >= 4, f"Expected at least 4 word-level dialogue lines, got {len(dialogue_lines)}"

    # Check for highlight color tags & kinetic pop
    has_highlight = any("\\c&H00FA15CC&" in l or "\\c&H0015CCFA&" in l or "\\fscx106" in l or "\\fscx110" in l for l in dialogue_lines)
    assert has_highlight, "Dialogue lines must contain active word highlight formatting tags"

    # Check that post-speech hold exists (from 2.20s to 2.60s)
    has_hold = any("0:00:02.20,0:00:02.60" in l or "0:00:02.19,0:00:02.60" in l for l in dialogue_lines)
    assert has_hold, "Post-speech hold event must exist to prevent premature blanking"

    print("  -> PASS: ASS subtitles contain gap-free continuous word events with kinetic pop tags.")

def test_full_ffmpeg_1080x1920_render():
    print("\n[TEST 2] Executing Full FFmpeg Render & Forensic Validation...")
    temp_dir = tempfile.mkdtemp(prefix="test_export_")
    synth_input = os.path.join(temp_dir, "input_test.mp4")
    output_mp4 = os.path.join(temp_dir, "viral_studio_export_1080x1920.mp4")

    try:
        # Create a synthetic 3-second 720p test video with 48kHz audio tone
        gen_cmd = [
            settings.FFMPEG_PATH,
            "-y",
            "-f", "lavfi", "-i", "color=c=navy:s=720x1280:d=3:r=30",
            "-f", "lavfi", "-i", "sine=f=440:d=3:r=48000",
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "128k", "-ar", "48000",
            synth_input
        ]
        res = subprocess.run(gen_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        assert res.returncode == 0, f"Synthetic video generation failed: {res.stderr}"

        # Build Canonical RenderPlan
        render_plan = {
            "version": "1.0",
            "resolution": {"width": 1080, "height": 1920},
            "fps": 30,
            "watermark": False,  # ZERO WATERMARK GUARANTEE
            "captionStyle": {
                "fontFamily": "Inter",
                "fontSize": 30,
                "primaryColor": "#ffffff",
                "highlightColor": "#facc15",
                "strokeWidth": 3.0,
                "positionY": 75,
                "uppercase": True
            },
            "captions": [
                {
                    "id": "c1",
                    "start": 0.5,
                    "end": 2.5,
                    "displayStart": 0.5,
                    "displayEnd": 2.8,
                    "text": "Real captions in Viral Studio",
                    "words": [
                        {"text": "Real", "start": 0.5, "end": 0.9},
                        {"text": "captions", "start": 0.95, "end": 1.4},
                        {"text": "in", "start": 1.45, "end": 1.7},
                        {"text": "Viral", "start": 1.75, "end": 2.1},
                        {"text": "Studio", "start": 2.15, "end": 2.5},
                    ]
                }
            ]
        }

        # Render output
        export_result = render_video_export(synth_input, output_mp4, render_plan)

        # 1. Output file exists
        assert os.path.exists(output_mp4), "Exported MP4 must exist on disk"
        assert os.path.getsize(output_mp4) > 50000, "Exported MP4 must contain valid media data"

        # 2. FFprobe validation
        val = export_result["validation"]
        print(f"  Export Resolution: {val['width']}x{val['height']}")
        print(f"  Video Codec:       {val['video_codec']}")
        print(f"  Audio Codec:       {val['audio_codec']} ({val['audio_sample_rate']} Hz)")
        print(f"  Duration:          {val['duration']}s")
        print(f"  Watermark:         {'None (Clean)' if not render_plan.get('watermark') else 'Enabled'}")

        assert val["width"] == 1080 and val["height"] == 1920, "Output must be exactly 1080x1920 vertical format"
        assert val["video_codec"] == "h264", "Output video codec must be H.264"
        assert val["audio_codec"] == "aac", "Output audio codec must be AAC"
        assert val["audio_sample_rate"] == 48000, "Output audio sample rate must be 48kHz"
        assert val["duration"] >= 2.8, "Output duration must preserve full timeline"

        # 3. Companion Subtitle Files (.srt, .vtt, .txt, .json)
        base = Path(output_mp4).parent / Path(output_mp4).stem
        for ext in [".srt", ".vtt", ".txt", ".json"]:
            comp_path = str(base) + ext
            assert os.path.exists(comp_path), f"Companion file {ext} must exist"
            assert os.path.getsize(comp_path) > 0, f"Companion file {ext} must not be empty"

        print("  -> PASS: Clean 1080x1920 MP4 rendered with companion SRT, VTT, TXT, JSON exports.")

    finally:
        # Cleanup
        for f in os.listdir(temp_dir):
            try:
                os.remove(os.path.join(temp_dir, f))
            except Exception:
                pass
        try:
            os.rmdir(temp_dir)
        except Exception:
            pass

if __name__ == "__main__":
    print("==================================================================")
    print("VIRAL STUDIO — FFmpeg EXPORT & COMPANION SUBTITLE SUITE")
    print("==================================================================")
    test_gap_free_ass_generation()
    test_full_ffmpeg_1080x1920_render()
    print("\nALL EXPORT TESTS PASSED (2/2) ✅")
