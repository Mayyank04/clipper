"""
ViralClip Studio — File Format Detector & Security Guard
Detects file types (Alight Motion XML, generic XML, JSON, Fonts, ZIPs) with strict security bounds.
"""

import os
import re
import json
import hashlib
from typing import Tuple, Dict, Any

from python_engine.preset_importer.exceptions import SecurityValidationError

MAX_XML_BYTES = 50 * 1024 * 1024  # 50 MB
MAX_JSON_BYTES = 25 * 1024 * 1024  # 25 MB
MAX_FONT_BYTES = 30 * 1024 * 1024  # 30 MB
MAX_ZIP_BYTES = 200 * 1024 * 1024  # 200 MB

SUSPICIOUS_XML_PATTERNS = [
    re.compile(r'<!ENTITY', re.IGNORECASE),
    re.compile(r'<!DOCTYPE[^>]*\[', re.IGNORECASE),
    re.compile(r'SYSTEM\s+["\'](file|http|https|ftp|gopher):', re.IGNORECASE),
]

def calculate_checksum(file_path: str) -> str:
    """Computes SHA-256 checksum of a file."""
    sha = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            sha.update(chunk)
    return sha.hexdigest()

def detect_file_type(file_path: str) -> Tuple[str, str, Dict[str, Any]]:
    """
    Analyzes a file path and returns:
    (detected_type, format_sub_type, metadata_dict)
    
    detected_type: 'alight_motion_xml' | 'generic_xml' | 'generic_json' | 'font' | 'zip' | 'image' | 'video' | 'unknown'
    """
    if not os.path.exists(file_path):
        return ("unknown", "missing_file", {"error": "File does not exist"})

    size = os.path.getsize(file_path)
    ext = os.path.splitext(file_path)[1].lower()
    meta: Dict[str, Any] = {"size": size, "extension": ext}

    # 1. Fonts by header / magic numbers & extensions
    if ext in [".ttf", ".otf", ".woff", ".woff2"]:
        if size > MAX_FONT_BYTES:
            raise SecurityValidationError(f"Font file exceeds maximum allowed size ({size} > {MAX_FONT_BYTES} bytes)")
        
        with open(file_path, "rb") as f:
            header = f.read(4)
        
        # TrueType / OpenType signatures:
        # 0x00010000 or 'true' -> TTF
        # 'OTTO' -> OTF / CFF
        # 'wOFF' -> WOFF
        # 'wOF2' -> WOFF2
        if header in [b'\x00\x01\x00\x00', b'true']:
            return ("font", "ttf", meta)
        elif header == b'OTTO':
            return ("font", "otf", meta)
        elif header == b'wOFF':
            return ("font", "woff", meta)
        elif header == b'wOF2':
            return ("font", "woff2", meta)
        elif ext in [".ttf", ".otf"]:
            return ("font", ext.lstrip("."), meta)

    # 2. ZIP archives
    if ext in [".zip", ".amproject", ".ampreset"]:
        if size > MAX_ZIP_BYTES:
            raise SecurityValidationError(f"Archive exceeds maximum size ({size} > {MAX_ZIP_BYTES} bytes)")
        with open(file_path, "rb") as f:
            magic = f.read(4)
        if magic.startswith(b'PK'):
            return ("zip", "zip_archive", meta)

    # 3. XML files
    if ext == ".xml":
        if size > MAX_XML_BYTES:
            raise SecurityValidationError(f"XML file exceeds maximum size ({size} > {MAX_XML_BYTES} bytes)")
        
        # Read initial snippet to inspect safely
        with open(file_path, "rb") as f:
            sample = f.read(min(size, 65536)).decode("utf-8", errors="ignore")
        
        for pat in SUSPICIOUS_XML_PATTERNS:
            if pat.search(sample):
                raise SecurityValidationError("Potential XML Entity Expansion (XXE) pattern detected")
        
        # Check Alight Motion signatures
        is_alight = (
            "alightmotion.com" in sample or
            "amver=" in sample or
            "com.alightcreative" in sample or
            ("<scene" in sample and ("<text" in sample or "<embedScene" in sample))
        )
        if is_alight:
            return ("alight_motion_xml", "alight_motion", meta)
        else:
            return ("generic_xml", "xml", meta)

    # 4. JSON files
    if ext == ".json":
        if size > MAX_JSON_BYTES:
            raise SecurityValidationError(f"JSON file exceeds maximum size ({size} > {MAX_JSON_BYTES} bytes)")
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            meta["is_list"] = isinstance(data, list)
            if isinstance(data, dict) and ("config" in data or "style" in data or "fontFamily" in data):
                return ("generic_json", "viralclip_preset", meta)
            return ("generic_json", "json", meta)
        except Exception:
            return ("unknown", "corrupt_json", meta)

    # 5. Images / Videos
    if ext in [".png", ".jpg", ".jpeg", ".webp", ".svg"]:
        return ("image", ext.lstrip("."), meta)
    if ext in [".mp4", ".mov", ".webm"]:
        return ("video", ext.lstrip("."), meta)

    # Fallback: check content for text XML
    try:
        with open(file_path, "rb") as f:
            start_bytes = f.read(512)
        if b"<?xml" in start_bytes or b"<scene" in start_bytes:
            sample = start_bytes.decode("utf-8", errors="ignore")
            if "alight" in sample or "amver" in sample:
                return ("alight_motion_xml", "alight_motion", meta)
            return ("generic_xml", "xml", meta)
    except Exception:
        pass

    return ("unknown", "unrecognized", meta)
