"""
ViralClip Studio — Preset Validator
Enforces strict schema constraints, bounding boxes, safe color ranges, and canvas parity.
"""

import re
from typing import List, Tuple
from python_engine.preset_importer.models import ViralClipPresetDefinition, NormalizedCaptionPreset

COLOR_HEX_PATTERN = re.compile(r'^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$')
COLOR_RGBA_PATTERN = re.compile(r'^rgba?\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+')

def is_valid_color(val: str) -> bool:
    if not val or not isinstance(val, str):
        return False
    val = val.strip()
    return bool(COLOR_HEX_PATTERN.match(val) or COLOR_RGBA_PATTERN.match(val))

class PresetValidator:
    @staticmethod
    def validate(preset: ViralClipPresetDefinition) -> Tuple[bool, List[str]]:
        warnings: List[str] = []
        cfg = preset.config

        # 1. Font Size
        if cfg.fontSize < 16 or cfg.fontSize > 72:
            warnings.append(f"Clamped font size from {cfg.fontSize} to safe range (16..72)")
            cfg.fontSize = max(16, min(72, cfg.fontSize))

        # 2. Position Y
        if cfg.positionY < 5.0 or cfg.positionY > 95.0:
            warnings.append(f"Adjusted positionY from {cfg.positionY} to safe viewport bounds (5..95)")
            cfg.positionY = max(10.0, min(90.0, cfg.positionY))

        # 3. Colors
        if not is_valid_color(cfg.primaryColor):
            warnings.append(f"Invalid primaryColor '{cfg.primaryColor}', fallback to #FFFFFF")
            cfg.primaryColor = "#FFFFFF"

        if not is_valid_color(cfg.highlightColor):
            warnings.append(f"Invalid highlightColor '{cfg.highlightColor}', fallback to #FACC15")
            cfg.highlightColor = "#FACC15"

        if not is_valid_color(cfg.strokeColor):
            warnings.append(f"Invalid strokeColor '{cfg.strokeColor}', fallback to #000000")
            cfg.strokeColor = "#000000"

        # 4. Stroke width
        if cfg.strokeWidth < 0 or cfg.strokeWidth > 20:
            cfg.strokeWidth = max(0.0, min(12.0, cfg.strokeWidth))

        # 5. Font family
        if not cfg.fontFamily or not cfg.fontFamily.strip():
            cfg.fontFamily = "Montserrat, sans-serif"
            warnings.append("Missing font family, fallback to Montserrat")

        # 6. Animation type
        valid_anims = {"pop", "bounce", "typewriter", "wave", "fade", "slide", "kinetic", "none"}
        if cfg.animationType.lower() not in valid_anims:
            warnings.append(f"Unknown animation type '{cfg.animationType}', defaulted to 'pop'")
            cfg.animationType = "pop"

        return (True, warnings)
