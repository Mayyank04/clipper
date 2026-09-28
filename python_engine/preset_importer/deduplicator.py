"""
ViralClip Studio — Preset Deduplicator
Calculates multi-signal fingerprints for presets (checksum, slug, normalized content hash)
to prevent duplicate records across multiple import runs.
"""

import json
import hashlib
from typing import Dict, Any, Optional

from python_engine.preset_importer.models import ViralClipPresetDefinition

class PresetDeduplicator:
    @staticmethod
    def compute_content_hash(preset: ViralClipPresetDefinition) -> str:
        """
        Computes a deterministic hash of the visual configuration
        (font, size, weight, colors, stroke, shadow, animation).
        """
        cfg = preset.config
        normalized_dict = {
            "fontFamily": cfg.fontFamily.split(",")[0].strip().lower(),
            "fontSize": cfg.fontSize,
            "fontWeight": str(cfg.fontWeight),
            "primaryColor": cfg.primaryColor.upper(),
            "highlightColor": cfg.highlightColor.upper(),
            "strokeColor": cfg.strokeColor.upper(),
            "strokeWidth": cfg.strokeWidth,
            "hasShadow": cfg.hasShadow,
            "animationType": cfg.animationType.lower(),
            "animationMode": cfg.animationMode.upper(),
            "uppercase": cfg.uppercase,
        }
        serialized = json.dumps(normalized_dict, sort_keys=True)
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    @staticmethod
    def is_duplicate(
        preset: ViralClipPresetDefinition,
        existing_presets: Dict[str, Any],
        source_file_checksum: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Checks if the preset already exists in the library.
        Returns the existing matching record or None.
        """
        content_hash = PresetDeduplicator.compute_content_hash(preset)
        slug = preset.id

        # 1. Match by exact ID/Slug
        if slug in existing_presets:
            return existing_presets[slug]

        # 2. Match by content hash + name
        for record in existing_presets.values():
            if record.get("contentHash") == content_hash and record.get("name", "").lower() == preset.name.lower():
                return record

            # 3. Match by sourceChecksum if provided
            if source_file_checksum and record.get("sourceChecksum") == source_file_checksum and record.get("name") == preset.name:
                return record

        return None
