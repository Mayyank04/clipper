import { VideoProject, ShortCandidate } from '../types';

export const SAMPLE_PROJECTS: VideoProject[] = [
  {
    id: 'proj-jobs-vision',
    youtubeUrl: 'https://www.youtube.com/watch?v=UF8uR6Z6KLc',
    videoId: 'UF8uR6Z6KLc',
    originalTitle: 'Steve Jobs - Secrets of Life & The Unreasonable Man Mindset',
    channelName: 'Silicon Valley Archives',
    originalDuration: 342,
    originalThumbnail: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&auto=format&fit=crop&q=80',
    createdAt: '2 hours ago',
    status: 'ready',
    videoUrl: '/demo/sample.mp4',
    demoMode: true,
    shorts: [
      {
        id: 'short-jobs-1',
        title: 'Everything Around You Was Built By People No Smarter Than You',
        description: 'The moment you understand you can poke life and push something out, everything changes. #stevejobs #mindset #motivation #success #entrepreneur',
        hashtags: ['#stevejobs', '#mindset', '#viral', '#motivation', '#entrepreneurship'],
        keywords: ['steve jobs', 'secrets of life', 'mindset', 'rules of society', 'inventing'],
        topic: 'Mental Models & Self-Belief',
        duration: 28,
        startTime: 0,
        endTime: 28,
        thumbnail: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&auto=format&fit=crop&q=80',
        hookText: 'The single most important fact they never taught you in school.',
        hookCategory: 'shock',
        availableHooks: [
          { category: 'shock', title: 'The Matrix Truth', text: 'The single most important fact they never taught you in school.' },
          { category: 'curiosity', title: 'Life Illusion', text: 'Have you ever realized that life is not what you were told?' },
          { category: 'bold', title: 'Unfiltered Rule', text: 'Stop accepting the world as it is right now.' },
          { category: 'question', title: 'The Question', text: 'Why are you following rules made by average people?' },
          { category: 'educational', title: 'Mental Shift', text: 'Here is the 1 mental shift that unlocks billionaire leverage.' }
        ],
        viralScore: {
          overall: 96,
          breakdown: {
            hook: 98,
            retention: 95,
            emotion: 94,
            value: 97,
            pacing: 96,
            shareability: 96,
            clarity: 98,
            contextCompleteness: 94
          },
          summary: 'Exceptional viral potential. Opens with a powerful paradigm shatter, zero preamble, rapid emotional escalation.'
        },
        speakerPosition: 'center',
        captions: [
          {
            id: 'cap-1',
            start: 0.5,
            end: 4.8,
            text: 'When you grow up, you tend to get told that the world is the way it is.',
            words: [
              { word: 'When', start: 0.5, end: 0.8 },
              { word: 'you', start: 0.8, end: 1.1 },
              { word: 'grow', start: 1.1, end: 1.4 },
              { word: 'up,', start: 1.4, end: 1.8 },
              { word: 'you', start: 1.8, end: 2.1 },
              { word: 'tend', start: 2.1, end: 2.5 },
              { word: 'to', start: 2.5, end: 2.7 },
              { word: 'get', start: 2.7, end: 3.0 },
              { word: 'told', start: 3.0, end: 3.5, isHighlight: true, highlightColor: '#f59e0b' },
              { word: 'that', start: 3.5, end: 3.7 },
              { word: 'the', start: 3.7, end: 3.9 },
              { word: 'world', start: 3.9, end: 4.3, isHighlight: true, highlightColor: '#38bdf8' },
              { word: 'is', start: 4.3, end: 4.5 },
              { word: 'the', start: 4.5, end: 4.6 },
              { word: 'way', start: 4.6, end: 4.7 },
              { word: 'it is.', start: 4.7, end: 4.8 }
            ]
          },
          {
            id: 'cap-2',
            start: 5.0,
            end: 9.8,
            text: 'And your life is just to live your life inside the world.',
            words: [
              { word: 'And', start: 5.0, end: 5.2 },
              { word: 'your', start: 5.2, end: 5.5 },
              { word: 'life', start: 5.5, end: 6.0, isHighlight: true, highlightColor: '#ec4899' },
              { word: 'is', start: 6.0, end: 6.3 },
              { word: 'just', start: 6.3, end: 6.7 },
              { word: 'to', start: 6.7, end: 6.9 },
              { word: 'live', start: 6.9, end: 7.4 },
              { word: 'inside', start: 7.4, end: 8.1, isHighlight: true, highlightColor: '#f59e0b' },
              { word: 'the', start: 8.1, end: 8.5 },
              { word: 'walls.', start: 8.5, end: 9.8, isHighlight: true, highlightColor: '#ef4444' }
            ]
          },
          {
            id: 'cap-3',
            start: 10.1,
            end: 17.0,
            text: 'Try not to bash into the walls too much. That is a very limited life.',
            words: [
              { word: 'Try', start: 10.1, end: 10.4 },
              { word: 'not', start: 10.4, end: 10.8 },
              { word: 'to', start: 10.8, end: 11.0 },
              { word: 'bash', start: 11.0, end: 11.6, isHighlight: true, highlightColor: '#ef4444' },
              { word: 'into', start: 11.6, end: 12.0 },
              { word: 'the', start: 12.0, end: 12.2 },
              { word: 'walls.', start: 12.2, end: 12.9 },
              { word: 'That', start: 13.2, end: 13.6 },
              { word: 'is', start: 13.6, end: 13.8 },
              { word: 'a', start: 13.8, end: 14.0 },
              { word: 'VERY', start: 14.0, end: 14.8, isHighlight: true, highlightColor: '#f59e0b', scale: 1.2 },
              { word: 'limited', start: 14.8, end: 15.6, isHighlight: true, highlightColor: '#f43f5e' },
              { word: 'life.', start: 15.6, end: 17.0 }
            ]
          },
          {
            id: 'cap-4',
            start: 17.0,
            end: 23.5,
            text: 'Everything around you was made up by people that were no smarter than you.',
            words: [
              { word: 'Everything', start: 17.0, end: 17.8, isHighlight: true, highlightColor: '#10b981' },
              { word: 'around', start: 17.8, end: 18.2 },
              { word: 'you', start: 18.2, end: 18.6 },
              { word: 'was', start: 18.6, end: 18.9 },
              { word: 'made', start: 18.9, end: 19.3 },
              { word: 'up', start: 19.3, end: 19.6 },
              { word: 'by', start: 19.6, end: 19.9 },
              { word: 'people', start: 19.9, end: 20.6 },
              { word: 'no', start: 20.6, end: 21.1 },
              { word: 'smarter', start: 21.1, end: 22.0, isHighlight: true, highlightColor: '#f59e0b', scale: 1.25 },
              { word: 'than', start: 22.0, end: 22.5 },
              { word: 'YOU.', start: 22.5, end: 23.5, isHighlight: true, highlightColor: '#38bdf8', scale: 1.3 }
            ]
          },
          {
            id: 'cap-5',
            start: 24.0,
            end: 27.8,
            text: 'And you can change it. You can influence it. You can build things.',
            words: [
              { word: 'And', start: 24.0, end: 24.3 },
              { word: 'YOU', start: 24.3, end: 24.8, isHighlight: true, highlightColor: '#10b981' },
              { word: 'can', start: 24.8, end: 25.1 },
              { word: 'CHANGE', start: 25.1, end: 25.8, isHighlight: true, highlightColor: '#f59e0b', scale: 1.2 },
              { word: 'IT.', start: 25.8, end: 26.2 },
              { word: 'You', start: 26.2, end: 26.5 },
              { word: 'can', start: 26.5, end: 26.7 },
              { word: 'BUILD', start: 26.7, end: 27.3, isHighlight: true, highlightColor: '#ec4899', scale: 1.25 },
              { word: 'things.', start: 27.3, end: 27.8 }
            ]
          }
        ],
        sfxMarkers: [
          { id: 'sfx-1', timestamp: 0.5, category: 'whoosh', soundName: 'Subtle Whip Whoosh', volume: 0.6 },
          { id: 'sfx-2', timestamp: 3.2, category: 'pop', soundName: 'Pop Accent', volume: 0.5 },
          { id: 'sfx-3', timestamp: 11.2, category: 'hit', soundName: 'Impact Hit', volume: 0.7 },
          { id: 'sfx-4', timestamp: 14.2, category: 'cinematic', soundName: 'Cinematic Sub Drop', volume: 0.8 },
          { id: 'sfx-5', timestamp: 17.2, category: 'rise', soundName: 'Pitch Riser', volume: 0.6 },
          { id: 'sfx-6', timestamp: 22.4, category: 'impact', soundName: 'Master Strike Hit', volume: 0.85 }
        ],
        vfxMarkers: [
          { id: 'vfx-1', timestamp: 0.0, duration: 1.8, type: 'zoom_punch', label: '1.15x Punch-In' },
          { id: 'vfx-2', timestamp: 11.0, duration: 0.4, type: 'shake', label: 'Impact Camera Shake' },
          { id: 'vfx-3', timestamp: 14.0, duration: 2.2, type: 'glow', label: 'Dark Mode Vignette & Amber Glow' },
          { id: 'vfx-4', timestamp: 21.0, duration: 2.5, type: 'callout', label: 'KEYPOINT: "NO SMARTER THAN YOU"' },
          { id: 'vfx-5', timestamp: 25.0, duration: 2.8, type: 'progress_bar', label: 'Viral Progress Bar' }
        ],
        brollSuggestions: [
          { id: 'br-1', timestamp: 3.5, duration: 3.0, concept: 'Busy city street crowds rushing', imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?w=500&auto=format&fit=crop&q=80', keyword: 'City crowd', enabled: true },
          { id: 'br-2', timestamp: 17.2, duration: 3.5, concept: 'Silicon Valley vintage circuit blueprint', imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&auto=format&fit=crop&q=80', keyword: 'Microchips & Design', enabled: false }
        ]
      },
      {
        id: 'short-jobs-2',
        title: 'The "Unreasonable Man" Rule That Made Apple $3 Trillion',
        description: 'Why reasonable men never change history. George Bernard Shaw quote breakdown. #apple #billionaire #success #inspiration',
        hashtags: ['#apple', '#stevejobs', '#mindset', '#leadership'],
        keywords: ['unreasonable man', 'apple secret', 'how to win', 'leadership'],
        topic: 'Business Philosophy',
        duration: 24,
        startTime: 45,
        endTime: 69,
        thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&auto=format&fit=crop&q=80',
        hookText: 'Why being reasonable will guarantee you remain average.',
        hookCategory: 'bold',
        availableHooks: [
          { category: 'bold', title: 'Radical Rule', text: 'Why being reasonable will guarantee you remain average.' },
          { category: 'curiosity', title: 'The Apple Secret', text: 'Steve Jobs had one rule that infuriated his engineers.' },
          { category: 'question', title: 'Self Audit', text: 'Are you adapting to the world or forcing the world to adapt to you?' }
        ],
        viralScore: {
          overall: 93,
          breakdown: {
            hook: 95,
            retention: 92,
            emotion: 91,
            value: 94,
            pacing: 95,
            shareability: 93,
            clarity: 96,
            contextCompleteness: 92
          },
          summary: 'High-octane business insight. Directly connects mindset to massive scale outcomes.'
        },
        speakerPosition: 'center',
        captions: [
          {
            id: 'cap-201',
            start: 0.4,
            end: 4.2,
            text: 'The reasonable man adapts himself to the world around him.',
            words: [
              { word: 'The', start: 0.4, end: 0.6 },
              { word: 'reasonable', start: 0.6, end: 1.2, isHighlight: true, highlightColor: '#94a3b8' },
              { word: 'man', start: 1.2, end: 1.5 },
              { word: 'adapts', start: 1.5, end: 2.1 },
              { word: 'himself', start: 2.1, end: 2.6 },
              { word: 'to', start: 2.6, end: 2.8 },
              { word: 'the', start: 2.8, end: 3.0 },
              { word: 'world.', start: 3.0, end: 4.2 }
            ]
          },
          {
            id: 'cap-202',
            start: 4.5,
            end: 9.2,
            text: 'The unreasonable one persists in trying to adapt the world to himself.',
            words: [
              { word: 'The', start: 4.5, end: 4.8 },
              { word: 'UNREASONABLE', start: 4.8, end: 5.8, isHighlight: true, highlightColor: '#f59e0b', scale: 1.2 },
              { word: 'one', start: 5.8, end: 6.2 },
              { word: 'persists', start: 6.2, end: 6.8 },
              { word: 'in', start: 6.8, end: 7.0 },
              { word: 'adapting', start: 7.0, end: 7.7, isHighlight: true, highlightColor: '#10b981' },
              { word: 'the', start: 7.7, end: 7.9 },
              { word: 'world', start: 7.9, end: 8.4 },
              { word: 'to', start: 8.4, end: 8.6 },
              { word: 'himself.', start: 8.6, end: 9.2 }
            ]
          },
          {
            id: 'cap-203',
            start: 9.6,
            end: 15.2,
            text: 'Therefore, all progress depends on the unreasonable person.',
            words: [
              { word: 'Therefore,', start: 9.6, end: 10.3 },
              { word: 'ALL', start: 10.3, end: 11.0, isHighlight: true, highlightColor: '#ec4899', scale: 1.25 },
              { word: 'progress', start: 11.0, end: 11.9, isHighlight: true, highlightColor: '#38bdf8' },
              { word: 'depends', start: 11.9, end: 12.6 },
              { word: 'on', start: 12.6, end: 12.8 },
              { word: 'the', start: 12.8, end: 13.0 },
              { word: 'unreasonable', start: 13.0, end: 14.0, isHighlight: true, highlightColor: '#f59e0b' },
              { word: 'person.', start: 14.0, end: 15.2 }
            ]
          },
          {
            id: 'cap-204',
            start: 15.2,
            end: 19.4,
            text: 'If you want real impact, stop being so accommodating.',
            words: [
              { word: 'If', start: 15.2, end: 15.4 },
              { word: 'you', start: 15.4, end: 15.6 },
              { word: 'want', start: 15.6, end: 16.0 },
              { word: 'REAL', start: 16.0, end: 16.7, isHighlight: true, highlightColor: '#ec4899', scale: 1.25 },
              { word: 'impact,', start: 16.7, end: 17.4 },
              { word: 'stop', start: 17.4, end: 17.9, isHighlight: true, highlightColor: '#ef4444' },
              { word: 'being', start: 17.9, end: 18.3 },
              { word: 'so', start: 18.3, end: 18.6 },
              { word: 'accommodating.', start: 18.6, end: 19.4 }
            ]
          },
          {
            id: 'cap-205',
            start: 19.8,
            end: 23.8,
            text: 'Insist on your vision until the entire world yields.',
            words: [
              { word: 'Insist', start: 19.8, end: 20.4, isHighlight: true, highlightColor: '#10b981' },
              { word: 'on', start: 20.4, end: 20.6 },
              { word: 'your', start: 20.6, end: 20.9 },
              { word: 'VISION', start: 20.9, end: 21.6, isHighlight: true, highlightColor: '#f59e0b', scale: 1.2 },
              { word: 'until', start: 21.6, end: 22.0 },
              { word: 'the', start: 22.0, end: 22.2 },
              { word: 'world', start: 22.2, end: 22.8, isHighlight: true, highlightColor: '#38bdf8' },
              { word: 'yields.', start: 22.8, end: 23.8 }
            ]
          }
        ],
        sfxMarkers: [
          { id: 'sfx-201', timestamp: 0.3, category: 'whoosh', soundName: 'Swift Whoosh', volume: 0.6 },
          { id: 'sfx-202', timestamp: 4.8, category: 'impact', soundName: 'Bass Drop', volume: 0.8 },
          { id: 'sfx-203', timestamp: 10.5, category: 'hit', soundName: 'Cymbal Strike', volume: 0.7 },
          { id: 'sfx-204', timestamp: 16.0, category: 'pop', soundName: 'Impact Pop', volume: 0.75 },
          { id: 'sfx-205', timestamp: 20.8, category: 'impact', soundName: 'Master Finale Drop', volume: 0.85 }
        ],
        vfxMarkers: [
          { id: 'vfx-201', timestamp: 4.6, duration: 1.5, type: 'zoom_punch', label: '1.2x Dynamic Zoom' },
          { id: 'vfx-202', timestamp: 10.0, duration: 2.0, type: 'glow', label: 'High-Contrast Border Glow' },
          { id: 'vfx-203', timestamp: 16.0, duration: 1.4, type: 'shake', label: 'Kinetic Camera Shake' },
          { id: 'vfx-204', timestamp: 20.5, duration: 3.0, type: 'zoom_punch', label: 'Slow Dramatic Zoom' }
        ],
        brollSuggestions: [
          {
            id: 'br-201',
            timestamp: 15.0,
            duration: 3.5,
            concept: 'Architect sketching audacious modern skyscraper',
            imageUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=500&auto=format&fit=crop&q=80',
            keyword: 'Bold Architect Vision',
            enabled: true
          }
        ]
      },
      {
        id: 'short-jobs-3',
        title: 'You Cannot Connect The Dots Looking Forward',
        description: 'Trust that the dots will somehow connect in your future. #stevejobs #destiny #faith #career',
        hashtags: ['#stevejobs', '#dots', '#wisdom', '#quotes'],
        keywords: ['connecting dots', 'stanford speech', 'career advice'],
        topic: 'Life Purpose & Intuition',
        duration: 22,
        startTime: 112,
        endTime: 134,
        thumbnail: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&auto=format&fit=crop&q=80',
        hookText: 'Stop trying to plan your entire 10-year career right now.',
        hookCategory: 'educational',
        availableHooks: [
          { category: 'educational', title: 'Anti-Planning', text: 'Stop trying to plan your entire 10-year career right now.' },
          { category: 'curiosity', title: 'Stanford Secret', text: 'The most famous line in commencement history.' }
        ],
        viralScore: {
          overall: 90,
          breakdown: {
            hook: 89,
            retention: 91,
            emotion: 96,
            value: 92,
            pacing: 88,
            shareability: 94,
            clarity: 93,
            contextCompleteness: 90
          },
          summary: 'Deep emotional resonance. Excellent for Instagram Reels and TikTok motivational accounts.'
        },
        speakerPosition: 'center',
        captions: [
          {
            id: 'cap-301',
            start: 0.5,
            end: 4.8,
            text: 'You cannot connect the dots looking forward.',
            words: [
              { word: 'You', start: 0.5, end: 0.8 },
              { word: 'CANNOT', start: 0.8, end: 1.5, isHighlight: true, highlightColor: '#ef4444', scale: 1.2 },
              { word: 'connect', start: 1.5, end: 2.2 },
              { word: 'the', start: 2.2, end: 2.4 },
              { word: 'dots', start: 2.4, end: 3.0, isHighlight: true, highlightColor: '#f59e0b' },
              { word: 'looking', start: 3.0, end: 3.6 },
              { word: 'forward.', start: 3.6, end: 4.8 }
            ]
          },
          {
            id: 'cap-302',
            start: 5.2,
            end: 10.0,
            text: 'You can only connect them looking backwards.',
            words: [
              { word: 'You', start: 5.2, end: 5.5 },
              { word: 'can', start: 5.5, end: 5.8 },
              { word: 'ONLY', start: 5.8, end: 6.4, isHighlight: true, highlightColor: '#10b981' },
              { word: 'connect', start: 6.4, end: 7.1 },
              { word: 'them', start: 7.1, end: 7.5 },
              { word: 'looking', start: 7.5, end: 8.2 },
              { word: 'backwards.', start: 8.2, end: 10.0, isHighlight: true, highlightColor: '#38bdf8' }
            ]
          },
          {
            id: 'cap-303',
            start: 10.4,
            end: 15.8,
            text: 'So you have to trust that the dots will somehow connect in your future.',
            words: [
              { word: 'So', start: 10.4, end: 10.7 },
              { word: 'you', start: 10.7, end: 11.0 },
              { word: 'have', start: 11.0, end: 11.3 },
              { word: 'to', start: 11.3, end: 11.5 },
              { word: 'TRUST', start: 11.5, end: 12.2, isHighlight: true, highlightColor: '#f59e0b', scale: 1.25 },
              { word: 'that', start: 12.2, end: 12.5 },
              { word: 'the', start: 12.5, end: 12.7 },
              { word: 'dots', start: 12.7, end: 13.2, isHighlight: true, highlightColor: '#ec4899' },
              { word: 'will', start: 13.2, end: 13.5 },
              { word: 'somehow', start: 13.5, end: 14.1 },
              { word: 'connect', start: 14.1, end: 14.8 },
              { word: 'in', start: 14.8, end: 15.0 },
              { word: 'your', start: 15.0, end: 15.2 },
              { word: 'future.', start: 15.2, end: 15.8 }
            ]
          },
          {
            id: 'cap-304',
            start: 16.2,
            end: 21.8,
            text: 'You have to trust in your gut, destiny, life, karma, whatever.',
            words: [
              { word: 'Trust', start: 16.2, end: 16.8, isHighlight: true, highlightColor: '#10b981' },
              { word: 'in', start: 16.8, end: 17.0 },
              { word: 'your', start: 17.0, end: 17.3 },
              { word: 'GUT,', start: 17.3, end: 18.0, isHighlight: true, highlightColor: '#f59e0b', scale: 1.2 },
              { word: 'destiny,', start: 18.0, end: 18.8, isHighlight: true, highlightColor: '#38bdf8' },
              { word: 'life,', start: 18.8, end: 19.5, isHighlight: true, highlightColor: '#ec4899' },
              { word: 'karma,', start: 19.5, end: 20.3 },
              { word: 'whatever.', start: 20.3, end: 21.8 }
            ]
          }
        ],
        sfxMarkers: [
          { id: 'sfx-301', timestamp: 0.8, category: 'hit', soundName: 'Soft Chime', volume: 0.5 },
          { id: 'sfx-302', timestamp: 5.8, category: 'pop', soundName: 'Pop Affirmation', volume: 0.6 },
          { id: 'sfx-303', timestamp: 11.5, category: 'impact', soundName: 'Deep Realization Sub', volume: 0.8 },
          { id: 'sfx-304', timestamp: 17.3, category: 'chime', soundName: 'Crystal Resonator', volume: 0.7 }
        ],
        vfxMarkers: [
          { id: 'vfx-301', timestamp: 0.5, duration: 2.0, type: 'zoom_punch', label: 'Slow Drift Zoom' },
          { id: 'vfx-302', timestamp: 11.2, duration: 2.5, type: 'glow', label: 'Ethereal Accent Glow' },
          { id: 'vfx-303', timestamp: 17.0, duration: 3.5, type: 'zoom_punch', label: 'Dynamic Punch In' }
        ],
        brollSuggestions: [
          {
            id: 'br-301',
            timestamp: 10.5,
            duration: 3.8,
            concept: 'Constellation of stars connecting in night sky',
            imageUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=500&auto=format&fit=crop&q=80',
            keyword: 'Connecting Stars',
            enabled: true
          }
        ]
      }
    ]
  },
  {
    id: 'proj-hormozi-framework',
    youtubeUrl: 'https://www.youtube.com/watch?v=1r8z3Nl_6zM',
    videoId: '1r8z3Nl_6zM',
    originalTitle: 'Alex Hormozi - How To Create An Irresistible Offer People Feel Stupid Saying No To',
    channelName: 'Acquisition.com',
    originalDuration: 480,
    originalThumbnail: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&auto=format&fit=crop&q=80',
    createdAt: '1 day ago',
    status: 'ready',
    videoUrl: '/demo/sample2.mp4',
    demoMode: true,
    shorts: [
      {
        id: 'short-hormozi-1',
        title: 'The Value Equation: Why Cheap Prices Kill Your Business',
        description: 'Dream outcome x Perceived likelihood / Time delay x Effort. The mathematical equation for wealth. #business #sales #alexhormozi',
        hashtags: ['#alexhormozi', '#offers', '#money', '#sales', '#shorts'],
        keywords: ['value equation', 'pricing strategy', 'business scaling', 'sales funnel'],
        topic: 'Sales & Pricing Psychology',
        duration: 30,
        startTime: 0,
        endTime: 30,
        thumbnail: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=600&auto=format&fit=crop&q=80',
        hookText: 'Most entrepreneurs price their services like cowards.',
        hookCategory: 'bold',
        availableHooks: [
          { category: 'bold', title: 'The Coward Test', text: 'Most entrepreneurs price their services like cowards.' },
          { category: 'shock', title: 'The Profit Leak', text: 'You are losing 80% of your profit by undercharging.' },
          { category: 'educational', title: 'The Formula', text: 'This 4-variable equation made me $100 Million.' }
        ],
        viralScore: {
          overall: 95,
          breakdown: {
            hook: 97,
            retention: 94,
            emotion: 93,
            value: 98,
            pacing: 96,
            shareability: 95,
            clarity: 97,
            contextCompleteness: 94
          },
          summary: 'Electrifying tactical clip. Clear takeaway framework with instant dopamine realization.'
        },
        speakerPosition: 'center',
        captions: [
          {
            id: 'cap-h1',
            start: 0.4,
            end: 4.8,
            text: 'If you want to charge 10 times more, you do NOT work 10 times harder.',
            words: [
              { word: 'If', start: 0.4, end: 0.6 },
              { word: 'you', start: 0.6, end: 0.8 },
              { word: 'want', start: 0.8, end: 1.1 },
              { word: 'to', start: 1.1, end: 1.3 },
              { word: 'charge', start: 1.3, end: 1.8 },
              { word: '10X', start: 1.8, end: 2.6, isHighlight: true, highlightColor: '#10b981', scale: 1.3 },
              { word: 'more,', start: 2.6, end: 3.0 },
              { word: 'you', start: 3.0, end: 3.3 },
              { word: 'do', start: 3.3, end: 3.5 },
              { word: 'NOT', start: 3.5, end: 4.0, isHighlight: true, highlightColor: '#ef4444', scale: 1.25 },
              { word: 'work', start: 4.0, end: 4.4 },
              { word: 'harder.', start: 4.4, end: 4.8 }
            ]
          },
          {
            id: 'cap-h2',
            start: 5.2,
            end: 11.0,
            text: 'You simply increase the perceived likelihood of achievement.',
            words: [
              { word: 'You', start: 5.2, end: 5.4 },
              { word: 'simply', start: 5.4, end: 5.8 },
              { word: 'INCREASE', start: 5.8, end: 6.6, isHighlight: true, highlightColor: '#10b981', scale: 1.25 },
              { word: 'the', start: 6.6, end: 6.8 },
              { word: 'perceived', start: 6.8, end: 7.5 },
              { word: 'LIKELIHOOD', start: 7.5, end: 8.5, isHighlight: true, highlightColor: '#f59e0b' },
              { word: 'of', start: 8.5, end: 8.7 },
              { word: 'achievement.', start: 8.7, end: 11.0 }
            ]
          },
          {
            id: 'cap-h3',
            start: 11.5,
            end: 17.5,
            text: 'And decrease the time delay and the effort required.',
            words: [
              { word: 'And', start: 11.5, end: 11.7 },
              { word: 'DECREASE', start: 11.7, end: 12.6, isHighlight: true, highlightColor: '#ef4444', scale: 1.25 },
              { word: 'the', start: 12.6, end: 12.8 },
              { word: 'time', start: 12.8, end: 13.3 },
              { word: 'delay,', start: 13.3, end: 14.1, isHighlight: true, highlightColor: '#38bdf8' },
              { word: 'and', start: 14.1, end: 14.3 },
              { word: 'the', start: 14.3, end: 14.5 },
              { word: 'effort', start: 14.5, end: 15.2, isHighlight: true, highlightColor: '#ec4899' },
              { word: 'required.', start: 15.2, end: 17.5 }
            ]
          },
          {
            id: 'cap-h4',
            start: 18.0,
            end: 23.5,
            text: 'When people get their dream outcome fast, price becomes irrelevant.',
            words: [
              { word: 'When', start: 18.0, end: 18.3 },
              { word: 'people', start: 18.3, end: 18.7 },
              { word: 'get', start: 18.7, end: 19.0 },
              { word: 'results', start: 19.0, end: 19.6, isHighlight: true, highlightColor: '#10b981' },
              { word: 'FAST,', start: 19.6, end: 20.4, isHighlight: true, highlightColor: '#f59e0b', scale: 1.25 },
              { word: 'price', start: 20.4, end: 21.0 },
              { word: 'becomes', start: 21.0, end: 21.6 },
              { word: 'irrelevant.', start: 21.6, end: 23.5, isHighlight: true, highlightColor: '#38bdf8' }
            ]
          },
          {
            id: 'cap-h5',
            start: 24.0,
            end: 29.5,
            text: 'That is how you construct an offer they feel stupid saying no to.',
            words: [
              { word: 'That', start: 24.0, end: 24.3 },
              { word: 'is', start: 24.3, end: 24.5 },
              { word: 'how', start: 24.5, end: 24.8 },
              { word: 'you', start: 24.8, end: 25.1 },
              { word: 'make', start: 25.1, end: 25.5 },
              { word: 'an', start: 25.5, end: 25.7 },
              { word: 'OFFER', start: 25.7, end: 26.5, isHighlight: true, highlightColor: '#f59e0b', scale: 1.2 },
              { word: 'they', start: 26.5, end: 26.8 },
              { word: 'feel', start: 26.8, end: 27.2 },
              { word: 'STUPID', start: 27.2, end: 28.2, isHighlight: true, highlightColor: '#ef4444', scale: 1.3 },
              { word: 'saying', start: 28.2, end: 28.8 },
              { word: 'no to.', start: 28.8, end: 29.5 }
            ]
          }
        ],
        sfxMarkers: [
          { id: 'sfx-h1', timestamp: 1.8, category: 'hit', soundName: 'Cash Pop', volume: 0.7 },
          { id: 'sfx-h2', timestamp: 3.5, category: 'whoosh', soundName: 'Punch Whoosh', volume: 0.6 },
          { id: 'sfx-h3', timestamp: 6.0, category: 'pop', soundName: 'Metric Ding', volume: 0.65 },
          { id: 'sfx-h4', timestamp: 12.0, category: 'impact', soundName: 'Deep Sub Drop', volume: 0.8 },
          { id: 'sfx-h5', timestamp: 19.8, category: 'hit', soundName: 'Cash Register Strike', volume: 0.75 },
          { id: 'sfx-h6', timestamp: 27.2, category: 'impact', soundName: 'Authority Finale Slam', volume: 0.85 }
        ],
        vfxMarkers: [
          { id: 'vfx-h1', timestamp: 1.7, duration: 1.0, type: 'zoom_punch', label: '1.25x Punch Zoom' },
          { id: 'vfx-h2', timestamp: 5.8, duration: 2.0, type: 'glow', label: 'Green Value Surge' },
          { id: 'vfx-h3', timestamp: 11.8, duration: 1.4, type: 'shake', label: 'Impact Shake' },
          { id: 'vfx-h4', timestamp: 26.5, duration: 2.5, type: 'zoom_punch', label: 'Dramatic Climax Punch' }
        ],
        brollSuggestions: [
          {
            id: 'br-h1',
            timestamp: 5.5,
            duration: 3.8,
            concept: 'High ticket luxury consulting contract signature',
            imageUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=500&auto=format&fit=crop&q=80',
            keyword: 'Value Scaling',
            enabled: true
          }
        ]
      }
    ]
  },
  {
    id: 'proj-huberman-focus',
    youtubeUrl: 'https://www.youtube.com/watch?v=gX7_c_T2k_Y',
    videoId: 'gX7_c_T2k_Y',
    originalTitle: 'Andrew Huberman - How To Reset Your Dopamine System For Unstoppable Focus',
    channelName: 'Huberman Lab',
    originalDuration: 520,
    originalThumbnail: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop&q=80',
    createdAt: '3 days ago',
    status: 'ready',
    videoUrl: '/demo/sample3.mp4',
    demoMode: true,
    shorts: [
      {
        id: 'short-huberman-1',
        title: 'Morning Sunlight: The 10-Minute Habit That Fixes 90% of Sleep Issues',
        description: 'View bright sunlight within 30 minutes of waking. Stimulate retinal ganglion cells to set your circadian clock. #neuroscience #sleep #focus',
        hashtags: ['#hubermanlab', '#dopamine', '#health', '#biohack', '#focus'],
        keywords: ['dopamine', 'circadian clock', 'sunlight morning', 'sleep hygiene'],
        topic: 'Neuroscience & Daily Performance',
        duration: 26,
        startTime: 0,
        endTime: 26,
        thumbnail: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&auto=format&fit=crop&q=80',
        hookText: 'Viewing morning sunlight is not wellness advice; it is cellular physics.',
        hookCategory: 'educational',
        availableHooks: [
          { category: 'educational', title: 'Cellular Physics', text: 'Viewing morning sunlight is not wellness advice; it is cellular physics.' },
          { category: 'question', title: 'Brain Fog Test', text: 'Why do you feel exhausted at 2 PM even after 8 hours of sleep?' }
        ],
        viralScore: {
          overall: 94,
          breakdown: {
            hook: 93,
            retention: 96,
            emotion: 89,
            value: 99,
            pacing: 92,
            shareability: 96,
            clarity: 98,
            contextCompleteness: 95
          },
          summary: 'Massive educational authority. High bookmark and share rate for health-conscious viewers.'
        },
        speakerPosition: 'center',
        captions: [
          {
            id: 'cap-hub-1',
            start: 0.3,
            end: 4.5,
            text: 'Within 30 to 60 minutes of waking, you MUST get natural sunlight into your eyes.',
            words: [
              { word: 'Within', start: 0.3, end: 0.6 },
              { word: '30', start: 0.6, end: 1.0 },
              { word: 'minutes,', start: 1.0, end: 1.4 },
              { word: 'you', start: 1.4, end: 1.7 },
              { word: 'MUST', start: 1.7, end: 2.3, isHighlight: true, highlightColor: '#f59e0b', scale: 1.3 },
              { word: 'get', start: 2.3, end: 2.6 },
              { word: 'SUNLIGHT', start: 2.6, end: 3.4, isHighlight: true, highlightColor: '#38bdf8' },
              { word: 'in', start: 3.4, end: 3.7 },
              { word: 'your', start: 3.7, end: 3.9 },
              { word: 'eyes.', start: 3.9, end: 4.5 }
            ]
          },
          {
            id: 'cap-hub-2',
            start: 4.8,
            end: 10.2,
            text: 'This triggers the timed release of cortisol, promoting wakefulness and focus.',
            words: [
              { word: 'This', start: 4.8, end: 5.1 },
              { word: 'triggers', start: 5.1, end: 5.6 },
              { word: 'the', start: 5.6, end: 5.8 },
              { word: 'CORTISOL', start: 5.8, end: 6.6, isHighlight: true, highlightColor: '#ec4899', scale: 1.25 },
              { word: 'pulse,', start: 6.6, end: 7.2 },
              { word: 'giving', start: 7.2, end: 7.6 },
              { word: 'you', start: 7.6, end: 7.9 },
              { word: 'intense', start: 7.9, end: 8.5 },
              { word: 'FOCUS.', start: 8.5, end: 10.2, isHighlight: true, highlightColor: '#10b981', scale: 1.2 }
            ]
          },
          {
            id: 'cap-hub-3',
            start: 10.6,
            end: 16.2,
            text: 'It also starts an internal countdown clock for melatonin release 16 hours later.',
            words: [
              { word: 'It', start: 10.6, end: 10.8 },
              { word: 'starts', start: 10.8, end: 11.3 },
              { word: 'the', start: 11.3, end: 11.5 },
              { word: 'internal', start: 11.5, end: 12.1 },
              { word: 'CLOCK', start: 12.1, end: 12.8, isHighlight: true, highlightColor: '#f59e0b', scale: 1.2 },
              { word: 'for', start: 12.8, end: 13.0 },
              { word: 'MELATONIN', start: 13.0, end: 14.2, isHighlight: true, highlightColor: '#38bdf8' },
              { word: 'sixteen', start: 14.2, end: 15.0 },
              { word: 'hours later.', start: 15.0, end: 16.2 }
            ]
          },
          {
            id: 'cap-hub-4',
            start: 16.8,
            end: 21.5,
            text: 'Do not view it through sunglasses or windows. Direct photon arrival is required.',
            words: [
              { word: 'Do', start: 16.8, end: 17.0 },
              { word: 'NOT', start: 17.0, end: 17.5, isHighlight: true, highlightColor: '#ef4444', scale: 1.25 },
              { word: 'view', start: 17.5, end: 17.8 },
              { word: 'through', start: 17.8, end: 18.2 },
              { word: 'windows.', start: 18.2, end: 19.0 },
              { word: 'Direct', start: 19.0, end: 19.6 },
              { word: 'PHOTONS', start: 19.6, end: 20.6, isHighlight: true, highlightColor: '#f59e0b', scale: 1.2 },
              { word: 'are', start: 20.6, end: 20.8 },
              { word: 'required.', start: 20.8, end: 21.5 }
            ]
          },
          {
            id: 'cap-hub-5',
            start: 22.0,
            end: 25.8,
            text: 'Do this for ten minutes every morning and your entire circadian rhythm fixes itself.',
            words: [
              { word: 'Do', start: 22.0, end: 22.2 },
              { word: 'this', start: 22.2, end: 22.4 },
              { word: 'daily', start: 22.4, end: 22.8 },
              { word: 'and', start: 22.8, end: 23.0 },
              { word: 'your', start: 23.0, end: 23.2 },
              { word: 'BRAIN', start: 23.2, end: 24.0, isHighlight: true, highlightColor: '#10b981', scale: 1.3 },
              { word: 'resets', start: 24.0, end: 24.8, isHighlight: true, highlightColor: '#38bdf8' },
              { word: 'completely.', start: 24.8, end: 25.8 }
            ]
          }
        ],
        sfxMarkers: [
          { id: 'sfx-hub-1', timestamp: 1.7, category: 'pop', soundName: 'Warning Pop', volume: 0.6 },
          { id: 'sfx-hub-2', timestamp: 6.0, category: 'hit', soundName: 'Cortisol Strike', volume: 0.7 },
          { id: 'sfx-hub-3', timestamp: 12.5, category: 'chime', soundName: 'Circadian Chime', volume: 0.65 },
          { id: 'sfx-hub-4', timestamp: 17.2, category: 'impact', soundName: 'Window Impact', volume: 0.75 },
          { id: 'sfx-hub-5', timestamp: 23.4, category: 'rise', soundName: 'Brain Energy Riser', volume: 0.8 }
        ],
        vfxMarkers: [
          { id: 'vfx-hub-1', timestamp: 1.6, duration: 1.2, type: 'zoom_punch', label: '1.2x Scientific Punch' },
          { id: 'vfx-hub-2', timestamp: 6.0, duration: 1.5, type: 'glow', label: 'Dopamine Wave Glow' },
          { id: 'vfx-hub-3', timestamp: 17.0, duration: 1.0, type: 'shake', label: 'Warning Cam Shake' },
          { id: 'vfx-hub-4', timestamp: 23.0, duration: 2.5, type: 'zoom_punch', label: 'Full Spectrum Zoom' }
        ],
        brollSuggestions: [
          {
            id: 'br-hub-1',
            timestamp: 5.0,
            duration: 4.0,
            concept: 'Bright golden sunrise over horizon stimulating retina',
            imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop&q=80',
            keyword: 'Golden Morning Sun',
            enabled: true
          }
        ]
      }
    ]
  }
];

export const CAPTION_STYLE_PRESETS = [
  {
    id: 'viral',
    name: 'Viral Bold',
    description: 'High-contrast bold font with bright yellow & cyan keyword highlights (MrBeast / Hormozi style)',
    fontFamily: 'Cabinet Grotesk',
    fontSize: 34,
    positionY: 76,
    primaryColor: '#ffffff',
    highlightColor: '#fbbf24',
    strokeColor: '#000000',
    strokeWidth: 3,
    hasShadow: true,
    wordsPerLine: 3,
    animationType: 'pop',
    uppercase: true
  },
  {
    id: 'minimal',
    name: 'Minimal Clean',
    description: 'Clean modern sans-serif with subtle fade-in and muted accents',
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 26,
    positionY: 78,
    primaryColor: '#f8fafc',
    highlightColor: '#38bdf8',
    strokeColor: 'rgba(0,0,0,0.6)',
    strokeWidth: 1,
    hasShadow: true,
    wordsPerLine: 5,
    animationType: 'fade',
    uppercase: false
  },
  {
    id: 'podcast',
    name: 'Podcast Focus',
    description: 'Centered large display text with intense speaker emphasis (Joe Rogan / Diary of a CEO)',
    fontFamily: 'Space Grotesk',
    fontSize: 32,
    positionY: 72,
    primaryColor: '#ffffff',
    highlightColor: '#ec4899',
    strokeColor: '#09090b',
    strokeWidth: 2,
    hasShadow: true,
    wordsPerLine: 4,
    animationType: 'bounce',
    uppercase: true
  },
  {
    id: 'dynamic',
    name: 'Dynamic Kinetic',
    description: 'Words pop sequentially on exact spoken syllable timing with spring scale',
    fontFamily: 'Cabinet Grotesk',
    fontSize: 36,
    positionY: 75,
    primaryColor: '#facc15',
    highlightColor: '#f43f5e',
    strokeColor: '#000000',
    strokeWidth: 3,
    hasShadow: true,
    wordsPerLine: 2,
    animationType: 'scale',
    uppercase: true
  },
  {
    id: 'cinematic',
    name: 'Cinematic Gold',
    description: 'Elegant serif with golden highlights and letter tracking',
    fontFamily: 'Cinzel',
    fontSize: 28,
    positionY: 80,
    primaryColor: '#fef08a',
    highlightColor: '#f59e0b',
    strokeColor: '#1c1917',
    strokeWidth: 2,
    hasShadow: true,
    wordsPerLine: 4,
    animationType: 'fade',
    uppercase: true
  },
  {
    id: 'gaming',
    name: 'Gaming High-Energy',
    description: 'Bungee block display with neon strokes and high-intensity bounce',
    fontFamily: 'Bungee',
    fontSize: 30,
    positionY: 70,
    primaryColor: '#22c55e',
    highlightColor: '#a855f7',
    strokeColor: '#000000',
    strokeWidth: 4,
    hasShadow: true,
    wordsPerLine: 3,
    animationType: 'bounce',
    uppercase: true
  },
  {
    id: 'professional',
    name: 'Corporate Crisp',
    description: 'High-clarity typography optimized for LinkedIn, business, and tech explainers',
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 27,
    positionY: 82,
    primaryColor: '#ffffff',
    highlightColor: '#60a5fa',
    strokeColor: '#0f172a',
    strokeWidth: 1.5,
    hasShadow: true,
    wordsPerLine: 5,
    animationType: 'highlight',
    uppercase: false
  }
];

export const SFX_CATALOG = [
  { category: 'whoosh', name: 'Subtle Whip Whoosh', icon: 'Wind', desc: 'Transitions and fast zooms' },
  { category: 'pop', name: 'Pop Accent', icon: 'Sparkles', desc: 'Keyword highlights & callouts' },
  { category: 'hit', name: 'Impact Hit', icon: 'Flame', desc: 'Punchy point emphasis' },
  { category: 'impact', name: 'Cinematic Sub Boom', icon: 'Volume2', desc: 'Deep shock revelation' },
  { category: 'click', name: 'Tactile Click', icon: 'MousePointer', desc: 'Data counters and pills' },
  { category: 'rise', name: 'Tension Pitch Riser', icon: 'TrendingUp', desc: 'Building up to the climax' },
  { category: 'glitch', name: 'Cyber Glitch', icon: 'Zap', desc: 'Controversial or error moment' },
  { category: 'notification', name: 'Chime Bell', icon: 'Bell', desc: 'Important actionable takeaway' }
];

export const MUSIC_CATALOG = [
  { id: 'm-lofi', category: 'lofi', name: 'Sunset Beats', mood: 'Calm, reflective, unobtrusive' },
  { id: 'm-energetic', category: 'energetic', name: 'Future Bass Rush', mood: 'High tempo, motivational' },
  { id: 'm-cinematic', category: 'cinematic', name: 'Interstellar Strings', mood: 'Dramatic, storytelling' },
  { id: 'm-tech', category: 'technology', name: 'Silicon Synth Pulse', mood: 'Tech, analysis, AI' },
  { id: 'm-podcast', category: 'podcast', name: 'Minimal Ambient Room', mood: 'Subtle voice companion' }
];
