"""
VIRALCLIP STUDIO — CANONICAL RENDER PLAN SCHEMA
Single source of truth for preview and FFmpeg export parity.
"""

from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field

class WordTiming(BaseModel):
    text: str
    start: float
    end: float
    confidence: float = 0.95

class CaptionStyle(BaseModel):
    id: Optional[str] = "viral_pop"
    name: Optional[str] = "Viral Pop"
    fontFamily: str = "Arial, sans-serif"
    fontWeight: Union[int, str] = 800
    fontSize: int = 34
    textColor: str = "#ffffff"
    highlightColor: str = "#facc15"
    strokeColor: str = "#000000"
    strokeWidth: float = 4.0
    hasShadow: bool = True
    shadowColor: str = "rgba(0, 0, 0, 0.95)"
    shadowBlur: float = 8.0
    backgroundColor: Optional[str] = None
    backgroundOpacity: float = 0.0
    positionY: float = 75.0
    alignment: str = "center"
    lineHeight: float = 1.2
    letterSpacing: float = 0.0
    wordsPerBeat: int = 3
    animationType: str = "pop"
    activeWordAnimation: str = "pop"
    activeWordScale: float = 1.08
    entryAnimation: str = "scale"
    exitAnimation: str = "fade"
    emphasisBehavior: str = "highlight"
    safeZone: Dict[str, float] = Field(default_factory=lambda: {"top": 10.0, "bottom": 20.0, "left": 8.0, "right": 8.0})

class CaptionSegment(BaseModel):
    id: str
    start: float
    end: float
    text: str
    words: List[WordTiming] = Field(default_factory=list)
    style: Optional[CaptionStyle] = None

class BRollSegment(BaseModel):
    id: str
    start: float
    end: float
    keyword: str
    assetPath: str
    placement: str = "fullscreen"  # fullscreen, pip, side, cutaway, overlay
    opacity: float = 1.0
    scale: float = 1.0
    x: float = 0.0
    y: float = 0.0
    transition: str = "cut"  # cut, fade, crossfade, slide, zoom
    transitionDuration: float = 0.25

class SFXSegment(BaseModel):
    id: str
    start: float
    duration: float
    name: str
    audioPath: str
    volume: float = 0.8
    fadeIn: float = 0.0
    fadeOut: float = 0.05

class VFXSegment(BaseModel):
    id: str
    start: float
    end: float
    type: str  # zoom_punch, shake, glow, flash, motion_blur, glitch, particles, rgb_split, speed_ramp, vignette
    intensity: float = 5.0
    params: Dict[str, Any] = Field(default_factory=dict)

class SourceMedia(BaseModel):
    path: str
    originalPath: Optional[str] = None
    proxyPath: Optional[str] = None
    duration: float
    width: int = 1920
    height: int = 1080
    fps: float = 30.0
    rotation: int = 0
    hasAudio: bool = True
    audioCodec: Optional[str] = "aac"
    videoCodec: Optional[str] = "h264"

class CanvasConfig(BaseModel):
    width: int = 1080
    height: int = 1920
    aspectRatio: str = "9:16"
    fps: int = 30

class ExportSettings(BaseModel):
    outputPath: str
    resolution: str = "1080x1920"
    videoCodec: str = "libx264"
    audioCodec: str = "aac"
    audioBitrate: str = "192k"
    audioSampleRate: int = 48000
    crf: int = 18
    preset: str = "medium"
    pixelFormat: str = "yuv420p"
    faststart: bool = True
    watermark: bool = False

class RenderPlan(BaseModel):
    projectId: str
    shortId: Optional[str] = None
    title: Optional[str] = "Viral Clip Short"
    duration: float
    startTime: float = 0.0
    endTime: float = 0.0
    source: SourceMedia
    canvas: CanvasConfig = Field(default_factory=CanvasConfig)
    cropMode: str = "center"  # auto, center, top, custom
    captions: List[CaptionSegment] = Field(default_factory=list)
    captionStyle: Optional[CaptionStyle] = None
    broll: List[BRollSegment] = Field(default_factory=list)
    sfx: List[SFXSegment] = Field(default_factory=list)
    vfx: List[VFXSegment] = Field(default_factory=list)
    export: Optional[ExportSettings] = None
