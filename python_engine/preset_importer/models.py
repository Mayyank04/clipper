"""
ViralClip Studio — Caption Preset Importer Data Models
Pydantic schemas for normalized intermediate representations and conversion targets.
"""

from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field

class TypographyConfig(BaseModel):
    font_family: str = "Montserrat, sans-serif"
    font_weight: Union[int, str] = 800
    font_style: str = "normal"  # normal, italic
    font_size: float = 34.0
    line_height: float = 1.2
    letter_spacing: float = 0.0
    text_align: str = "center"  # left, center, right
    uppercase: bool = True
    words_per_line: int = 3
    words_per_group: int = 3
    max_lines: int = 2

class ColorsConfig(BaseModel):
    primary_color: str = "#FFFFFF"
    highlight_color: str = "#FACC15"
    secondary_color: Optional[str] = None
    gradient_colors: Optional[List[str]] = None

class StrokeConfig(BaseModel):
    enabled: bool = True
    color: str = "#000000"
    width: float = 4.0
    opacity: float = 1.0

class ShadowConfig(BaseModel):
    enabled: bool = True
    color: str = "rgba(0, 0, 0, 0.95)"
    blur: float = 8.0
    offset_x: float = 0.0
    offset_y: float = 3.0
    opacity: float = 0.95

class BackgroundConfig(BaseModel):
    enabled: bool = False
    color: str = "#000000"
    opacity: float = 0.0
    shape: str = "none"  # none, box, rounded, pill
    padding_x: float = 12.0
    padding_y: float = 6.0
    border_radius: float = 8.0

class TransformConfig(BaseModel):
    position_x: float = 50.0  # percentage from left (0..100)
    position_y: float = 72.0  # percentage from top (0..100)
    scale_x: float = 1.0
    scale_y: float = 1.0
    rotation: float = 0.0
    anchor_x: float = 0.5
    anchor_y: float = 0.5

class AnimationConfig(BaseModel):
    animation_type: str = "pop"  # pop, bounce, typewriter, wave, fade, slide, kinetic, none
    animation_mode: str = "POP_WORD"
    active_word_scale: float = 1.08
    entry_animation: str = "scale"
    exit_animation: str = "fade"
    duration_frames: int = 60
    fps: int = 60
    keyframes: List[Dict[str, Any]] = Field(default_factory=list)
    easing: str = "ease-out"

class EffectsConfig(BaseModel):
    glow_enabled: bool = False
    glow_color: Optional[str] = None
    glow_radius: float = 0.0
    blur: float = 0.0
    three_d_enabled: bool = False
    three_d_depth: float = 0.0
    unsupported_effects: List[str] = Field(default_factory=list)

class NormalizedCaptionPreset(BaseModel):
    """Intermediate Normalized Representation (Phase 8 & 10)"""
    id: str
    name: str
    slug: str
    category: str = "Imported"
    source_type: str = "google_drive"
    source_file_id: Optional[str] = None
    source_file_name: Optional[str] = None
    source_url: Optional[str] = None
    source_checksum: Optional[str] = None
    typography: TypographyConfig = Field(default_factory=TypographyConfig)
    colors: ColorsConfig = Field(default_factory=ColorsConfig)
    stroke: StrokeConfig = Field(default_factory=StrokeConfig)
    shadow: ShadowConfig = Field(default_factory=ShadowConfig)
    background: BackgroundConfig = Field(default_factory=BackgroundConfig)
    transform: TransformConfig = Field(default_factory=TransformConfig)
    animation: AnimationConfig = Field(default_factory=AnimationConfig)
    effects: EffectsConfig = Field(default_factory=EffectsConfig)
    raw_properties: Dict[str, Any] = Field(default_factory=dict)
    compatibility_status: str = "FULL"  # FULL, PARTIAL, UNSUPPORTED
    unsupported_reasons: List[str] = Field(default_factory=list)

class ViralClipCaptionConfig(BaseModel):
    """Matches ViralClip CaptionCustomization in TypeScript / CaptionStyle in render_plan.py"""
    style: str
    preset: str
    fontFamily: str
    fontSize: int = 34
    fontWeight: Union[int, str] = 800
    primaryColor: str = "#FFFFFF"
    highlightColor: str = "#FACC15"
    strokeColor: str = "#000000"
    strokeWidth: float = 4.0
    hasShadow: bool = True
    shadowColor: str = "rgba(0,0,0,0.95)"
    shadowBlur: float = 8.0
    backgroundColor: Optional[str] = None
    backgroundOpacity: float = 0.0
    backgroundShape: str = "none"
    positionY: float = 72.0
    wordsPerLine: int = 3
    wordsPerGroup: int = 3
    maxLines: int = 2
    alignment: str = "center"
    animationType: str = "pop"
    animationMode: str = "POP_WORD"
    activeWordScale: float = 1.08
    letterSpacing: float = 0.0
    lineHeight: float = 1.2
    uppercase: bool = True
    is3D: bool = False

class ViralClipPresetDefinition(BaseModel):
    """Direct equivalent of TypeScript CaptionStyleDefinition"""
    id: str
    name: str
    desc: str
    category: str = "imported"
    config: ViralClipCaptionConfig

class FontMetadata(BaseModel):
    family: str
    subfamily: str = "Regular"
    weight: int = 400
    style: str = "normal"
    format: str = "ttf"  # ttf, otf, woff, woff2
    file_path: Optional[str] = None
    checksum: str
    postscript_name: Optional[str] = None
    full_name: Optional[str] = None
    version: Optional[str] = None

class ConversionResult(BaseModel):
    preset: Optional[ViralClipPresetDefinition] = None
    normalized: Optional[NormalizedCaptionPreset] = None
    status: str = "FULL"  # FULL, PARTIAL, UNSUPPORTED
    unsupported_reasons: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    source_file: str = ""
    error: Optional[str] = None
