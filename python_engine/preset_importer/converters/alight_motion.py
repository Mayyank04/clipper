"""
ViralClip Studio — Alight Motion XML Converter
Parses Alight Motion XML projects and extracts kinetic text presets into NormalizedCaptionPreset models.
"""

import os
import re
import urllib.parse
import xml.etree.ElementTree as ET
from typing import List, Dict, Any, Tuple, Optional

from python_engine.preset_importer.models import (
    NormalizedCaptionPreset,
    TypographyConfig,
    ColorsConfig,
    StrokeConfig,
    ShadowConfig,
    BackgroundConfig,
    TransformConfig,
    AnimationConfig,
    EffectsConfig,
    ConversionResult,
    ViralClipPresetDefinition,
    ViralClipCaptionConfig
)
from python_engine.preset_importer.exceptions import ParsingError

SUPPORTED_EFFECTS = {
    "com.alightcreative.effects.textspacing",
    "com.alightcreative.effects.texttransform",
    "com.alightcreative.effects.deepglow",
    "com.alightcreative.effects.deepglow2",
    "com.alightcreative.effects.glow",
    "com.alightcreative.effects.shadow",
    "com.alightcreative.effects.stroke",
}

def parse_am_color(raw_val: Optional[str]) -> Tuple[str, float]:
    """
    Parses Alight Motion color string (typically #AARRGGBB or #RRGGBB).
    Returns (hex_or_rgba, opacity_float).
    """
    if not raw_val:
        return ("#FFFFFF", 1.0)
    raw = raw_val.strip().lstrip("#")
    if len(raw) == 8:
        # ARGB
        a = int(raw[0:2], 16) / 255.0
        r = int(raw[2:4], 16)
        g = int(raw[4:6], 16)
        b = int(raw[6:8], 16)
        if a >= 0.99:
            return (f"#{r:02x}{g:02x}{b:02x}".upper(), 1.0)
        return (f"rgba({r}, {g}, {b}, {a:.2f})", round(a, 2))
    elif len(raw) == 6:
        return (f"#{raw}".upper(), 1.0)
    return ("#FFFFFF", 1.0)

def parse_font_descriptor(font_attr: Optional[str]) -> Tuple[str, int, str]:
    """
    Parses font attribute such as:
    - imported?name=rail-medium.ttf
    - googlefonts?name=Roboto&weight=700&italic=0
    - BebasNeue-Bold
    Returns: (font_family, weight, style)
    """
    if not font_attr:
        return ("Montserrat, sans-serif", 800, "normal")

    font_family = font_attr
    weight = 800
    style = "normal"

    if font_attr.startswith("imported?"):
        parsed = urllib.parse.urlparse(font_attr)
        qs = urllib.parse.parse_qs(parsed.query)
        name = qs.get("name", [""])[0]
        # Clean extension and dashes
        base = os.path.splitext(name)[0]
        # Replace hyphens/underscores with spaces and capitalize
        words = re.split(r'[-_]', base)
        font_family = " ".join(w.capitalize() for w in words if w)
    elif font_attr.startswith("googlefonts?"):
        parsed = urllib.parse.urlparse(font_attr)
        qs = urllib.parse.parse_qs(parsed.query)
        font_family = qs.get("name", ["Roboto"])[0]
        if "weight" in qs:
            try:
                weight = int(qs["weight"][0])
            except ValueError:
                pass
        if qs.get("italic", ["0"])[0] == "1":
            style = "italic"
    else:
        base = os.path.splitext(font_attr)[0]
        font_family = re.sub(r'[-_]', ' ', base).title()

    # Check for weight keywords in family name
    low_fam = font_family.lower()
    if "black" in low_fam or "heavy" in low_fam:
        weight = 900
    elif "extra bold" in low_fam or "extrabold" in low_fam:
        weight = 800
    elif "bold" in low_fam:
        weight = 700
    elif "medium" in low_fam:
        weight = 600

    # Fallback cascade
    full_family = f"{font_family}, Montserrat, sans-serif"
    return (full_family, weight, style)

class AlightMotionAdapter:
    """Parses an Alight Motion XML file into normalized presets."""

    def __init__(self, xml_path: str, source_category: str = "Imported", source_file_name: str = ""):
        self.xml_path = xml_path
        self.source_category = source_category
        self.source_file_name = source_file_name or os.path.basename(xml_path)

    def convert(self) -> List[ConversionResult]:
        try:
            tree = ET.parse(self.xml_path)
            root = tree.getroot()
        except Exception as e:
            raise ParsingError(f"Failed to parse Alight Motion XML: {str(e)}", details={"path": self.xml_path})

        if root.tag != "scene":
            raise ParsingError("Invalid Alight Motion root: expected <scene>", details={"root_tag": root.tag})

        scene_title = root.attrib.get("title", os.path.splitext(self.source_file_name)[0])
        scene_w = float(root.attrib.get("width", "1080"))
        scene_h = float(root.attrib.get("height", "1920"))
        fps = int(float(root.attrib.get("fps", "60")))

        # Map parents to trace group hierarchies
        parent_map = {c: p for p in root.iter() for c in p}

        # Find all <text> elements
        texts = root.findall(".//text")
        if not texts:
            # Fallback: check if embedScene layers have titles
            return []

        results: List[ConversionResult] = []

        # Group texts by embedScene or standalone text element
        processed_elements = set()

        for idx, text_el in enumerate(texts):
            if text_el in processed_elements:
                continue

            # Determine enclosing group label
            group_label = None
            curr = text_el
            while curr in parent_map:
                curr = parent_map[curr]
                if curr.tag == "embedScene":
                    group_label = curr.attrib.get("label") or curr.attrib.get("title")
                    if group_label:
                        break

            preset_name = f"{scene_title} - {group_label}" if group_label else f"{scene_title} Style {idx+1}"
            slug = re.sub(r'[^a-z0-9]+', '_', preset_name.lower()).strip('_')
            preset_id = f"am_{slug}_{idx+1}"

            # Extract typography
            font_attr = text_el.attrib.get("font")
            font_family, font_weight, font_style = parse_font_descriptor(font_attr)
            raw_size = float(text_el.attrib.get("size", "18.0"))
            # Alight Motion points scaled to 1080x1920 canvas
            font_size = max(24, min(48, int(raw_size * 1.8)))

            # Colors & Fills
            primary_color = "#FFFFFF"
            highlight_color = "#FACC15"
            stroke_color = "#000000"
            stroke_width = 4.0
            stroke_enabled = True
            shadow_color = "rgba(0,0,0,0.95)"
            shadow_blur = 8.0
            shadow_enabled = True

            fill_el = text_el.find("fillColor") or text_el.find("color")
            if fill_el is not None:
                c_val, _ = parse_am_color(fill_el.attrib.get("value"))
                if c_val != "#000000" and c_val != "rgba(0, 0, 0, 0.00)":
                    primary_color = c_val

            stroke_el = text_el.find("strokeColor")
            if stroke_el is not None:
                s_val, _ = parse_am_color(stroke_el.attrib.get("value"))
                stroke_color = s_val
                stroke_enabled = True

            # Transform & Positioning
            pos_x = 50.0
            pos_y = 72.0
            tf = text_el.find("transform")
            scale_ratio = 1.0
            has_scale_anim = False
            active_word_scale = 1.08

            if tf is not None:
                loc = tf.find("location")
                if loc is not None:
                    loc_val = loc.attrib.get("value", "")
                    coords = [float(p) for p in loc_val.split(",") if p.strip()]
                    if len(coords) >= 2:
                        pos_x = round((coords[0] / scene_w) * 100.0, 1)
                        pos_y = round((coords[1] / scene_h) * 100.0, 1)

                scale_el = tf.find("scale")
                if scale_el is not None:
                    kfs = scale_el.findall("kf")
                    if kfs and len(kfs) >= 2:
                        has_scale_anim = True
                        try:
                            v1 = float(kfs[0].attrib.get("v", "1").split(",")[0])
                            v2 = float(kfs[1].attrib.get("v", "1").split(",")[0])
                            active_word_scale = round(max(v1, v2) / max(0.01, min(v1, v2)), 2)
                            active_word_scale = max(1.05, min(1.25, active_word_scale))
                        except Exception:
                            pass

            # Effects & Animations
            effects = text_el.findall("effect")
            unsupported_reasons: List[str] = []
            letter_spacing = 0.0
            line_height = 1.2
            animation_type = "pop" if has_scale_anim else "bounce"
            animation_mode = "POP_WORD"
            is_3d = False

            for eff in effects:
                eff_id = eff.attrib.get("id", "")
                if eff_id == "com.alightcreative.effects.textspacing":
                    for prop in eff.findall("property"):
                        p_name = prop.attrib.get("name")
                        p_val = prop.attrib.get("value", "0")
                        if p_name == "letterSpacing":
                            try:
                                letter_spacing = round(float(p_val) * 10.0, 1)
                            except ValueError:
                                pass
                        elif p_name == "lineSpacing":
                            try:
                                line_height = round(1.2 + float(p_val) * 0.1, 2)
                            except ValueError:
                                pass
                elif eff_id == "com.alightcreative.effects.texttransform":
                    animation_mode = "POP_WORD"
                    for prop in eff.findall("property"):
                        if prop.attrib.get("name") == "color":
                            hl_color, _ = parse_am_color(prop.attrib.get("value"))
                            if hl_color != "#FFFFFF":
                                highlight_color = hl_color
                elif "glow" in eff_id.lower():
                    for prop in eff.findall("property"):
                        if prop.attrib.get("name") in ["colblend", "color"]:
                            hl_color, _ = parse_am_color(prop.attrib.get("value"))
                            highlight_color = hl_color
                elif "3d" in eff_id.lower() or "cube" in eff_id.lower():
                    is_3d = True
                    unsupported_reasons.append(f"Advanced 3D layer effect ({eff_id}) mapped to high-depth shadow")
                elif eff_id not in SUPPORTED_EFFECTS:
                    clean_eff_name = eff_id.split(".")[-1]
                    unsupported_reasons.append(f"Proprietary Alight Motion effect '{clean_eff_name}' not supported")

            status = "FULL"
            if unsupported_reasons:
                status = "PARTIAL"

            # Create Normalized representation
            norm = NormalizedCaptionPreset(
                id=preset_id,
                name=preset_name,
                slug=slug,
                category=self.source_category,
                source_type="alight_motion_xml",
                source_file_name=self.source_file_name,
                typography=TypographyConfig(
                    font_family=font_family,
                    font_weight=font_weight,
                    font_style=font_style,
                    font_size=float(font_size),
                    line_height=line_height,
                    letter_spacing=letter_spacing,
                ),
                colors=ColorsConfig(
                    primary_color=primary_color,
                    highlight_color=highlight_color
                ),
                stroke=StrokeConfig(
                    enabled=stroke_enabled,
                    color=stroke_color,
                    width=stroke_width
                ),
                shadow=ShadowConfig(
                    enabled=shadow_enabled,
                    color=shadow_color,
                    blur=shadow_blur
                ),
                transform=TransformConfig(
                    position_x=pos_x,
                    position_y=pos_y,
                    scale_x=scale_ratio,
                    scale_y=scale_ratio
                ),
                animation=AnimationConfig(
                    animation_type=animation_type,
                    animation_mode=animation_mode,
                    active_word_scale=active_word_scale
                ),
                effects=EffectsConfig(
                    three_d_enabled=is_3d,
                    unsupported_effects=[r for r in unsupported_reasons]
                ),
                compatibility_status=status,
                unsupported_reasons=unsupported_reasons
            )

            # Create native ViralClip Preset Definition
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
                hasShadow=shadow_enabled,
                shadowColor=shadow_color,
                shadowBlur=shadow_blur,
                positionY=pos_y,
                alignment="center",
                animationType=animation_type,
                animationMode=animation_mode,
                activeWordScale=active_word_scale,
                letterSpacing=letter_spacing,
                lineHeight=line_height,
                uppercase=True,
                is3D=is_3d
            )

            vc_preset = ViralClipPresetDefinition(
                id=preset_id,
                name=preset_name,
                desc=f"Imported from {self.source_file_name} ({'Fully Compatible' if status == 'FULL' else 'Partially Converted'})",
                category=self.source_category.lower(),
                config=vc_config
            )

            results.append(ConversionResult(
                preset=vc_preset,
                normalized=norm,
                status=status,
                unsupported_reasons=unsupported_reasons,
                source_file=self.source_file_name
            ))
            processed_elements.add(text_el)

        return results
