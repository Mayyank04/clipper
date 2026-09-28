"""
ViralClip Studio — Generic XML Caption Preset Converter
Parses general XML files (e.g. subtitle styles, typography presets) into NormalizedCaptionPreset models.
"""

import os
import re
import xml.etree.ElementTree as ET
from typing import List

from python_engine.preset_importer.models import (
    NormalizedCaptionPreset,
    TypographyConfig,
    ColorsConfig,
    StrokeConfig,
    ShadowConfig,
    TransformConfig,
    AnimationConfig,
    EffectsConfig,
    ConversionResult,
    ViralClipPresetDefinition,
    ViralClipCaptionConfig
)
from python_engine.preset_importer.exceptions import ParsingError

class GenericXmlAdapter:
    def __init__(self, xml_path: str, source_category: str = "Imported", source_file_name: str = ""):
        self.xml_path = xml_path
        self.source_category = source_category
        self.source_file_name = source_file_name or os.path.basename(xml_path)

    def convert(self) -> List[ConversionResult]:
        try:
            tree = ET.parse(self.xml_path)
            root = tree.getroot()
        except Exception as e:
            raise ParsingError(f"Failed to parse XML: {str(e)}", details={"path": self.xml_path})

        base_name = os.path.splitext(self.source_file_name)[0].replace("_", " ").title()
        slug = re.sub(r'[^a-z0-9]+', '_', base_name.lower()).strip('_')
        preset_id = f"xml_{slug}"

        # Search for common font and style tags
        font_family = "Montserrat, sans-serif"
        font_size = 34
        font_weight = 800
        primary_color = "#FFFFFF"
        highlight_color = "#FACC15"
        stroke_color = "#000000"
        stroke_width = 4.0
        position_y = 72.0
        animation_type = "pop"

        for elem in root.iter():
            tag = elem.tag.lower()
            text = (elem.text or "").strip()
            if "font" in tag and text:
                font_family = f"{text}, Montserrat, sans-serif"
            elif "size" in tag and text:
                try:
                    font_size = max(24, min(48, int(float(text))))
                except ValueError:
                    pass
            elif "color" in tag and text.startswith("#"):
                primary_color = text
            elif "highlight" in tag and text.startswith("#"):
                highlight_color = text
            elif "stroke" in tag and text:
                try:
                    stroke_width = float(text)
                except ValueError:
                    if text.startswith("#"):
                        stroke_color = text
            elif "anim" in tag and text:
                animation_type = text.lower() if text.lower() in ["pop", "bounce", "typewriter", "fade"] else "pop"

        norm = NormalizedCaptionPreset(
            id=preset_id,
            name=base_name,
            slug=slug,
            category=self.source_category,
            source_type="generic_xml",
            source_file_name=self.source_file_name,
            typography=TypographyConfig(
                font_family=font_family,
                font_weight=font_weight,
                font_size=float(font_size),
            ),
            colors=ColorsConfig(primary_color=primary_color, highlight_color=highlight_color),
            stroke=StrokeConfig(enabled=True, color=stroke_color, width=stroke_width),
            shadow=ShadowConfig(enabled=True),
            transform=TransformConfig(position_y=position_y),
            animation=AnimationConfig(animation_type=animation_type),
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
            positionY=position_y,
            animationType=animation_type,
        )

        vc_preset = ViralClipPresetDefinition(
            id=preset_id,
            name=base_name,
            desc=f"Imported from {self.source_file_name}",
            category=self.source_category.lower(),
            config=vc_config,
        )

        return [ConversionResult(
            preset=vc_preset,
            normalized=norm,
            status="FULL",
            source_file=self.source_file_name,
        )]
