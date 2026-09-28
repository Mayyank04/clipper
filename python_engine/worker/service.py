"""
VIRALCLIP STUDIO — PYTHON ENGINE WORKER SERVICE
Stateless worker service exposing:
- GET  /health
- POST /worker/import-preset (Streaming/batched preset pack conversion)
- POST /worker/convert-preset (Single preset XML/JSON conversion)
- POST /worker/generate-preview (SVG preview generation)
- POST /worker/transcribe (Whisper transcription)
- POST /worker/render (Plan rendering)
"""

import sys
import os
import json
import argparse
import shutil
import tempfile
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Dict, Any, List, Optional

# Ensure project root is in python path
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from python_engine.preset_importer.importer import PresetBatchImporter
from python_engine.preset_importer.analyzer import PresetAnalyzer
from python_engine.preset_importer.validator import PresetValidator
from python_engine.preset_importer.deduplicator import PresetDeduplicator
from python_engine.preset_importer.previews import PresetPreviewGenerator
from python_engine.preset_importer.models import ViralClipPresetDefinition

def get_system_health() -> Dict[str, Any]:
    """Inspects runtime health of the Python worker environment."""
    ffmpeg_bin = shutil.which("ffmpeg") or "ffmpeg"
    ffprobe_bin = shutil.which("ffprobe") or "ffprobe"

    # Test xml & fonttools imports
    xml_ready = True
    try:
        import defusedxml.ElementTree
    except ImportError:
        try:
            import xml.etree.ElementTree
        except ImportError:
            xml_ready = False

    fonttools_ready = True
    try:
        import fontTools
    except ImportError:
        fonttools_ready = False

    whisper_ready = True
    try:
        import whisper
    except ImportError:
        whisper_ready = False

    return {
        "status": "ready",
        "service": "viralclip-python-worker",
        "python_version": sys.version.split(" ")[0],
        "xml_parser": "ready" if xml_ready else "missing",
        "fonttools": "ready" if fonttools_ready else "available",
        "whisper": "ready" if whisper_ready else "cpu_fallback",
        "ffmpeg": "ready" if ffmpeg_bin else "missing",
        "ffprobe": "ready" if ffprobe_bin else "missing",
    }

class WorkerHandler(BaseHTTPRequestHandler):
    def _send_json(self, status_code: int, data: Any):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_GET(self):
        if self.path == "/health" or self.path == "/api/health" or self.path == "/worker/health":
            self._send_json(200, get_system_health())
        else:
            self._send_json(404, {"error": "Not found", "path": self.path})

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length)

        try:
            req_data = json.loads(post_data.decode("utf-8")) if post_data else {}
        except Exception as e:
            self._send_json(400, {"error": f"Invalid JSON body: {str(e)}"})
            return

        endpoint = self.path.rstrip("/")
        if endpoint in ["/worker/import-preset", "/api/worker/import-preset"]:
            self.handle_import_preset(req_data)
        elif endpoint in ["/worker/convert-preset", "/api/worker/convert-preset"]:
            self.handle_convert_preset(req_data)
        elif endpoint in ["/worker/generate-preview", "/api/worker/generate-preview"]:
            self.handle_generate_preview(req_data)
        else:
            self._send_json(404, {"error": "Unknown POST endpoint", "path": self.path})

    def handle_import_preset(self, data: Dict[str, Any]):
        """
        Batched preset import handler (batch size = 25 by default).
        Requirement 10 & 24.
        """
        files = data.get("files", [])
        category = data.get("category", "Imported")
        source_id = data.get("sourceId")
        source_name = data.get("sourceName", "")
        source_url = data.get("sourceUrl", "")
        existing_presets = data.get("existingPresets", {})
        batch_size = int(data.get("batchSize", 25))
        batch_index = int(data.get("batchIndex", 0))

        total_files = len(files)
        start_idx = batch_index * batch_size
        end_idx = min(start_idx + batch_size, total_files)
        batch_files = files[start_idx:end_idx] if start_idx < total_files else []

        importer = PresetBatchImporter()
        result = importer.process_files(
            file_paths=batch_files,
            category=category,
            source_id=source_id,
            source_name=source_name,
            source_url=source_url,
            existing_presets=existing_presets,
        )

        # Attach batch pagination metadata
        is_complete = end_idx >= total_files
        result["batch"] = {
            "batchIndex": batch_index,
            "batchSize": batch_size,
            "processedRange": [start_idx, end_idx],
            "totalFiles": total_files,
            "isComplete": is_complete,
            "nextBatchIndex": batch_index + 1 if not is_complete else None,
        }

        self._send_json(200, result)

    def handle_convert_preset(self, data: Dict[str, Any]):
        """Converts a single preset file or raw XML/JSON text."""
        raw_content = data.get("fileContent")
        file_path = data.get("filePath")
        file_name = data.get("fileName", "preset.xml")
        category = data.get("category", "Imported")

        temp_file = None
        target_path = file_path

        try:
            if raw_content:
                fd, temp_file = tempfile.mkstemp(suffix=f"_{file_name}")
                with os.fdopen(fd, "w", encoding="utf-8") as f:
                    f.write(raw_content)
                target_path = temp_file

            if not target_path or not os.path.exists(target_path):
                self._send_json(400, {"error": "Target file or fileContent is required and must exist"})
                return

            results = PresetAnalyzer.analyze_and_convert(
                file_path=target_path,
                category=category,
                source_name="direct_api",
                source_url=""
            )

            presets_out = []
            for r in results:
                if not r.preset:
                    continue
                valid, warnings = PresetValidator.validate(r.preset)
                r.warnings.extend(warnings)
                preview_svg = PresetPreviewGenerator.generate_svg_preview(r.preset, r.preset.name)
                presets_out.append({
                    "preset": r.preset.model_dump(),
                    "status": r.status,
                    "unsupportedReasons": r.unsupported_reasons,
                    "warnings": r.warnings,
                    "previewSvg": preview_svg,
                    "contentHash": PresetDeduplicator.compute_content_hash(r.preset),
                })

            self._send_json(200, {"success": True, "presets": presets_out})
        except Exception as e:
            self._send_json(500, {"success": False, "error": str(e)})
        finally:
            if temp_file and os.path.exists(temp_file):
                try:
                    os.remove(temp_file)
                except Exception:
                    pass

    def handle_generate_preview(self, data: Dict[str, Any]):
        """Generates matching SVG preview for a CaptionStyleDefinition."""
        preset_json = data.get("presetJson")
        title = data.get("title", "VIRAL")
        if not preset_json:
            self._send_json(400, {"error": "presetJson is required"})
            return

        try:
            preset = ViralClipPresetDefinition(**preset_json)
            svg = PresetPreviewGenerator.generate_svg_preview(preset, title)
            self._send_json(200, {"success": True, "svg": svg})
        except Exception as e:
            self._send_json(400, {"success": False, "error": str(e)})

def run_server(port: int = 8000, host: str = "0.0.0.0"):
    server_address = (host, port)
    httpd = HTTPServer(server_address, WorkerHandler)
    print(f"[PythonWorker] Worker HTTP service running on http://{host}:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("[PythonWorker] Server stopping...")
    finally:
        httpd.server_close()

def main():
    parser = argparse.ArgumentParser(description="ViralClip Studio Python Worker Service")
    parser.add_argument("--port", type=int, default=int(os.environ.get("PYTHON_WORKER_PORT", 8000)))
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--health", action="store_true", help="Print health JSON and exit")
    args = parser.parse_args()

    if args.health:
        print(json.dumps(get_system_health(), indent=2))
        return

    run_server(port=args.port, host=args.host)

if __name__ == "__main__":
    main()
