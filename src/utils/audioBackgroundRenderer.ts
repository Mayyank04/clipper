/**
 * audioBackgroundRenderer.ts
 *
 * Canvas 2D & Video Compositor for Audio-to-Video mode.
 * Supports:
 * - Static & Animated Gradient
 * - Particles (beat-reactive)
 * - Abstract Waves & Blobs
 * - User-uploaded images & videos
 * - AI-generated backgrounds
 * - Solid colors
 */

import { BackgroundType } from '../types';

export interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  color: string;
}

export class AudioBackgroundRenderer {
  private particles: Particle[] = [];
  private videoElements: Map<string, HTMLVideoElement> = new Map();
  private imageElements: Map<string, HTMLImageElement> = new Map();

  constructor() {
    this.initParticles(60);
  }

  private initParticles(count: number): void {
    const colors = ['#38bdf8', '#818cf8', '#facc15', '#f43f5e', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const r1 = Math.abs(Math.sin(i * 12.9898 + 78.233));
      const r2 = Math.abs(Math.sin(i * 37.719 + 11.123));
      const r3 = Math.abs(Math.sin(i * 93.987 + 43.541));
      const r4 = Math.abs(Math.sin(i * 61.231 + 89.102));
      const r5 = Math.abs(Math.sin(i * 17.456 + 23.789));
      this.particles.push({
        x: r1 % 1.0,
        y: r2 % 1.0,
        size: (r3 % 1.0) * 3 + 1,
        speedX: ((r4 % 1.0) - 0.5) * 0.04,
        speedY: -((r5 % 1.0) * 0.06 + 0.02),
        opacity: (r3 % 1.0) * 0.7 + 0.3,
        color: colors[Math.floor((r2 % 1.0) * colors.length)],
      });
    }
  }

  public render(
    ctx: CanvasRenderingContext2D,
    type: BackgroundType,
    time: number,
    width: number,
    height: number,
    options: {
      url?: string;
      color?: string;
      gradient?: [string, string, string?];
      beatEnergy?: number;
      videoEl?: HTMLVideoElement;
      imageEl?: HTMLImageElement;
    } = {}
  ): void {
    const beatEnergy = options.beatEnergy ?? 0.5;
    const pulseScale = 1.0 + Math.sin(time * Math.PI * 2 * 2.0) * 0.02 * beatEnergy;

    ctx.save();

    switch (type) {
      case 'animated_gradient': {
        const offset = (Math.sin(time * 0.5) + 1) / 2;
        const g1 = options.gradient?.[0] || '#0f172a';
        const g2 = options.gradient?.[1] || '#1e1b4b';
        const g3 = options.gradient?.[2] || '#020617';

        const grad = ctx.createLinearGradient(
          width * (0.2 + offset * 0.3),
          0,
          width * (0.8 - offset * 0.3),
          height
        );
        grad.addColorStop(0, g1);
        grad.addColorStop(0.5, g2);
        grad.addColorStop(1, g3);

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        break;
      }

      case 'particles': {
        // Deep space background
        const bgGrad = ctx.createRadialGradient(
          width / 2,
          height / 2,
          0,
          width / 2,
          height / 2,
          width * 0.8
        );
        bgGrad.addColorStop(0, '#0c0a1d');
        bgGrad.addColorStop(1, '#020205');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // Draw deterministic particles based on frame time
        for (let i = 0; i < this.particles.length; i++) {
          const p = this.particles[i];
          const curX = (((p.x + p.speedX * time) % 1.0) + 1.0) % 1.0;
          const curY = (((p.y + p.speedY * time) % 1.0) + 1.0) % 1.0;

          const px = curX * width;
          const py = curY * height;
          const pSize = p.size * pulseScale;

          ctx.save();
          ctx.globalAlpha = p.opacity;
          ctx.shadowColor = p.color;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(px, py, pSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        break;
      }

      case 'abstract_motion': {
        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, '#090d16');
        bgGrad.addColorStop(1, '#020408');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // Flowing sinusoidal waves
        const waveCount = 3;
        for (let w = 0; w < waveCount; w++) {
          ctx.beginPath();
          const wavePhase = time * (0.8 + w * 0.4);
          const yCenter = height * (0.4 + w * 0.15);

          ctx.moveTo(0, height);
          for (let x = 0; x <= width; x += 10) {
            const y = yCenter + Math.sin(x * 0.004 + wavePhase) * (60 + beatEnergy * 40);
            ctx.lineTo(x, y);
          }
          ctx.lineTo(width, height);
          ctx.closePath();

          const waveGrad = ctx.createLinearGradient(0, yCenter - 100, 0, height);
          waveGrad.addColorStop(0, w === 0 ? 'rgba(56, 189, 248, 0.18)' : 'rgba(168, 85, 247, 0.14)');
          waveGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = waveGrad;
          ctx.fill();
        }
        break;
      }

      case 'dynamic_waveform': {
        ctx.fillStyle = '#05070d';
        ctx.fillRect(0, 0, width, height);

        // Circular radiating frequency rings
        const centerWaveX = width / 2;
        const centerWaveY = height * 0.5;
        const ringCount = 6;
        for (let r = 0; r < ringCount; r++) {
          const ringRad = ((time * 40 + r * 60) % (width * 0.8)) + 30;
          ctx.beginPath();
          ctx.arc(centerWaveX, centerWaveY, ringRad, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(56, 189, 248, ${Math.max(0, 0.4 - ringRad / (width * 0.8))})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        break;
      }

      case 'image':
      case 'ai_generated':
      case 'blurred_image': {
        let img = options.imageEl;
        if (!img && options.url) {
          if (!this.imageElements.has(options.url)) {
            const newImg = new Image();
            newImg.crossOrigin = 'anonymous';
            newImg.src = options.url;
            this.imageElements.set(options.url, newImg);
          }
          img = this.imageElements.get(options.url);
        }

        if (img && img.complete && img.naturalWidth > 0) {
          // Cover crop
          const imgAspect = img.naturalWidth / img.naturalHeight;
          const canvasAspect = width / height;
          let drawW = width;
          let drawH = height;
          let drawX = 0;
          let drawY = 0;

          if (imgAspect > canvasAspect) {
            drawW = height * imgAspect;
            drawX = (width - drawW) / 2;
          } else {
            drawH = width / imgAspect;
            drawY = (height - drawH) / 2;
          }

          // Subtle Ken Burns slow zoom
          const zoom = 1.0 + (time * 0.008) % 0.08;
          ctx.save();
          ctx.translate(width / 2, height / 2);
          ctx.scale(zoom * pulseScale, zoom * pulseScale);
          ctx.translate(-width / 2, -height / 2);

          if (type === 'blurred_image') {
            ctx.filter = 'blur(16px) brightness(0.6)';
          } else {
            ctx.filter = 'brightness(0.65)';
          }

          ctx.drawImage(img, drawX, drawY, drawW, drawH);
          ctx.restore();
        } else {
          // Fallback elegant gradient
          const fallbackGrad = ctx.createLinearGradient(0, 0, 0, height);
          fallbackGrad.addColorStop(0, '#0f172a');
          fallbackGrad.addColorStop(1, '#020617');
          ctx.fillStyle = fallbackGrad;
          ctx.fillRect(0, 0, width, height);
        }
        break;
      }

      case 'video': {
        const vid = options.videoEl;
        if (vid && vid.readyState >= 2) {
          // Video background (looping)
          const vidAspect = vid.videoWidth / vid.videoHeight || 16 / 9;
          const canvasAspect = width / height;
          let drawW = width;
          let drawH = height;
          let drawX = 0;
          let drawY = 0;

          if (vidAspect > canvasAspect) {
            drawW = height * vidAspect;
            drawX = (width - drawW) / 2;
          } else {
            drawH = width / vidAspect;
            drawY = (height - drawH) / 2;
          }

          ctx.save();
          ctx.filter = 'brightness(0.6)';
          ctx.drawImage(vid, drawX, drawY, drawW, drawH);
          ctx.restore();
        } else {
          ctx.fillStyle = '#09090b';
          ctx.fillRect(0, 0, width, height);
        }
        break;
      }

      case 'solid':
      default: {
        ctx.fillStyle = options.color || '#09090b';
        ctx.fillRect(0, 0, width, height);
        break;
      }
    }

    // Vignette overlay for cinematic polish
    const vig = ctx.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * 0.4,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.8
    );
    vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vig.addColorStop(1, 'rgba(0, 0, 0, 0.65)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
  }
}
