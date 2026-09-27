"""
VIRALCLIP STUDIO — UNIFIED PYTHON MEDIA ENGINE ENTRYPOINT
"""

import sys
import os
import json
import argparse

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from python_engine.transcription.whisper_engine import MultilingualWhisperEngine
from python_engine.audio.processor import preprocess_audio_16k
from python_engine.video.compositor import render_plan_to_mp4
from python_engine.video.quality import probe_video_metadata
from python_engine.broll.analyzer import analyze_broll_opportunities
from workers.worker_health import get_worker_health

def main():
    parser = argparse.ArgumentParser(description="ViralClip Studio Python Engine")
    subparsers = parser.add_subparsers(dest="command")

    # Health
    subparsers.add_parser("health")

    # Transcribe
    t_parser = subparsers.add_parser("transcribe")
    t_parser.add_argument("--media", required=True, help="Source audio/video path")
    t_parser.add_argument("--duration", type=float, default=30.0)
    t_parser.add_argument("--language", default="auto")
    t_parser.add_argument("--model", default="base")
    t_parser.add_argument("--mode", default="DYNAMIC")

    # Render
    r_parser = subparsers.add_parser("render")
    r_parser.add_argument("--plan", required=True, help="Path to RenderPlan JSON file")
    r_parser.add_argument("--output", required=True, help="Output MP4 file path")

    # B-roll
    b_parser = subparsers.add_parser("broll")
    b_parser.add_argument("--transcript", required=True, help="Path to transcript JSON file")

    args = parser.parse_args()

    if args.command == "health":
        print(json.dumps(get_worker_health(), indent=2))
    elif args.command == "transcribe":
        wav_path, dur = preprocess_audio_16k(args.media)
        engine = MultilingualWhisperEngine.get_instance()
        res = engine.transcribe(
            audio_path=wav_path,
            duration=dur or args.duration,
            language=args.language,
            model_size=args.model,
            caption_mode=args.mode
        )
        print(json.dumps(res, indent=2))
    elif args.command == "render":
        with open(args.plan, "r", encoding="utf-8") as f:
            plan = json.load(f)
        result = render_plan_to_mp4(plan, args.output)
        print(json.dumps(result, indent=2))
    elif args.command == "broll":
        with open(args.transcript, "r", encoding="utf-8") as f:
            tdata = json.load(f)
        segments = tdata.get("segments", [])
        broll = analyze_broll_opportunities(segments)
        print(json.dumps(broll, indent=2))
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
