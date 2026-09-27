from pydantic import BaseModel, Field
from typing import Optional, List

class TranscriptWord(BaseModel):
    text: str
    start: float = Field(ge=0.0)
    end: float = Field(gt=0.0)
    confidence: float = Field(default=0.95, ge=0.0, le=1.0)
    speechStart: Optional[float] = None
    speechEnd: Optional[float] = None

class TranscriptSegment(BaseModel):
    id: str
    start: float = Field(ge=0.0)
    end: float = Field(gt=0.0)
    text: str
    words: List[TranscriptWord]
    speaker: Optional[str] = None
    language: Optional[str] = None
    displayStart: Optional[float] = None
    displayEnd: Optional[float] = None

class TranscriptionOptions(BaseModel):
    language: Optional[str] = "auto"
    model: Optional[str] = "base"
    preset: Optional[str] = "balanced"  # fast, balanced, quality, max
    vocabulary: Optional[str] = None
    apply_correction: bool = True
    transliterate_hinglish: bool = False
    remove_fillers: bool = False
    filter_music_tokens: bool = True

class TranscriptionRequest(BaseModel):
    media_id: Optional[str] = None
    media_url: Optional[str] = None
    file_path: Optional[str] = None
    options: Optional[TranscriptionOptions] = Field(default_factory=TranscriptionOptions)

class TranscriptResult(BaseModel):
    id: str
    duration: float
    language: str
    detected_language: str
    language_probability: float
    text: str
    words: List[TranscriptWord]
    segments: List[TranscriptSegment]
    is_hinglish: bool = False
    romanized_text: Optional[str] = None
    quality_score: Optional[int] = 100
    quality_metrics: Optional[dict] = None

