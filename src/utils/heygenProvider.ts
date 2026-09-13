import { ProviderStatus } from './ttsProvider';

export interface HeyGenAvatar {
  avatarId: string;
  avatarName: string;
  previewImageUrl: string;
  previewVideoUrl?: string;
  gender: 'male' | 'female';
  category: string;
}

export interface HeyGenVoice {
  voiceId: string;
  language: string;
  gender: string;
  name: string;
  previewAudioUrl?: string;
}

export interface AvatarVideoRequest {
  avatarId: string;
  voiceId?: string;
  scriptText: string;
  background?: { type: 'color' | 'image'; value: string };
  aspectRatio?: '9:16' | '16:9' | '1:1';
}

export interface PresenterJob {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  duration?: number;
  error?: string;
  createdAt: string;
}

export interface VideoTranslateRequest {
  videoUrl: string;
  targetLanguage: string;
  outputTitle?: string;
}

export interface LipSyncRequest {
  videoUrl: string;
  audioUrl: string;
}

/**
 * HeyGenProvider: Production HeyGen v2 integration.
 * Keeps credentials server-side and reports honest configuration requirements.
 */
export class HeyGenProvider {
  private apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.HEYGEN_API_KEY;
  }

  public getStatus(): { status: ProviderStatus; details: string; isConfigured: boolean } {
    const key = this.apiKey || process.env.HEYGEN_API_KEY;
    if (!key || key === 'MY_HEYGEN_API_KEY') {
      return {
        status: 'CONFIGURATION_REQUIRED',
        details: 'HeyGen integration requires configuration. Configure HEYGEN_API_KEY in server environment.',
        isConfigured: false,
      };
    }
    return {
      status: 'AVAILABLE',
      details: 'HeyGen v2 API integration configured and ready.',
      isConfigured: true,
    };
  }

  public async listAvatars(): Promise<{ avatars: HeyGenAvatar[]; isConfigured: boolean; message?: string }> {
    const status = this.getStatus();
    if (!status.isConfigured) {
      // Return representative standard HeyGen avatars with clear configuration requirement banner
      return {
        isConfigured: false,
        message: status.details,
        avatars: [
          {
            avatarId: 'josh_lite3_20230714',
            avatarName: 'Josh — Tech Host',
            previewImageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
            gender: 'male',
            category: 'Presenter / Commercial',
          },
          {
            avatarId: 'anna_doctor_standing',
            avatarName: 'Anna — Medical & Science',
            previewImageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
            gender: 'female',
            category: 'Healthcare / Educational',
          },
          {
            avatarId: 'marcus_casual_sitting',
            avatarName: 'Marcus — Viral Creator',
            previewImageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
            gender: 'male',
            category: 'Social Media / Shorts',
          },
          {
            avatarId: 'priya_corporate_standing',
            avatarName: 'Priya — Global Business',
            previewImageUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
            gender: 'female',
            category: 'Corporate / International',
          },
        ],
      };
    }

    try {
      const res = await fetch('https://api.heygen.com/v2/avatars', {
        headers: { 'X-Api-Key': this.apiKey || '' },
      });
      if (!res.ok) {
        throw new Error(`HeyGen API returned HTTP ${res.status}: ${await res.text()}`);
      }
      const data = await res.json();
      const avatars: HeyGenAvatar[] = (data.data?.avatars || []).map((a: any) => ({
        avatarId: a.avatar_id,
        avatarName: a.avatar_name,
        previewImageUrl: a.preview_image_url,
        previewVideoUrl: a.preview_video_url,
        gender: a.gender || 'neutral',
        category: 'Official HeyGen Avatar',
      }));
      return { isConfigured: true, avatars };
    } catch (err: any) {
      console.warn('HeyGen avatar fetch failed:', err);
      return { isConfigured: false, avatars: [], message: err.message };
    }
  }

  public async generateAvatarVideo(req: AvatarVideoRequest): Promise<PresenterJob> {
    const status = this.getStatus();
    if (!status.isConfigured) {
      throw new Error(status.details);
    }

    const payload = {
      video_inputs: [
        {
          character: {
            type: 'avatar',
            avatar_id: req.avatarId,
            avatar_style: 'normal',
          },
          voice: {
            type: 'text',
            input_text: req.scriptText,
            voice_id: req.voiceId || '1bd001e7e50f421d891986aad5158bc8',
          },
          background: req.background || { type: 'color', value: '#000000' },
        },
      ],
      dimension: {
        width: req.aspectRatio === '16:9' ? 1920 : 1080,
        height: req.aspectRatio === '16:9' ? 1080 : 1920,
      },
    };

    const res = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': this.apiKey || '',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HeyGen video generation failed (${res.status}): ${errText}`);
    }

    const json = await res.json();
    return {
      jobId: json.data?.video_id || `hg_${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
  }

  public async getGenerationStatus(jobId: string): Promise<PresenterJob> {
    const status = this.getStatus();
    if (!status.isConfigured) {
      throw new Error(status.details);
    }

    const res = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${jobId}`, {
      headers: { 'X-Api-Key': this.apiKey || '' },
    });

    if (!res.ok) {
      throw new Error(`HeyGen status check failed (${res.status})`);
    }

    const json = await res.json();
    const s = json.data?.status;

    return {
      jobId,
      status: s === 'completed' ? 'completed' : s === 'failed' ? 'failed' : 'processing',
      videoUrl: json.data?.video_url,
      duration: json.data?.duration,
      error: json.data?.error,
      createdAt: new Date().toISOString(),
    };
  }

  public async translateVideo(req: VideoTranslateRequest): Promise<{ jobId: string; status: string }> {
    const status = this.getStatus();
    if (!status.isConfigured) {
      throw new Error(status.details);
    }

    const res = await fetch('https://api.heygen.com/v2/video_translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': this.apiKey || '',
      },
      body: JSON.stringify({
        video_url: req.videoUrl,
        output_language: req.targetLanguage,
        title: req.outputTitle || 'Translated Short',
      }),
    });

    if (!res.ok) {
      throw new Error(`HeyGen video translation failed (${res.status}): ${await res.text()}`);
    }

    const json = await res.json();
    return { jobId: json.data?.translate_id || `trans_${Date.now()}`, status: 'processing' };
  }

  public async generateLipSync(req: LipSyncRequest): Promise<{ jobId: string; status: string }> {
    const status = this.getStatus();
    if (!status.isConfigured) {
      throw new Error(status.details);
    }

    const res = await fetch('https://api.heygen.com/v2/lip_sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': this.apiKey || '',
      },
      body: JSON.stringify({
        video_url: req.videoUrl,
        audio_url: req.audioUrl,
      }),
    });

    if (!res.ok) {
      throw new Error(`HeyGen lip sync failed (${res.status}): ${await res.text()}`);
    }

    const json = await res.json();
    return { jobId: json.data?.id || `ls_${Date.now()}`, status: 'processing' };
  }
}

export const heyGenProvider = new HeyGenProvider();
