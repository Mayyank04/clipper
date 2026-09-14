import React, { useState, useEffect, useRef } from 'react';
import {
  VideoProject,
  ShortCandidate,
  BrandKit,
  EditingPersonality,
  AudioToVideoConfig,
  CaptionSegment,
  SourceMedia,
} from './types';
import { SAMPLE_PROJECTS } from './data/sampleProjects';
import { AUDIO_TEMPLATES, DEFAULT_AUDIO_TO_VIDEO_CONFIG } from './data/audioTemplates';
import {
  loadStoredProjects,
  saveStoredProjects,
  loadStoredBrandKit,
  saveStoredBrandKit,
} from './utils/storage';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { DashboardView } from './components/DashboardView';
import { ProjectView } from './components/ProjectView';
import { VideoEditor } from './components/Editor/VideoEditor';
import { ProcessingModal } from './components/ProcessingModal';
import { ExportModal } from './components/ExportModal';
import { BrandKitModal } from './components/BrandKitModal';
import { NewShortModal } from './components/NewShortModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ShortUnavailableRecovery } from './components/ShortUnavailableRecovery';

export default function App() {
  const [projects, setProjects] = useState<VideoProject[]>(() => loadStoredProjects());
  const [activeProject, setActiveProject] = useState<VideoProject>(() => {
    const initial = loadStoredProjects();
    return initial[0] || SAMPLE_PROJECTS[0];
  });
  const [activeShort, setActiveShort] = useState<ShortCandidate>(() => {
    const initial = loadStoredProjects();
    return initial[0]?.shorts?.[0] || SAMPLE_PROJECTS[0].shorts[0];
  });
  const [currentView, setCurrentView] = useState<'landing' | 'dashboard' | 'project' | 'editor'>('landing');

  // Modals state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingProjectId, setProcessingProjectId] = useState<string | null>(null);
  const [processingJobId, setProcessingJobId] = useState<string | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [processingUrl, setProcessingUrl] = useState<string>('');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [exportingShort, setExportingShort] = useState<ShortCandidate | null>(null);
  const [isNewShortModalOpen, setIsNewShortModalOpen] = useState<boolean>(false);
  const [isBrandKitModalOpen, setIsBrandKitModalOpen] = useState<boolean>(false);
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);

  // Global editing configuration
  const [editingPersonality, setEditingPersonality] = useState<EditingPersonality>('viral');
  const [brandKit, setBrandKit] = useState<BrandKit>(() => loadStoredBrandKit());

  // Save projects whenever they change
  useEffect(() => {
    saveStoredProjects(projects);
  }, [projects]);

  // Save brand kit whenever it changes
  useEffect(() => {
    saveStoredBrandKit(brandKit);
  }, [brandKit]);

  // Fetch projects from backend on mount to sync any server-side state
  useEffect(() => {
    const fetchBackendProjects = async () => {
      try {
        const res = await fetch('/api/projects');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.projects) && data.projects.length > 0) {
            setProjects((prev) => {
              // Merge server projects with any local projects
              const existingIds = new Set(data.projects.map((p: any) => p.id));
              const localOnly = prev.filter((p) => !existingIds.has(p.id));
              const merged = [...data.projects, ...localOnly];
              saveStoredProjects(merged);
              return merged;
            });
          }
        }
      } catch (err) {
        console.warn('Backend projects sync fallback to local storage:', err);
      }
    };
    fetchBackendProjects();
  }, []);

  // Start AI analysis for a URL or Demo
  const handleStartAnalysis = async (url: string, isDemo = false) => {
    setProcessingUrl(url);
    setIsNewShortModalOpen(false);
    setProcessingError(null);
    setProcessingJobId(null);
    setProcessingProjectId(null);
    setIsProcessing(true);

    try {
      // Initiate processing job on backend
      const res = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          youtubeUrl: url,
          title: isDemo ? 'DEMO: Viral Repurposing Showcase' : 'YouTube Video Processing Session',
          editingPersonality,
          isDemo,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to initiate processing job on backend');
      }

      setProcessingProjectId(data.projectId);
      setProcessingJobId(data.jobId);
    } catch (err: any) {
      console.error('Processing initiation error:', err);
      setProcessingError(err.message || 'Failed to connect to backend processing pipeline');
    }
  };

  // Instant Demo launcher
  const handleStartDemo = () => {
    handleStartAnalysis('https://www.youtube.com/watch?v=UF8uR6Z6KLc', true);
  };

  // Import local video file (MP4, MOV, WebM, M4V)
  const handleImportVideoFile = (file: File) => {
    setIsNewShortModalOpen(false);
    const objectUrl = URL.createObjectURL(file);
    const fileName = file.name.replace(/\.[^/.]+$/, '');

    // Probe duration using client video element
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = objectUrl;

    tempVideo.onloadedmetadata = async () => {
      const clientDur = Number.isFinite(tempVideo.duration) && tempVideo.duration > 0 ? Number(tempVideo.duration.toFixed(2)) : 0;
      let dur = clientDur;
      
      setProcessingUrl(objectUrl);
      setProcessingError(null);
      setProcessingJobId(null);
      setProcessingProjectId(null);
      setIsProcessing(true);

      let serverUrl = objectUrl;
      try {
        const formData = new FormData();
        formData.append('video', file);
        const upRes = await fetch('/api/upload', { method: 'POST', body: formData });
        if (upRes.ok) {
          const upData = await upRes.json();
          if (upData.url || upData.fileUrl) {
            serverUrl = upData.url || upData.fileUrl;
          }
          if (upData.duration && upData.duration > 0) {
            dur = upData.duration;
          }
        }
      } catch (err) {
        console.warn('Backend file upload notice:', err);
      }

      if (dur <= 0) {
        setProcessingError('Unable to determine video duration. Please upload a valid media file.');
        return;
      }

      try {
        const res = await fetch('/api/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: serverUrl,
            youtubeUrl: serverUrl,
            videoUrl: serverUrl,
            title: fileName,
            duration: dur,
            editingPersonality,
            isDemo: false,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to initiate processing for imported video');
        }
        setProcessingProjectId(data.projectId);
        setProcessingJobId(data.jobId);
      } catch (e: any) {
        console.error('Import processing error:', e);
        setProcessingError(e.message || 'Error processing imported video');
      }
    };

    tempVideo.onerror = () => {
      setProcessingError('Could not read video metadata. Please select a valid video file.');
    };
  };

  // Import local audio file (MP3, WAV, M4A, AAC, FLAC, OGG) -> Audio to Video Pipeline
  const handleImportAudioFile = async (file: File) => {
    setIsNewShortModalOpen(false);
    const objectUrl = URL.createObjectURL(file);
    const rawName = file.name.replace(/\.[^/.]+$/, '');
    const title = rawName.replace(/[_-]+/g, ' ');

    setProcessingUrl(objectUrl);
    setProcessingError(null);
    setProcessingJobId(null);
    setProcessingProjectId(null);
    setIsProcessing(true);

    try {
      // 1. Upload audio file to backend
      let serverUrl = objectUrl;
      let probedDuration = 0;

      const formData = new FormData();
      formData.append('audio', file);
      formData.append('video', file);

      try {
        const upRes = await fetch('/api/upload', { method: 'POST', body: formData });
        if (upRes.ok) {
          const upData = await upRes.json();
          if (upData.url || upData.fileUrl) {
            serverUrl = upData.url || upData.fileUrl;
          }
          if (upData.duration && upData.duration > 0) {
            probedDuration = upData.duration;
          }
        }
      } catch (err) {
        console.warn('Backend audio upload fallback to objectUrl:', err);
      }

      // If duration not probed yet from backend, check HTMLAudioElement
      if (!probedDuration || probedDuration <= 0) {
        try {
          const audio = new Audio(objectUrl);
          await new Promise<void>((resolve, reject) => {
            audio.onloadedmetadata = () => {
              if (Number.isFinite(audio.duration) && audio.duration > 0) {
                probedDuration = Number(audio.duration.toFixed(2));
                resolve();
              } else {
                reject(new Error('Invalid audio duration'));
              }
            };
            audio.onerror = () => reject(new Error('Failed to load audio metadata'));
            setTimeout(() => resolve(), 2000);
          });
        } catch (_) {}
      }

      if (probedDuration <= 0) {
        throw new Error('Unable to determine audio duration. Please check the audio file.');
      }

      // 2. Transcribe Audio for word-level timestamps & segments
      let captions: CaptionSegment[] = [];
      let transcriptText = '';
      try {
        const transRes = await fetch('/api/transcribe-audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioUrl: serverUrl,
            filename: file.name,
            duration: probedDuration,
            mimeType: file.type || 'audio/mp3',
            title,
          }),
        });
        if (transRes.ok) {
          const transData = await transRes.json();
          if (transData.success && (transData.segments || transData.captions)) {
            captions = transData.segments || transData.captions || [];
            transcriptText = transData.text || transData.transcript || '';
          }
        } else {
          const errData = await transRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Audio transcription service error');
        }
      } catch (err: any) {
        throw new Error(err.message || 'Audio transcription failed. Please ensure the audio contains clear speech.');
      }

      if (!captions || captions.length === 0) {
        throw new Error('Audio transcription failed or speech was not detected in this audio file.');
      }

      // 3. AI Visual Aesthetic & Template Selection
      let audioConfig: AudioToVideoConfig = {
        ...DEFAULT_AUDIO_TO_VIDEO_CONFIG,
      };

      try {
        const styleRes = await fetch('/api/audio-visual-style', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript: transcriptText,
            filename: file.name,
            duration: probedDuration,
            personality: editingPersonality,
          }),
        });
        if (styleRes.ok) {
          const styleData = await styleRes.json();
          const configPayload = styleData.config || styleData.style;
          if (configPayload) {
            audioConfig = {
              ...audioConfig,
              ...configPayload,
            };
          }
        }
      } catch (err) {
        console.warn('AI Style auto planner notice:', err);
      }

      // 4. Construct Audio-to-Video Project and ShortCandidate
      const shortId = `short_audio_${Date.now()}`;
      const canonicalSourceMedia: SourceMedia = {
        id: `media_${shortId}`,
        type: 'audio',
        kind: 'audio',
        localPath: serverUrl,
        publicUrl: serverUrl,
        url: serverUrl,
        filename: title || 'audio.mp3',
        mimeType: 'audio/mp3',
        duration: probedDuration,
        width: 1080,
        height: 1920,
        fps: 30,
        hasVideo: false,
        hasAudio: true,
        sourceType: 'upload',
        status: 'ready',
      };

      const audioShort: ShortCandidate = {
        id: shortId,
        title: title || 'Audio Short',
        description: 'Word-synchronized kinetic typography and beat-responsive visualizer created with Audio-to-Video mode.',
        hashtags: ['#AudioToVideo', '#KineticCaptions', '#ViralAudio', '#Shorts'],
        keywords: ['audio', 'music', 'podcast', 'lyrics', 'typography'],
        thumbnail: '',
        hookText: captions[0]?.text || title || 'Listen to this...',
        hookCategory: 'curiosity',
        startTime: 0,
        endTime: probedDuration,
        duration: probedDuration,
        sourceStart: 0,
        sourceEnd: probedDuration,
        sourceMedia: canonicalSourceMedia,
        aspectRatio: '9:16',
        topic: 'Audio & Music',
        viralScore: {
          overall: 96,
          breakdown: {
            hook: 98,
            retention: 97,
            emotion: 95,
            value: 94,
            pacing: 96,
            shareability: 96,
            clarity: 98,
            contextCompleteness: 92,
          },
          summary:
            'High sonic engagement with word-synchronized kinetic typography and beat-responsive visualizer geometry.',
        },
        captions,
        sfxMarkers: [],
        vfxMarkers: [
          { id: 'vfx_1', timestamp: 0, type: 'glow', duration: 1.5, label: 'Intro Energy' },
        ],
        brollSuggestions: [],
        speakerPosition: 'center',
        audioUrl: serverUrl,
        audioToVideoConfig: audioConfig,
      };

      const finalProject: VideoProject = {
        id: `proj_audio_${Date.now()}`,
        youtubeUrl: serverUrl,
        videoUrl: serverUrl,
        audioUrl: serverUrl,
        sourceMedia: canonicalSourceMedia,
        originalTitle: title || 'Audio Project',
        channelName: 'Audio Studio',
        originalThumbnail: '',
        originalDuration: probedDuration,
        projectType: 'audio-to-video',
        createdAt: 'Just now',
        shorts: [audioShort],
        analysisStats: {
          durationFormatted: `${Math.floor(probedDuration / 60)}:${String(Math.round(probedDuration % 60)).padStart(2, '0')}`,
          totalDurationSeconds: probedDuration,
          topicsDetected: 1,
          potentialMoments: 1,
          highQualityMoments: 1,
          generatedShortsCount: 1,
        },
      };

      setProjects((prev) => {
        const updated = [finalProject, ...prev.filter((p) => p.id !== finalProject.id)];
        saveStoredProjects(updated);
        return updated;
      });

      setIsProcessing(false);
      setActiveProject(finalProject);
      setActiveShort(audioShort);
      setCurrentView('editor');
    } catch (e: any) {
      console.error('Audio import processing error:', e);
      setIsProcessing(false);
      setProcessingError(e.message || 'Error processing audio file');
    }
  };

  // When backend or local pipeline completes
  const handleAnalysisComplete = (completedProjectData: any) => {
    setIsProcessing(false);
    setProcessingProjectId(null);

    let finalProject: VideoProject;

    if (completedProjectData && completedProjectData.id && Array.isArray(completedProjectData.shorts)) {
      finalProject = completedProjectData;
    } else {
      console.error('Invalid completed project data received from pipeline:', completedProjectData);
      setProcessingError('Video processing did not yield valid Short candidates. Please check source media.');
      return;
    }

    setProjects((prev) => {
      const updated = [finalProject, ...prev.filter((p) => p.id !== finalProject.id)];
      saveStoredProjects(updated);
      return updated;
    });

    setActiveProject(finalProject);
    if (finalProject.shorts && finalProject.shorts.length > 0) {
      setActiveShort(finalProject.shorts[0]);
    }
    setCurrentView('project');
  };

  // Duplicate a short candidate
  const handleDuplicateShort = (short: ShortCandidate) => {
    const duplicated: ShortCandidate = {
      ...short,
      id: `short_dup_${Date.now()}`,
      title: `${short.title} (Copy)`,
    };

    setActiveProject((prev) => {
      const updatedProject = {
        ...prev,
        shorts: [...prev.shorts, duplicated],
      };

      setProjects((all) => {
        const updatedAll = all.map((p) => (p.id === prev.id ? updatedProject : p));
        saveStoredProjects(updatedAll);
        return updatedAll;
      });

      return updatedProject;
    });
  };

  // Update short candidate from editor and persist
  const handleUpdateShort = (updated: ShortCandidate) => {
    setActiveShort(updated);
    setActiveProject((prev) => {
      const updatedProject = {
        ...prev,
        shorts: (prev.shorts || []).map((s) => (s.id === updated.id ? updated : s)),
      };

      setProjects((all) => {
        const updatedAll = all.map((p) => (p.id === prev.id ? updatedProject : p));
        saveStoredProjects(updatedAll);
        return updatedAll;
      });

      return updatedProject;
    });
  };

  // Update entire project (e.g. after generating more shorts or retuning style)
  const handleUpdateProject = (updatedProject: VideoProject) => {
    setActiveProject(updatedProject);
    setProjects((all) => {
      const updatedAll = all.map((p) => (p.id === updatedProject.id ? updatedProject : p));
      saveStoredProjects(updatedAll);
      return updatedAll;
    });
  };

  // Delete a project
  const handleDeleteProject = async (id: string) => {
    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Delete project network fallback');
    }

    setProjects((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      saveStoredProjects(updated);
      if (activeProject.id === id && updated.length > 0) {
        setActiveProject(updated[0]);
        if (updated[0].shorts && updated[0].shorts.length > 0) {
          setActiveShort(updated[0].shorts[0]);
        }
      }
      return updated;
    });
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      {/* Top Universal Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        onOpenNewShortModal={() => setIsNewShortModalOpen(true)}
        onOpenBrandKit={() => setIsBrandKitModalOpen(true)}
        editingPersonality={editingPersonality}
        onPersonalityChange={setEditingPersonality}
      />

      {/* Main View Router with ErrorBoundary Protection */}
      <main className="flex-1 flex flex-col">
        <ErrorBoundary
          componentName={`View_${currentView}`}
          route={`/${currentView}`}
          projectId={activeProject?.id}
          onReset={() => setCurrentView('dashboard')}
        >
          {currentView === 'landing' && (
            <LandingPage
              onStartAnalysis={handleStartAnalysis}
              onStartDemo={handleStartDemo}
              onImportVideoFile={handleImportVideoFile}
              onImportAudioFile={handleImportAudioFile}
              onSelectProject={(proj) => {
                setActiveProject(proj);
                if (proj.shorts && proj.shorts.length > 0) {
                  setActiveShort(proj.shorts[0]);
                }
                setCurrentView('project');
              }}
            />
          )}

          {currentView === 'dashboard' && (
            <DashboardView
              projects={projects}
              onSelectProject={(proj) => {
                setActiveProject(proj);
                if (proj.shorts && proj.shorts.length > 0) {
                  setActiveShort(proj.shorts[0]);
                }
                setCurrentView('project');
              }}
              onNewShortClick={() => setIsNewShortModalOpen(true)}
              onImportVideoFile={handleImportVideoFile}
              onDeleteProject={handleDeleteProject}
            />
          )}

          {currentView === 'project' && (
            <ProjectView
              project={activeProject}
              onBack={() => setCurrentView('dashboard')}
              onOpenEditor={(short) => {
                setActiveShort(short);
                setCurrentView('editor');
              }}
              onQuickExport={(short) => {
                setExportingShort(short);
              }}
              onDuplicateShort={handleDuplicateShort}
              onUpdateProject={handleUpdateProject}
            />
          )}

          {currentView === 'editor' && (() => {
            const resolvedProject = activeProject || projects[0] || SAMPLE_PROJECTS[0];
            const resolvedShort = activeShort || resolvedProject?.shorts?.[0] || SAMPLE_PROJECTS[0]?.shorts?.[0];

            if (!resolvedProject || !resolvedShort) {
              return (
                <ShortUnavailableRecovery
                  reason="This Short could not be loaded because its source project or candidate is missing."
                  projectId={resolvedProject?.id}
                  shortId={resolvedShort?.id}
                  onBackToShorts={() => setCurrentView('project')}
                  onReloadProject={() => window.location.reload()}
                  onBackToDashboard={() => setCurrentView('dashboard')}
                />
              );
            }

            return (
              <ErrorBoundary
                componentName="VideoEditor"
                projectId={resolvedProject.id}
                route={`/editor/${resolvedProject.id}/short/${resolvedShort.id}`}
                onReset={() => setCurrentView('project')}
              >
                <VideoEditor
                  project={resolvedProject}
                  short={resolvedShort}
                  onBack={() => setCurrentView('project')}
                  onExport={(short) => setExportingShort(short)}
                  brandKit={brandKit}
                  editingPersonality={editingPersonality}
                  onUpdateShort={handleUpdateShort}
                />
              </ErrorBoundary>
            );
          })()}
        </ErrorBoundary>
      </main>

      {/* Observable AI Processing Pipeline Modal */}
      <ProcessingModal
        isOpen={isProcessing}
        projectId={processingProjectId}
        jobId={processingJobId}
        videoUrl={processingUrl}
        initialError={processingError}
        isDemoMode={isDemoMode}
        onComplete={handleAnalysisComplete}
        onCancel={() => {
          setIsProcessing(false);
          setProcessingProjectId(null);
          setProcessingJobId(null);
          setProcessingError(null);
        }}
        onUploadVideo={() => {
          setIsProcessing(false);
          setProcessingProjectId(null);
          setProcessingJobId(null);
          setProcessingError(null);
          videoFileInputRef.current?.click();
        }}
        onRetryWithDemo={isDemoMode ? handleStartDemo : undefined}
      />

      {/* Hidden native video input for [Upload Video Instead] */}
      <input
        ref={videoFileInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm,video/x-m4v,.mp4,.mov,.webm,.m4v"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            handleImportVideoFile(f);
          }
        }}
      />

      {/* Export & Render Modal */}
      <ExportModal
        isOpen={Boolean(exportingShort)}
        short={exportingShort}
        brandKit={brandKit}
        onClose={() => setExportingShort(null)}
      />

      {/* Brand Kit Modal */}
      <BrandKitModal
        isOpen={isBrandKitModalOpen}
        brandKit={brandKit}
        onSave={(kit) => {
          setBrandKit(kit);
          setIsBrandKitModalOpen(false);
        }}
        onClose={() => setIsBrandKitModalOpen(false)}
      />

      {/* Quick New Short Modal */}
      <NewShortModal
        isOpen={isNewShortModalOpen}
        onClose={() => setIsNewShortModalOpen(false)}
        onSubmit={handleStartAnalysis}
        onStartDemo={handleStartDemo}
        onImportVideoFile={handleImportVideoFile}
        onImportAudioFile={handleImportAudioFile}
        onSelectSample={(sample) => {
          setActiveProject(sample);
          if (sample.shorts && sample.shorts.length > 0) {
            setActiveShort(sample.shorts[0]);
          }
          setCurrentView('project');
        }}
      />
    </div>
  );
}
