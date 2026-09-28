"""
VIRALCLIP STUDIO — PROCEDURAL SFX GENERATION ENGINE
Generates genuine, high-fidelity 16-bit PCM 44.1kHz audio files for all 37 SFX categories.
Pure standard library (wave, math, struct, random) with zero external dependencies.
"""

import os
import wave
import math
import struct
import random

SAMPLE_RATE = 44100

def write_wav(file_path: str, samples: list, sample_rate: int = SAMPLE_RATE):
    """Writes a 16-bit mono PCM WAV file."""
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with wave.open(file_path, 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        packed = bytearray()
        for s in samples:
            clamped = max(-1.0, min(1.0, s))
            int_val = int(clamped * 32767.0)
            packed.extend(struct.pack('<h', int_val))
        wav.writeframes(packed)

def generate_whoosh(duration: float = 0.5, speed: float = 1.0) -> list:
    num_samples = int(duration * SAMPLE_RATE)
    samples = []
    peak_t = duration * 0.45
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        # Envelope: Gaussian bell
        dist = (t - peak_t) / (duration * 0.25)
        env = math.exp(-0.5 * dist * dist)
        # Swept noise + low sine
        noise = (random.random() * 2.0 - 1.0)
        freq = 250 + math.sin((t / duration) * math.pi) * 1600 * speed
        sine = math.sin(2 * math.pi * freq * t)
        s = (noise * 0.7 + sine * 0.3) * env * 0.85
        samples.append(s)
    return samples

def generate_impact(duration: float = 1.2, intensity: float = 1.0) -> list:
    num_samples = int(duration * SAMPLE_RATE)
    samples = []
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        # Pitch drop from 180Hz to 35Hz
        freq = 35 + 145 * math.exp(-t * 12)
        phase = 2 * math.pi * freq * t
        sine = math.sin(phase)
        sub = math.sin(2 * math.pi * 42 * t)
        env = math.exp(-t * 3.8)
        # Initial transient punch
        punch = math.sin(2 * math.pi * 950 * t) * math.exp(-t * 90) if t < 0.05 else 0.0
        s = (sine * 0.6 + sub * 0.35 + punch * 0.4) * env * min(1.0, intensity)
        samples.append(s)
    return samples

def generate_riser(duration: float = 1.5, end_freq: float = 850.0) -> list:
    num_samples = int(duration * SAMPLE_RATE)
    samples = []
    start_freq = 60.0
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        prog = t / duration
        freq = start_freq * math.pow(end_freq / start_freq, prog)
        phase = 2 * math.pi * freq * t
        sine = math.sin(phase)
        saw = 2.0 * (phase / (2 * math.pi) - math.floor(phase / (2 * math.pi) + 0.5))
        env = math.pow(prog, 1.4)
        s = (sine * 0.7 + saw * 0.3) * env * 0.8
        samples.append(s)
    return samples

def generate_pop(duration: float = 0.15) -> list:
    num_samples = int(duration * SAMPLE_RATE)
    samples = []
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        # Quick swept tone with decay
        freq = 300 + 1200 * math.exp(-t * 50)
        sine = math.sin(2 * math.pi * freq * t)
        env = math.exp(-t * 35)
        samples.append(sine * env * 0.9)
    return samples

def generate_click(duration: float = 0.08) -> list:
    num_samples = int(duration * SAMPLE_RATE)
    samples = []
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        freq = 2400 * math.exp(-t * 120)
        noise = (random.random() * 2.0 - 1.0) * math.exp(-t * 150)
        sine = math.sin(2 * math.pi * freq * t) * math.exp(-t * 80)
        samples.append((sine * 0.5 + noise * 0.5) * 0.75)
    return samples

def generate_chime(duration: float = 1.6, base_freq: float = 587.33) -> list: # D5
    num_samples = int(duration * SAMPLE_RATE)
    samples = []
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        b1 = math.sin(2 * math.pi * base_freq * t) * math.exp(-t * 2.5)
        b2 = math.sin(2 * math.pi * base_freq * 2.0 * t) * 0.4 * math.exp(-t * 3.5)
        b3 = math.sin(2 * math.pi * base_freq * 3.01 * t) * 0.2 * math.exp(-t * 4.5)
        samples.append((b1 + b2 + b3) * 0.8)
    return samples

def generate_glitch(duration: float = 0.35) -> list:
    num_samples = int(duration * SAMPLE_RATE)
    samples = []
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        hop = int(t * 24)
        freq = ((hop * 379) % 1800) + 250
        square = 0.7 if math.sin(2 * math.pi * freq * t) > 0 else -0.7
        env = math.exp(-t * 3.0)
        samples.append(square * env * 0.7)
    return samples

def generate_heartbeat(duration: float = 0.9) -> list:
    num_samples = int(duration * SAMPLE_RATE)
    samples = []
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        # Two thumps: at t=0.0 and t=0.25
        thump1 = math.sin(2 * math.pi * 55 * t) * math.exp(-t * 16) if t < 0.2 else 0.0
        t2 = t - 0.25
        thump2 = math.sin(2 * math.pi * 48 * t2) * math.exp(-t2 * 14) * 0.85 if t2 >= 0 and t2 < 0.25 else 0.0
        samples.append((thump1 + thump2) * 0.95)
    return samples

def generate_record_scratch(duration: float = 0.45) -> list:
    num_samples = int(duration * SAMPLE_RATE)
    samples = []
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        # Pitch warble down then up
        freq = 300 + 400 * math.sin(t * 15 * math.pi)
        noise = (random.random() * 2.0 - 1.0)
        carrier = math.sin(2 * math.pi * freq * t)
        env = math.sin((t / duration) * math.pi)
        samples.append((carrier * 0.4 + noise * 0.6) * env * 0.85)
    return samples

GENERATOR_DISPATCH = {
    "whoosh": generate_whoosh,
    "swoosh": generate_whoosh,
    "transition": generate_whoosh,
    "air": generate_whoosh,
    "impact": generate_impact,
    "hit": lambda: generate_impact(0.8, 0.9),
    "boom": lambda: generate_impact(1.8, 1.2),
    "drop": lambda: generate_impact(1.0, 0.85),
    "bass": lambda: generate_impact(1.4, 1.0),
    "sub_drop": lambda: generate_impact(1.6, 1.1),
    "riser": generate_riser,
    "tension": generate_riser,
    "dramatic": generate_riser,
    "pop": generate_pop,
    "click": generate_click,
    "ui": generate_click,
    "typewriter": lambda: generate_click(0.06),
    "mouse": lambda: generate_click(0.05),
    "keyboard": lambda: generate_click(0.07),
    "camera": lambda: generate_click(0.12),
    "chime": generate_chime,
    "notification": lambda: generate_chime(1.0, 784.0), # G5
    "success": lambda: generate_chime(1.4, 659.25), # E5
    "glitch": generate_glitch,
    "digital": generate_glitch,
    "heartbeat": generate_heartbeat,
    "record_scratch": generate_record_scratch,
    "meme": generate_record_scratch,
    "comedy": generate_pop,
    "sports": lambda: generate_impact(0.7, 0.95),
    "gaming": lambda: generate_chime(0.8, 880.0), # A5
    "cinematic": lambda: generate_impact(2.0, 1.0),
    "failure": lambda: generate_riser(0.8, 110.0), # Pitch down
    "alert": lambda: generate_chime(0.6, 987.77), # B5
    "laugh": lambda: generate_pop(0.3),
    "reaction": lambda: generate_record_scratch(0.35),
    "foley": lambda: generate_click(0.1)
}

def ensure_sfx_asset(asset_id: str, category: str, target_dir: str) -> str:
    """Ensures a genuine WAV audio file exists on disk, synthesizing procedurally if needed."""
    filename = f"{asset_id}.wav"
    out_path = os.path.join(target_dir, filename)
    if os.path.exists(out_path) and os.path.getsize(out_path) > 100:
        return out_path

    cat_key = category.lower().strip()
    gen_func = GENERATOR_DISPATCH.get(cat_key, generate_pop)
    samples = gen_func()
    write_wav(out_path, samples)
    return out_path
