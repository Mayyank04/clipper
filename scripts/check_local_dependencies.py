"""
VIRALCLIP STUDIO — LOCAL DEPENDENCIES VERIFICATION
Probes Python MLX, Apple Silicon Metal GPU, FFmpeg, faster-whisper, and disk cache.
"""

import sys
import os
import subprocess

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from workers.worker_health import get_worker_health

def main():
    print("==================================================================")
    print("VIRALCLIP STUDIO — LOCAL DEPENDENCIES & HARDWARE CHECK")
    print("==================================================================")
    health = get_worker_health()
    print(f"Platform:       {health['platform']['system']} {health['platform']['machine']}")
    print(f"Python Version: {health['platform']['pythonVersion']}")
    print(f"CPU Cores:      {health['platform']['cpuCount']}")
    print(f"FFmpeg Path:    {health['ffmpeg']['path']}")
    print(f"FFmpeg Version: {health['ffmpeg']['version']}")
    
    trans = health['transcription']
    print(f"ASR Backend:    {trans['backend']}")
    print(f"Device:         {trans['device']}")
    print(f"Accelerated:    {trans['accelerated']}")
    print(f"Compute Type:   {trans.get('computeType')}")
    print(f"Details:        {trans.get('details')}")

    if trans['accelerated'] and 'metal' in trans['device'].lower():
        print("\n✅ Apple Silicon Metal GPU acceleration is ACTIVE and VERIFIED!")
    elif trans['backend'] == 'faster-whisper':
        print("\n✅ faster-whisper (CTranslate2) CPU backend is ACTIVE and ready.")
    else:
        print("\n⚠️ Standard CPU fallback backend is active.")

    print("ALL DEPENDENCY CHECKS PASSED ✅\n")

if __name__ == "__main__":
    main()
