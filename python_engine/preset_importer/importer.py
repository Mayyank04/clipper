"""
ViralClip Studio — Caption Preset Import Coordinator
Batch processing pipeline for discovering, converting, validating, and registering presets and fonts.
"""

import os
from typing import List, Dict, Any, Optional

from python_engine.preset_importer.detector import detect_file_type, calculate_checksum
from python_engine.preset_importer.fonts import register_font_file
from python_engine.preset_importer.analyzer import PresetAnalyzer
from python_engine.preset_importer.validator import PresetValidator
from python_engine.preset_importer.deduplicator import PresetDeduplicator
from python_engine.preset_importer.previews import PresetPreviewGenerator

class PresetBatchImporter:
    def __init__(
        self,
        public_fonts_dir: str = "public/assets/fonts",
        public_previews_dir: str = "public/assets/previews"
    ):
        self.public_fonts_dir = public_fonts_dir
        self.public_previews_dir = public_previews_dir
        os.makedirs(self.public_fonts_dir, exist_ok=True)
        os.makedirs(self.public_previews_dir, exist_ok=True)

    def process_files(
        self,
        file_paths: List[str],
        category: str = "Imported",
        source_id: Optional[str] = None,
        source_name: str = "",
        source_url: str = "",
        existing_presets: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        existing_map = existing_presets or {}
        registered_fonts = []
        imported_presets = []
        errors = []
        stats = {
            "total_files": len(file_paths),
            "processed": 0,
            "success": 0,
            "partial": 0,
            "failed": 0,
            "unsupported": 0,
            "fonts_registered": 0,
            "duplicates_skipped": 0,
        }

        # Step 1: Scan and register fonts first so font families are available
        for fpath in file_paths:
            if not os.path.exists(fpath):
                continue
            ext = os.path.splitext(fpath)[1].lower()
            if ext in [".ttf", ".otf", ".woff", ".woff2"]:
                try:
                    fmeta = register_font_file(fpath, self.public_fonts_dir)
                    registered_fonts.append(fmeta.model_dump())
                    stats["fonts_registered"] += 1
                except Exception as e:
                    errors.append({
                        "file": os.path.basename(fpath),
                        "stage": "FONT_REGISTRATION",
                        "errorCode": "ERR_FONT_PARSE",
                        "message": str(e),
                        "suggestedAction": "Ensure the font is a standard OpenType/TrueType binary."
                    })

        # Step 2: Convert presets
        for fpath in file_paths:
            stats["processed"] += 1
            fname = os.path.basename(fpath)
            if not os.path.exists(fpath):
                stats["failed"] += 1
                errors.append({
                    "file": fname,
                    "stage": "FILE_ACCESS",
                    "errorCode": "ERR_FILE_NOT_FOUND",
                    "message": "File does not exist or was removed during import",
                    "suggestedAction": "Verify storage and retry."
                })
                continue

            try:
                detected_type, sub_type, meta = detect_file_type(fpath)
            except Exception as e:
                stats["failed"] += 1
                errors.append({
                    "file": fname,
                    "stage": "DETECTION",
                    "errorCode": "ERR_SECURITY_OR_FORMAT",
                    "message": str(e),
                    "suggestedAction": "Ensure file is not malicious and adheres to XML/JSON specifications."
                })
                continue

            if detected_type in ["font", "zip", "image", "video"]:
                # Already handled or non-preset resource
                continue

            try:
                checksum = calculate_checksum(fpath)
                results = PresetAnalyzer.analyze_and_convert(
                    file_path=fpath,
                    category=category,
                    source_name=source_name,
                    source_url=source_url
                )

                if not results:
                    stats["unsupported"] += 1
                    errors.append({
                        "file": fname,
                        "stage": "ANALYSIS",
                        "errorCode": "ERR_NO_PRESETS_FOUND",
                        "message": f"No text preset elements found in {fname}",
                        "suggestedAction": "Ensure XML/JSON defines text layers or typography styles."
                    })
                    continue

                for r in results:
                    if not r.preset:
                        stats["failed"] += 1
                        continue

                    # Validate
                    valid, val_warnings = PresetValidator.validate(r.preset)
                    r.warnings.extend(val_warnings)

                    # Deduplication check
                    dup = PresetDeduplicator.is_duplicate(r.preset, existing_map, checksum)
                    if dup:
                        stats["duplicates_skipped"] += 1
                        continue

                    # Generate preview SVG
                    preview_svg = PresetPreviewGenerator.generate_svg_preview(r.preset, r.preset.name)
                    preview_file_name = f"preview_{r.preset.id}.svg"
                    preview_path = os.path.join(self.public_previews_dir, preview_file_name)
                    with open(preview_path, "w", encoding="utf-8") as pf:
                        pf.write(preview_svg)

                    preview_url = f"/assets/previews/{preview_file_name}"
                    content_hash = PresetDeduplicator.compute_content_hash(r.preset)

                    preset_record = {
                        "id": r.preset.id,
                        "name": r.preset.name,
                        "slug": r.preset.id,
                        "category": category,
                        "presetJson": r.preset.model_dump(),
                        "previewUrl": preview_url,
                        "sourceId": source_id,
                        "sourceFile": fname,
                        "sourceType": detected_type,
                        "sourceChecksum": checksum,
                        "is3D": r.preset.config.is3D,
                        "conversionStatus": r.status,
                        "conversionVersion": "1.0.0",
                        "unsupportedReasons": r.unsupported_reasons,
                        "contentHash": content_hash,
                        "metadata": {
                            "warnings": r.warnings,
                            "sourceUrl": source_url,
                        }
                    }

                    imported_presets.append(preset_record)
                    existing_map[r.preset.id] = preset_record

                    if r.status == "FULL":
                        stats["success"] += 1
                    else:
                        stats["partial"] += 1

            except Exception as e:
                stats["failed"] += 1
                errors.append({
                    "file": fname,
                    "stage": "CONVERSION",
                    "errorCode": "ERR_PRESET_CONVERT",
                    "message": str(e),
                    "suggestedAction": "Inspect preset file structure or try importing as a single file."
                })

        return {
            "stats": stats,
            "presets": imported_presets,
            "fonts": registered_fonts,
            "errors": errors,
        }
