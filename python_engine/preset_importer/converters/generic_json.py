"""
ViralClip Studio — JSON Caption Preset Converter
Parses JSON preset objects or preset packs into NormalizedCaptionPreset and ViralClipPresetDefinition.
"""

import os
import re
import json
from typing import List, Dict, Any

from python_engine.preset_importer.models import (
    NormalizedCaptionPreset,
    TypographyConfig,
    ColorsConfig,
    StrokeConfig,
    ShadowConfig,
    BackgroundConfig,
    TransformConfig,
    AnimationConfig,
    ConversionResult,
    ViralClipPresetDefinition,
    ViralClipCaptionConfig
)
from python_engine.preset_importer.exceptions import ParsingError

class GenericJsonAdapter:
    def __init__(self, json_path: str, source_category: str = "Imported", source_file_name: str = ""):
        self.json_path = json_path
        self.source_category = source_category
        self.source_file_name = source_file_name or os.path.basename(json_path)

    def convert(self) -> List[ConversionResult]:
        try:
            with open(self.json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            raise ParsingError(f"Failed to parse JSON preset: {str(e)}", details={"path": self.json_path})

        items: List[Dict[str, Any]] = data if isinstance(data, list) else [data]
        results: List[ConversionResult] = []

        for idx, item in enumerate(items):
            if not isinstance(item, dict):
                continue

            cfg = item.get("config", item)
            name = item.get("name", f"{os.path.splitext(self.source_file_name)[0]} {idx+1}")
            slug = re.sub(r'[^a-z0-9]+', '_', name.lower()).strip('_')
            preset_id = item.get("id") or f"json_{slug}_{idx+1}"

            font_family = cfg.get("fontFamily") or cfg.get("font_family") or "Montserrat, sans-serif"
            font_size = int(cfg.get("fontSize") or cfg.get("font_size") or 34)
            font_weight = cfg.get("fontWeight") or cfg.get("font_weight") or 800
            primary_color = cfg.get("primaryColor") or cfg.get("textColor") or "#FFFFFF"
            highlight_color = cfg.get("highlightColor") or "#FACC15"
            stroke_color = cfg.get("strokeColor") or "#000000"
            stroke_width = float(cfg.get("strokeWidth") or 4.0)
            has_shadow = bool(cfg.get("hasShadow", True))
            shadow_color = cfg.get("shadowColor") or "rgba(0,0,0,0.95)"
            shadow_blur = float(cfg.get("shadowBlur") or 8.0)
            bg_color = cfg.get("backgroundColor")
            bg_opacity = float(cfg.get("backgroundOpacity") or 0.0)
            bg_shape = cfg.get("backgroundShape") or "none"
            pos_y = float(cfg.get("positionY") or 72.0)
            animation_type = cfg.get("animationType") or "pop"
            animation_mode = cfg.get("animationMode") or "POP_WORD"
            active_word_scale = float(cfg.get("activeWordScale") or 1.08)
            uppercase = bool(cfg.get("uppercase", True))
            is_3d = bool(cfg.get("is3D", False))

            norm = NormalizedCaptionPreset(
                id=preset_id,
                name=name,
                slug=slug,
                category=self.source_category,
                source_type="generic_json",
                source_file_name=self.source_file_name,
                typography=TypographyConfig(
                    font_family=font_family,
                    font_weight=font_weight,
                    font_size=float(font_size),
                    uppercase=uppercase
                ),
                colors=ColorsConfig(primary_color=primary_color, highlight_color=highlight_color),
                stroke=StrokeConfig(enabled=True, color=stroke_color, width=stroke_width),
                shadow=ShadowConfig(enabled=has_shadow, color=shadow_color, blur=shadow_blur),
                background=BackgroundConfig(color=bg_color or "#000000", opacity=bg_opacity, shape=bg_shape),
                transform=TransformConfig(position_y=pos_y),
                animation=AnimationConfig(
                    animation_type=animation_type,
                    animation_mode=animation_mode,
                    active_word_scale=active_word_scale
                ),
                compatibility_status="FULL",
            )

            vc_config = ViralClipCaptionConfig(
                style=preset_id,
                preset=preset_id,
                fontFamily=font_family,
                fontSize=font_size,
                fontWeight=font_weight,
                primaryColor=primary_color,
                highlightColor=highlight_color,
                strokeColor=stroke_color,
                strokeWidth=stroke_width,
                hasShadow=has_shadow,
                shadowColor=shadow_color,
                shadowBlur=shadow_blur,
                backgroundColor=bg_color,
                backgroundOpacity=bg_opacity,
                backgroundShape=bg_shape,
                positionY=pos_y,
                animationType=animation_type,
                animationMode=animation_mode,
                activeWordScale=active_word_scale,
                uppercase=uppercase,
                is3D=is_3d
            )

            vc_preset = ViralClipPresetDefinition(
                id=preset_id,
                name=name,
                desc=item.get("desc", f"Imported from {self.source_file_name}"),
                category=self.source_category.lower(),
                config=vc_config
            )

            results.append(ConversionResult(
                preset=vc_preset,
                normalized=norm,
                status="FULL",
                source_file=self.source_file_name
            ))

        return results
