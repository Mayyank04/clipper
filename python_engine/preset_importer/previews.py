"""
ViralClip Studio — Preset Preview Generator
Generates visual vector SVG/CSS preview representations for imported caption styles.
"""

from python_engine.preset_importer.models import ViralClipPresetDefinition

class PresetPreviewGenerator:
    @staticmethod
    def generate_svg_preview(preset: ViralClipPresetDefinition, preview_text: str = "VIRAL PUNCH") -> str:
        """
        Produces a standalone crisp SVG card preview accurately displaying
        font family, primary color, highlight, stroke, shadow, and background.
        """
        cfg = preset.config
        font_main = cfg.fontFamily.split(",")[0].strip().replace("'", "").replace('"', '')
        stroke_svg = f'stroke="{cfg.strokeColor}" stroke-width="{cfg.strokeWidth}"' if cfg.strokeWidth > 0 else ''
        shadow_filter = ""
        filter_def = ""

        if cfg.hasShadow:
            filter_def = f'''
            <defs>
              <filter id="shadow_{preset.id}" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="rgba(0,0,0,0.9)" />
              </filter>
            </defs>
            '''
            shadow_filter = f'filter="url(#shadow_{preset.id})"'

        bg_rect = ""
        if cfg.backgroundColor and cfg.backgroundOpacity > 0:
            bg_rect = f'<rect x="20" y="55" width="280" height="50" rx="10" fill="{cfg.backgroundColor}" fill-opacity="{cfg.backgroundOpacity}" />'

        svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 160" width="100%" height="100%">
  {filter_def}
  <rect width="320" height="160" fill="#0A0A0A" rx="12" />
  {bg_rect}
  <g {shadow_filter}>
    <text x="160" y="90" 
          font-family="{font_main}, sans-serif" 
          font-size="{max(20, min(36, cfg.fontSize))}" 
          font-weight="{cfg.fontWeight}" 
          text-anchor="middle" 
          dominant-baseline="central"
          fill="{cfg.primaryColor}" 
          {stroke_svg}
          letter-spacing="{cfg.letterSpacing}px">
      <tspan fill="{cfg.highlightColor}">{preview_text.split()[0] if ' ' in preview_text else preview_text}</tspan>
      <tspan fill="{cfg.primaryColor}">{(' ' + ' '.join(preview_text.split()[1:])) if ' ' in preview_text else ''}</tspan>
    </text>
  </g>
</svg>'''
        return svg
