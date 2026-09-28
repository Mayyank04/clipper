"""
ViralClip Studio — Caption Preset Importer CLI Entrypoint
Provides command-line subcommands for scanning, converting, and font registration.
"""

import sys
import os
import json
import argparse
from typing import List

# Ensure parent directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from python_engine.preset_importer.detector import detect_file_type, calculate_checksum
from python_engine.preset_importer.fonts import FontInspector, register_font_file
from python_engine.preset_importer.importer import PresetBatchImporter

def cmd_scan(args):
    target_path = args.path
    if not os.path.exists(target_path):
        print(json.dumps({"error": f"Path not found: {target_path}"}))
        sys.exit(1)

    file_paths: List[str] = []
    if os.path.isfile(target_path):
        file_paths.append(target_path)
    else:
        for root_dir, _, filenames in os.walk(target_path):
            for fn in sorted(filenames):
                if not fn.startswith("."):
                    file_paths.append(os.path.join(root_dir, fn))

    items = []
    categories: dict = {
        "XML": 0,
        "JSON": 0,
        "Fonts": 0,
        "ZIP": 0,
        "Images": 0,
        "Videos": 0,
        "Unknown": 0,
    }
    supported = 0
    partial = 0
    unsupported = 0

    for fp in file_paths:
        try:
            detected_type, sub_type, meta = detect_file_type(fp)
            fn = os.path.basename(fp)
            size = meta.get("size", os.path.getsize(fp))
            ext = meta.get("extension", os.path.splitext(fp)[1])

            compat = "SUPPORTED"
            details = f"Detected {sub_type}"

            if detected_type in ["alight_motion_xml", "generic_xml"]:
                categories["XML"] += 1
                supported += 1
            elif detected_type == "generic_json":
                categories["JSON"] += 1
                supported += 1
            elif detected_type == "font":
                categories["Fonts"] += 1
                supported += 1
            elif detected_type == "zip":
                categories["ZIP"] += 1
                compat = "PARTIAL"
                partial += 1
                details = "Archive (will be extracted during import)"
            elif detected_type == "image":
                categories["Images"] += 1
                compat = "SUPPORTED"
                details = "Preview asset"
            elif detected_type == "video":
                categories["Videos"] += 1
                compat = "PARTIAL"
                partial += 1
                details = "Reference video asset"
            else:
                categories["Unknown"] += 1
                compat = "UNSUPPORTED"
                unsupported += 1
                details = "Unrecognized format"

            items.append({
                "id": calculate_checksum(fp)[:12],
                "name": fn,
                "path": fp,
                "mimeType": f"application/{detected_type}",
                "sizeBytes": size,
                "extension": ext,
                "detectedType": detected_type,
                "compatibility": compat,
                "details": details,
            })
        except Exception as e:
            categories["Unknown"] += 1
            unsupported += 1
            items.append({
                "id": "err",
                "name": os.path.basename(fp),
                "path": fp,
                "mimeType": "application/octet-stream",
                "sizeBytes": 0,
                "extension": os.path.splitext(fp)[1],
                "detectedType": "unknown",
                "compatibility": "UNSUPPORTED",
                "details": str(e),
            })

    report = {
        "totalFiles": len(file_paths),
        "categories": categories,
        "supportedCount": supported,
        "partiallySupportedCount": partial,
        "unsupportedCount": unsupported,
        "items": items,
    }
    print(json.dumps(report, indent=2))

def cmd_convert(args):
    # args.manifest: JSON file containing list of file paths to import
    if args.manifest:
        with open(args.manifest, "r", encoding="utf-8") as f:
            data = json.load(f)
            files = data.get("files", [])
            category = data.get("category", args.category or "Imported")
            source_id = data.get("sourceId", args.source_id)
            source_name = data.get("sourceName", args.source_name or "")
            source_url = data.get("sourceUrl", args.source_url or "")
            existing_presets = data.get("existingPresets", {})
    else:
        files = args.files or []
        category = args.category or "Imported"
        source_id = args.source_id
        source_name = args.source_name or ""
        source_url = args.source_url or ""
        existing_presets = {}

    importer = PresetBatchImporter(
        public_fonts_dir=args.fonts_dir or "public/assets/fonts",
        public_previews_dir=args.previews_dir or "public/assets/previews"
    )

    result = importer.process_files(
        file_paths=files,
        category=category,
        source_id=source_id,
        source_name=source_name,
        source_url=source_url,
        existing_presets=existing_presets
    )

    print(json.dumps(result, indent=2))

def cmd_font(args):
    meta = FontInspector.parse_font_file(args.font)
    print(json.dumps(meta.model_dump(), indent=2))

def main():
    parser = argparse.ArgumentParser(description="ViralClip Studio Caption Preset Importer")
    subparsers = parser.add_subparsers(dest="command")

    # scan
    p_scan = subparsers.add_parser("scan")
    p_scan.add_argument("--path", required=True, help="Directory or file path to scan")

    # convert
    p_conv = subparsers.add_parser("convert")
    p_conv.add_argument("--manifest", help="JSON manifest with files, category, source info")
    p_conv.add_argument("--files", nargs="*", help="Direct list of files")
    p_conv.add_argument("--category", default="Imported")
    p_conv.add_argument("--source-id")
    p_conv.add_argument("--source-name", default="")
    p_conv.add_argument("--source-url", default="")
    p_conv.add_argument("--fonts-dir", default="public/assets/fonts")
    p_conv.add_argument("--previews-dir", default="public/assets/previews")

    # font
    p_font = subparsers.add_parser("font")
    p_font.add_argument("--font", required=True, help="Font file path")

    args = parser.parse_args()

    if args.command == "scan":
        cmd_scan(args)
    elif args.command == "convert":
        cmd_convert(args)
    elif args.command == "font":
        cmd_font(args)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
