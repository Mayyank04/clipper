import React, { useRef, useEffect } from 'react';
import { AudioToVideoConfig } from '../../types';
import { AudioBackgroundRenderer } from '../../utils/audioBackgroundRenderer';
import {
  AudioVisualizerController,
  drawVisualizerToCanvas,
  getDeterministicFrequencyData,
} from '../../utils/audioVisualizer';

interface AudioVisualizerCanvasProps {
  config: AudioToVideoConfig;
  currentTime: number;
  isPlaying: boolean;
  mediaElement?: HTMLMediaElement | null;
  width?: number;
  height?: number;
}

const backgroundRenderer = new AudioBackgroundRenderer();
const visualizerController = new AudioVisualizerController();

export const AudioVisualizerCanvas: React.FC<AudioVisualizerCanvasProps> = ({
  config,
  currentTime,
  isPlaying,
  mediaElement,
  width = 720,
  height = 1280,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Connect Web Audio API to media element on user play
  useEffect(() => {
    if (mediaElement && isPlaying) {
      visualizerController.connect(mediaElement);
    }
  }, [mediaElement, isPlaying]);

  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;

      // 1. Render Background
      backgroundRenderer.render(ctx, config.backgroundType, currentTime, w, h, {
        url: config.backgroundUrl,
        color: config.backgroundColor,
        gradient: config.backgroundGradient,
        beatEnergy: config.beatEnergy,
      });

      // 2. Obtain Audio Frequency Data (real analyser when playing, deterministic math fallback when paused/seeking)
      let freqData: Uint8Array;
      if (isPlaying && visualizerController.isReady) {
        freqData = visualizerController.getFrequencyData();
      } else {
        freqData = getDeterministicFrequencyData(currentTime);
      }

      // 3. Render Visualizer
      drawVisualizerToCanvas(ctx, freqData, config.visualizerStyle, w, h, {
        opacity: config.visualizerOpacity ?? 0.85,
        position: config.visualizerPosition ?? 'bottom',
        height: config.visualizerHeight ?? 120,
        sensitivity: config.visualizerSensitivity ?? 1.0,
      });

      if (isPlaying) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [config, currentTime, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
    />
  );
};
