"""
ViralClip Studio — Preset Analyzer
Inspects incoming files, identifies schema and structure, and delegates to the appropriate converter.
"""

import os
from typing import List

from python_engine.preset_importer.detector import detect_file_type
from python_engine.preset_importer.models import ConversionResult
from python_engine.preset_importer.converters.alight_motion import AlightMotionAdapter
from python_engine.preset_importer.converters.generic_xml import GenericXmlAdapter
from python_engine.preset_importer.converters.generic_json import GenericJsonAdapter
from python_engine.preset_importer.exceptions import FormatDetectionError

class PresetAnalyzer:
    @staticmethod
    def analyze_and_convert(
        file_path: str,
        category: str = "Imported",
        source_name: str = "",
        source_url: str = ""
    ) -> List[ConversionResult]:
        detected_type, sub_type, meta = detect_file_type(file_path)
        file_name = os.path.basename(file_path)

        if detected_type == "alight_motion_xml":
            adapter = AlightMotionAdapter(file_path, source_category=category, source_file_name=file_name)
            results = adapter.convert()
        elif detected_type == "generic_xml":
            adapter = GenericXmlAdapter(file_path, source_category=category, source_file_name=file_name)
            results = adapter.convert()
        elif detected_type == "generic_json":
            adapter = GenericJsonAdapter(file_path, source_category=category, source_file_name=file_name)
            results = adapter.convert()
        elif detected_type in ["font", "zip", "image", "video"]:
            # Non-preset resource
            return []
        else:
            raise FormatDetectionError(
                f"Unsupported preset format for {file_name}: detected={detected_type}",
                details={"file": file_name, "meta": meta}
            )

        # Attach source metadata to converted presets
        for r in results:
            if r.normalized:
                r.normalized.source_url = source_url
            if r.preset:
                if source_name:
                    r.preset.desc = f"Imported from {source_name} ({file_name})"

        return results
