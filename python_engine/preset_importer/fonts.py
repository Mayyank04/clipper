"""
ViralClip Studio — Centralized Font Registry & Inspector
Pure-Python SFNT OpenType / TrueType table parser extracting font metadata without external dependencies.
"""

import os
import shutil
import struct
import hashlib
from typing import Optional, Dict, Any, List

from python_engine.preset_importer.models import FontMetadata

class FontInspector:
    """
    Pure-Python parser for SFNT-based fonts (.ttf, .otf).
    Reads the 'name' table (table 6) and 'OS/2' table for family, style, and weight.
    """

    @staticmethod
    def parse_font_file(file_path: str) -> FontMetadata:
        checksum = FontInspector.calculate_sha256(file_path)
        ext = os.path.splitext(file_path)[1].lower().lstrip(".")
        
        with open(file_path, "rb") as f:
            data = f.read()

        metadata = {
            "family": os.path.splitext(os.path.basename(file_path))[0],
            "subfamily": "Regular",
            "weight": 400,
            "style": "normal",
            "format": ext,
            "file_path": file_path,
            "checksum": checksum,
            "postscript_name": None,
            "full_name": None,
            "version": None,
        }

        try:
            parsed = FontInspector._parse_sfnt(data)
            metadata.update(parsed)
        except Exception:
            # If internal SFNT table parsing has quirks, fallback to cleaned filename family
            pass

        return FontMetadata(**metadata)

    @staticmethod
    def calculate_sha256(file_path: str) -> str:
        sha = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                sha.update(chunk)
        return sha.hexdigest()

    @staticmethod
    def _parse_sfnt(data: bytes) -> Dict[str, Any]:
        if len(data) < 12:
            return {}

        num_tables = struct.unpack(">H", data[4:6])[0]
        tables = {}
        offset = 12

        for _ in range(num_tables):
            if offset + 16 > len(data):
                break
            tag = data[offset:offset+4].decode("latin1", errors="ignore")
            t_offset = struct.unpack(">I", data[offset+8:offset+12])[0]
            t_length = struct.unpack(">I", data[offset+12:offset+16])[0]
            tables[tag] = (t_offset, t_length)
            offset += 16

        result = {}

        # 1. Parse 'name' table
        if "name" in tables:
            t_offset, t_length = tables["name"]
            names = FontInspector._parse_name_table(data[t_offset:t_offset+t_length])
            if 1 in names and names[1]:  # Font Family
                result["family"] = names[1]
            if 2 in names and names[2]:  # Font Subfamily
                result["subfamily"] = names[2]
            if 4 in names and names[4]:  # Full Name
                result["full_name"] = names[4]
            if 5 in names and names[5]:  # Version
                result["version"] = names[5]
            if 6 in names and names[6]:  # Postscript name
                result["postscript_name"] = names[6]

        # 2. Parse 'OS/2' table for usWeightClass
        if "OS/2" in tables:
            t_offset, t_length = tables["OS/2"]
            os2_data = data[t_offset:t_offset+t_length]
            if len(os2_data) >= 6:
                usWeightClass = struct.unpack(">H", os2_data[4:6])[0]
                if 100 <= usWeightClass <= 1000:
                    result["weight"] = usWeightClass

        # Infer style from subfamily
        sub = result.get("subfamily", "").lower()
        if "italic" in sub or "oblique" in sub:
            result["style"] = "italic"
        else:
            result["style"] = "normal"

        # If weight class was default 400, refine by subfamily keywords
        if result.get("weight", 400) == 400:
            if "black" in sub or "heavy" in sub:
                result["weight"] = 900
            elif "extra bold" in sub or "extrabold" in sub:
                result["weight"] = 800
            elif "bold" in sub:
                result["weight"] = 700
            elif "semi bold" in sub or "semibold" in sub or "medium" in sub:
                result["weight"] = 600
            elif "light" in sub:
                result["weight"] = 300
            elif "thin" in sub:
                result["weight"] = 200

        return result

    @staticmethod
    def _parse_name_table(data: bytes) -> Dict[int, str]:
        if len(data) < 6:
            return {}

        count = struct.unpack(">H", data[2:4])[0]
        string_offset = struct.unpack(">H", data[4:6])[0]
        names = {}

        for i in range(count):
            rec_offset = 6 + i * 12
            if rec_offset + 12 > len(data):
                break
            platform_id, encoding_id, language_id, name_id, length, offset = struct.unpack(
                ">HHHHHH", data[rec_offset:rec_offset+12]
            )

            str_start = string_offset + offset
            str_end = str_start + length
            if str_end <= len(data):
                raw_bytes = data[str_start:str_end]
                decoded_str = ""
                # Platform 0 (Unicode) or Platform 3 (Windows) usually UTF-16BE
                if platform_id in (0, 3):
                    try:
                        decoded_str = raw_bytes.decode("utf-16-be").strip("\x00")
                    except Exception:
                        decoded_str = raw_bytes.decode("latin1", errors="ignore").strip("\x00")
                elif platform_id == 1:  # Mac OS Roman
                    try:
                        decoded_str = raw_bytes.decode("mac_roman", errors="ignore").strip("\x00")
                    except Exception:
                        decoded_str = raw_bytes.decode("latin1", errors="ignore").strip("\x00")
                else:
                    decoded_str = raw_bytes.decode("latin1", errors="ignore").strip("\x00")

                if decoded_str and name_id not in names:
                    names[name_id] = decoded_str

        return names

def register_font_file(source_font_path: str, public_fonts_dir: str) -> FontMetadata:
    """
    Parses font metadata, copies font to public fonts directory using safe checksum-based filename,
    and returns canonical FontMetadata.
    """
    os.makedirs(public_fonts_dir, exist_ok=True)
    meta = FontInspector.parse_font_file(source_font_path)

    # Safe destination filename: <sanitized_family>_<checksum[:8]>.<ext>
    safe_family = "".join(c for c in meta.family if c.isalnum() or c in ("-", "_")).lower()
    dest_name = f"{safe_family}_{meta.checksum[:8]}.{meta.format}"
    dest_path = os.path.join(public_fonts_dir, dest_name)

    if not os.path.exists(dest_path):
        shutil.copy2(source_font_path, dest_path)

    meta.file_path = f"/assets/fonts/{dest_name}"
    return meta
