/**
 * VIRALCLIP STUDIO — HARDWARE ACCELERATION DETECTOR
 * Detects host CPU / GPU architectures (Apple Silicon / MPS, NVIDIA CUDA, CPU)
 * for optimal local Whisper and neural inference dispatch.
 */

import os from 'os';
import { execSync } from 'child_process';

export interface HardwareInfo {
  deviceCode: 'mps' | 'cuda' | 'cpu';
  deviceName: string;
  isAccelerated: boolean;
  platform: string;
  arch: string;
  cores: number;
  totalMemoryGb: number;
}

let cachedHardwareInfo: HardwareInfo | null = null;

export function detectHardware(): HardwareInfo {
  if (cachedHardwareInfo) {
    return cachedHardwareInfo;
  }

  const platform = os.platform();
  const arch = os.arch();
  const cores = os.cpus().length;
  const totalMemoryGb = Math.round(os.totalmem() / (1024 * 1024 * 1024));

  // 1. Check for Apple Silicon (macOS arm64) with Metal Performance Shaders / Accelerate
  if (platform === 'darwin' && arch === 'arm64') {
    cachedHardwareInfo = {
      deviceCode: 'mps',
      deviceName: `Apple Silicon / MPS (Metal Accelerated, ${cores} cores, ${totalMemoryGb}GB RAM)`,
      isAccelerated: true,
      platform,
      arch,
      cores,
      totalMemoryGb,
    };
    return cachedHardwareInfo;
  }

  // 2. Check for NVIDIA CUDA
  let hasCuda = false;
  if (process.env.CUDA_VISIBLE_DEVICES && process.env.CUDA_VISIBLE_DEVICES !== '-1') {
    hasCuda = true;
  } else {
    try {
      execSync('nvidia-smi', { stdio: 'ignore', timeout: 1000 });
      hasCuda = true;
    } catch {
      hasCuda = false;
    }
  }

  if (hasCuda) {
    cachedHardwareInfo = {
      deviceCode: 'cuda',
      deviceName: `NVIDIA CUDA GPU (${cores} host cores, ${totalMemoryGb}GB RAM)`,
      isAccelerated: true,
      platform,
      arch,
      cores,
      totalMemoryGb,
    };
    return cachedHardwareInfo;
  }

  // 3. Fallback to multi-threaded CPU
  cachedHardwareInfo = {
    deviceCode: 'cpu',
    deviceName: `CPU (${cores} cores, ${totalMemoryGb}GB RAM)`,
    isAccelerated: false,
    platform,
    arch,
    cores,
    totalMemoryGb,
  };
  return cachedHardwareInfo;
}
