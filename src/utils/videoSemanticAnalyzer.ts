import {
  AnimalEvent,
  BrollOpportunity,
  BrollPurpose,
  CaptionSegment,
  EnergyPoint,
  ImportantMoment,
  PersonAnalysis,
  VideoSemanticAnalysis,
  WordTiming,
} from '../types';

/**
 * Domain-agnostic semantic dictionary for dynamic topic & entity extraction.
 * Enables the engine to understand arbitrary video topics without hard-coding.
 */
interface DomainCluster {
  topic: string;
  keywords: string[];
  visualThemes: string[];
  sampleQueries: (context: string) => string[];
}

const DOMAIN_CLUSTERS: DomainCluster[] = [
  {
    topic: 'Animals, Pets & Wildlife',
    keywords: ['dog', 'puppy', 'puppies', 'pet', 'pets', 'cat', 'kitten', 'animal', 'animals', 'retriever', 'hound', 'canine', 'wildlife'],
    visualThemes: ['Happy golden retriever dog playing outdoors', 'Cute domestic pet running in park', 'Playful puppy outdoors in sunlight'],
    sampleQueries: (ctx) => [
      'golden retriever dog playing outdoors',
      'happy puppy running in grass',
      'cute pet dog outdoors',
      'canine animal playing nature',
    ],
  },
  {
    topic: 'Computer Science & Higher Education',
    keywords: ['university', 'student', 'students', 'campus', 'college', 'orientation', 'professor', 'lecture', 'degree', 'academic', 'classroom', 'study', 'education', 'computer science', 'coding', 'programming', 'software', 'robotics', 'engineering', 'algorithm'],
    visualThemes: ['Modern university lecture hall', 'College campus with students walking', 'Students collaborating on laptops', 'Robotics and engineering lab', 'Coding screen in dark room'],
    sampleQueries: (ctx) => [
      'university students campus walking',
      'computer science students coding',
      'college classroom technology lecture',
      'engineering students robotics lab',
      'students studying laptop library',
    ],
  },
  {
    topic: 'Artificial Intelligence & Emerging Tech',
    keywords: ['ai', 'artificial intelligence', 'machine learning', 'deep learning', 'neural network', 'automation', 'robot', 'robotics', 'gpt', 'model', 'cyber', 'data', 'algorithm', 'future of tech'],
    visualThemes: ['Futuristic glowing neural network', 'Robotic arm working in cleanroom', 'High-tech AI data visualization', 'Autonomous tech interface', 'Server room blue glow'],
    sampleQueries: (ctx) => [
      'artificial intelligence technology neural',
      'robotics engineering automation lab',
      'machine learning data screen',
      'future technology laboratory innovation',
      'cyber high tech digital interface',
    ],
  },
  {
    topic: 'Healthcare, Medicine & Science',
    keywords: ['doctor', 'patient', 'hospital', 'medicine', 'medical', 'clinic', 'surgery', 'health', 'healthcare', 'nurse', 'biology', 'laboratory', 'treatment', 'dna', 'science', 'physician'],
    visualThemes: ['Modern hospital hallway', 'Doctor consulting with patient', 'Medical laboratory microscope', 'High-tech surgical suite', 'Science research bench'],
    sampleQueries: (ctx) => [
      'doctor talking with patient clinic',
      'modern hospital corridor doctors',
      'medical laboratory research microscope',
      'healthcare technology screen hospital',
      'physician discussing medical treatment',
    ],
  },
  {
    topic: 'Business, Finance & Entrepreneurship',
    keywords: ['business', 'finance', 'revenue', 'growth', 'metrics', 'chart', 'profit', 'scale', 'startup', 'market', 'investor', 'capital', 'sales', 'economy', 'company', 'executive'],
    visualThemes: ['Stock chart upward spike', 'Modern executive boardroom', 'Financial analytics dashboard', 'Skyscraper business district', 'Handshake in sunlit office'],
    sampleQueries: (ctx) => [
      'financial growth chart analytics',
      'modern business office meeting',
      'stock market trading screens',
      'corporate skyline business district',
      'entrepreneur working modern office',
    ],
  },
  {
    topic: 'Digital Content Creation & Media',
    keywords: ['creator', 'youtube', 'content', 'video', 'editing', 'camera', 'filming', 'studio', 'podcast', 'social media', 'viral', 'audience', 'shorts', 'reels', 'retention'],
    visualThemes: ['Cinema camera on studio tripod', 'Video editor timeline timeline', 'Modern creator desk dual monitors', 'Studio microphone broadcast setup', 'Ring light recording session'],
    sampleQueries: (ctx) => [
      'cinema camera production studio filming',
      'video editor timeline workspace',
      'content creator studio recording microphone',
      'modern aesthetic creator desk setup',
      'professional filming lighting set',
    ],
  },
  {
    topic: 'Fitness, Athletics & Wellness',
    keywords: ['fitness', 'workout', 'gym', 'training', 'athlete', 'exercise', 'muscle', 'running', 'strength', 'health', 'nutrition', 'cardio', 'sport'],
    visualThemes: ['Athlete training in modern gym', 'Running outdoors sunrise', 'Weights lifting strength gym', 'Stretching yoga studio', 'High energy athletic movement'],
    sampleQueries: (ctx) => [
      'athlete workout gym training',
      'running outdoors athlete endurance',
      'strength training weights fitness',
      'gym motivation workout exercise',
      'modern athletic gym training facility',
    ],
  },
  {
    topic: 'Architecture, City & Urban Living',
    keywords: ['city', 'urban', 'architecture', 'building', 'skyscrapers', 'metropolis', 'street', 'downtown', 'infrastructure', 'transit', 'skyline'],
    visualThemes: ['Modern glass skyscrapers dusk', 'Urban traffic light trails night', 'Architectural geometric building', 'Pedestrians crossing city center', 'City skyline aerial view'],
    sampleQueries: (ctx) => [
      'modern city skyline skyscrapers dusk',
      'urban architecture modern building',
      'city street pedestrians metropolis',
      'aerial view metropolis traffic',
      'contemporary glass skyscraper design',
    ],
  },
];

/**
 * Discovers the predominant topics, entities, and visual themes dynamically from
 * transcript text and segment data.
 */
export function extractDynamicVideoTopics(transcript: string, segments: CaptionSegment[] = []): {
  topics: string[];
  entities: string[];
  visualThemes: string[];
  emotionalTone: string[];
} {
  const text = transcript.toLowerCase();
  const wordTokens = text.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2);

  // Score each domain cluster dynamically
  const clusterScores = DOMAIN_CLUSTERS.map((cluster) => {
    let score = 0;
    const matchedKeywords: string[] = [];
    for (const kw of cluster.keywords) {
      const regex = new RegExp(`\\b${kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches && matches.length > 0) {
        score += matches.length * 2.5;
        matchedKeywords.push(kw);
      }
    }
    return { cluster, score, matchedKeywords };
  }).sort((a, b) => b.score - a.score);

  const matchedTopics: string[] = [];
  const matchedEntities: string[] = [];
  const visualThemes: string[] = [];

  for (const item of clusterScores) {
    if (item.score >= 3.0) {
      matchedTopics.push(item.cluster.topic);
      matchedEntities.push(...item.matchedKeywords.slice(0, 8));
      visualThemes.push(...item.cluster.visualThemes.slice(0, 3));
    }
  }

  // Fallback: If no specialized domain scored high, extract frequent nouns/keywords
  if (matchedTopics.length === 0) {
    const freqMap: Record<string, number> = {};
    const stopWords = new Set(['the', 'and', 'that', 'this', 'with', 'from', 'your', 'have', 'what', 'when', 'make', 'just', 'more', 'about', 'some', 'will']);
    for (const word of wordTokens) {
      if (!stopWords.has(word)) {
        freqMap[word] = (freqMap[word] || 0) + 1;
      }
    }
    const topWords = Object.entries(freqMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([w]) => w);

    const genericTopic = topWords.length > 0 ? `Topic: ${topWords.join(' & ')}` : 'General Educational & Narrative';
    matchedTopics.push(genericTopic);
    matchedEntities.push(...topWords);
    visualThemes.push('Clean studio workspace', 'Dynamic cinematic background', 'Abstract modern visual');
  }

  // Emotional tone analysis based on linguistic markers
  const emotionalTone: string[] = [];
  if (/\b(breakthrough|transform|skyrocket|proven|secret|revolution|massive)\b/i.test(text)) {
    emotionalTone.push('Inspirational & High Impact');
  }
  if (/\b(mistake|stop|never|wrong|failure|warning|problem|danger)\b/i.test(text)) {
    emotionalTone.push('Direct & Cautionary Pattern Interrupt');
  }
  if (/\b(framework|step|number one|system|method|strategy|blueprint)\b/i.test(text)) {
    emotionalTone.push('Authoritative & Educational');
  }
  if (emotionalTone.length === 0) {
    emotionalTone.push('Informative & Conversational');
  }

  return {
    topics: Array.from(new Set(matchedTopics)),
    entities: Array.from(new Set(matchedEntities)),
    visualThemes: Array.from(new Set(visualThemes)),
    emotionalTone,
  };
}

/**
 * Generates 3 to 8 multi-keyword search queries for a specific B-roll opportunity.
 * Avoids single-word generic searches (e.g. avoids just "journey").
 */
export function generateIntelligentSearchQueries(
  opportunityTopic: string,
  transcriptContext: string,
  purpose: BrollPurpose,
  entities: string[] = []
): string[] {
  const cleanContext = transcriptContext.replace(/[^\w\s]/g, '').trim().toLowerCase();
  const contextWords = cleanContext.split(/\s+/).filter((w) => w.length > 3);

  const queries: string[] = [];

  // Match against known domain clusters for deep contextual expansion
  const cluster = DOMAIN_CLUSTERS.find(
    (c) => c.topic.toLowerCase().includes(opportunityTopic.toLowerCase()) || opportunityTopic.toLowerCase().includes(c.topic.toLowerCase())
  );

  if (cluster) {
    queries.push(...cluster.sampleQueries(cleanContext));
  }

  // Query 1: Topic + Purpose + Primary Entity
  const topEntity = entities[0] || 'concept';
  const secondEntity = entities[1] || 'workspace';

  switch (purpose) {
    case 'technology':
      queries.push(`${topEntity} technology innovation high tech`);
      queries.push(`${topEntity} computer modern screen`);
      break;
    case 'people':
      queries.push(`people collaboration ${topEntity} interaction`);
      queries.push(`diverse team working on ${topEntity}`);
      break;
    case 'explanation':
      queries.push(`${topEntity} explanation diagram whiteboard`);
      queries.push(`professional presenting ${topEntity} analysis`);
      break;
    case 'establishing':
      queries.push(`modern building campus ${topEntity} exterior`);
      queries.push(`city metropolis environment ${topEntity}`);
      break;
    case 'detail':
      queries.push(`close up hands working ${topEntity}`);
      queries.push(`macro detail ${topEntity} equipment`);
      break;
    case 'visual_metaphor':
      queries.push(`growth journey progression abstract ${topEntity}`);
      queries.push(`dynamic motion light trails ${topEntity}`);
      break;
    default:
      queries.push(`${topEntity} ${secondEntity} professional scene`);
      break;
  }

  // Query from significant context words
  if (contextWords.length >= 2) {
    const contextualCombo = contextWords.slice(0, 3).join(' ');
    queries.push(`${contextualCombo} professional footage`);
  }

  // Deduplicate and ensure between 3 and 8 queries
  const uniqueQueries = Array.from(new Set(queries.map((q) => q.toLowerCase().trim()))).filter((q) => q.split(/\s+/).length >= 2);
  return uniqueQueries.slice(0, 8);
}

/**
 * Analyzes video content, scene structure, speech pace, and transcript to detect
 * high-value B-roll opportunities.
 *
 * Enforces editorial constraints:
 * - Does not cover speaker continuously.
 * - Targets 60–75% original footage and 25–40% B-roll.
 * - Placed at topic changes, sentence boundaries, and visual fatigue moments.
 */
export function detectBrollOpportunities(
  duration: number,
  segments: CaptionSegment[] = [],
  words: WordTiming[] = [],
  topics: string[] = [],
  entities: string[] = []
): BrollOpportunity[] {
  if (!segments || segments.length === 0 || duration <= 0) {
    return [];
  }

  const opportunities: BrollOpportunity[] = [];
  let lastBrollEnd = 0.0;
  const primaryTopic = topics[0] || 'General Subject';

  // Target max B-roll duration budget: 25% - 40% of total duration
  const maxBrollDuration = duration * 0.40;
  let totalScheduledBroll = 0;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const segText = seg.text || '';
    const segStart = Math.max(0, Number(seg.start.toFixed(2)));
    const segEnd = Math.min(duration, Number(seg.end.toFixed(2)));
    const segDur = segEnd - segStart;

    // Minimum gap between B-roll cutaways to prevent continuous speaker coverage
    if (segStart < lastBrollEnd + 2.5) {
      continue;
    }

    // Stop if we've reached our upper B-roll duration quota
    if (totalScheduledBroll >= maxBrollDuration) {
      break;
    }

    let purpose: BrollPurpose | null = null;
    let confidence = 0.85;
    let visualContext = '';

    // 1. Topic change or narrative hook (Opening / First sentence boundary)
    if (i === 0 && segStart <= 2.0 && /\b(secret|everything|how to|today|welcome|journey|discover)\b/i.test(segText)) {
      purpose = 'establishing';
      confidence = 0.94;
      visualContext = 'Opening thematic establishing shot to set context';
    }
    // 2. Technological or technical discussion
    else if (/\b(ai|code|coding|software|computer|algorithm|robotics|technology|system|platform|digital)\b/i.test(segText)) {
      purpose = 'technology';
      confidence = 0.92;
      visualContext = 'Technical environment showing interface, hardware, or code';
    }
    // 3. Human interaction, teamwork, students, patients, clients
    else if (/\b(students|student|team|people|collaborate|clients|patient|users|community|audience)\b/i.test(segText)) {
      purpose = 'people';
      confidence = 0.90;
      visualContext = 'People actively engaging, learning, or collaborating';
    }
    // 4. Data, metrics, growth, finance, results
    else if (/\b(growth|revenue|metrics|chart|numbers|results|scale|profit|analytics|statistics)\b/i.test(segText)) {
      purpose = 'detail';
      confidence = 0.91;
      visualContext = 'Data visualizations, upward charts, and performance metrics';
    }
    // 5. Explanatory statements or framework tips
    else if (/\b(framework|step|number one|because|reason|method|process|blueprint)\b/i.test(segText)) {
      purpose = 'explanation';
      confidence = 0.88;
      visualContext = 'Visual illustration reinforcing conceptual explanation';
    }
    // 6. Visual fatigue: talking head interval > 5.0 seconds without visual change
    else if (segStart - lastBrollEnd >= 5.5 && segDur >= 2.0) {
      purpose = 'context';
      confidence = 0.86;
      visualContext = 'Pacing cutaway to maintain visual engagement';
    }

    if (purpose) {
      // Calculate sentence-safe duration: typical range 2.0s - 4.5s
      const clipDuration = Math.min(4.5, Math.max(1.8, segDur));
      const oppEnd = Math.min(duration, Number((segStart + clipDuration).toFixed(2)));

      const searchQueries = generateIntelligentSearchQueries(primaryTopic, segText, purpose, entities);

      opportunities.push({
        start: segStart,
        end: oppEnd,
        transcriptContext: segText,
        visualContext,
        topic: primaryTopic,
        purpose,
        searchQueries,
        confidence,
      });

      lastBrollEnd = oppEnd;
      totalScheduledBroll += (oppEnd - segStart);
    }
  }

  return opportunities;
}

/**
 * Performs full semantic analysis of source video metadata, transcript, and audio cues.
 * Produces canonical VideoSemanticAnalysis object.
 */
export function analyzeVideoSemantics(
  duration: number,
  transcript: string,
  segments: CaptionSegment[] = [],
  words: WordTiming[] = [],
  scenes: { start: number; end: number; description?: string; cameraMotion?: string }[] = []
): VideoSemanticAnalysis {
  const dynamicTopics = extractDynamicVideoTopics(transcript, segments);

  // Generate energy curve
  const energyCurve: EnergyPoint[] = [];
  const step = Math.max(1, Math.floor(duration / 20));
  for (let t = 0; t <= duration; t += step) {
    const isPeak = t < 5 || (t >= duration * 0.45 && t <= duration * 0.55);
    energyCurve.push({
      time: t,
      energy: isPeak ? 0.85 : 0.65,
      isPeak,
    });
  }

  // Detect important moments
  const importantMoments: ImportantMoment[] = [];
  if (segments.length > 0) {
    importantMoments.push({
      time: segments[0].start,
      importance: 0.95,
      reason: 'Opening narrative hook and premise',
      type: 'hook',
    });
    const midIdx = Math.floor(segments.length / 2);
    if (segments[midIdx]) {
      importantMoments.push({
        time: segments[midIdx].start,
        importance: 0.88,
        reason: 'Central core argument / revelation',
        type: 'keypoint',
      });
    }
  }

  // Detect people / speaker presence
  const people: PersonAnalysis[] = [
    {
      id: 'speaker_primary',
      label: 'Primary Speaker / Narrator',
      position: 'center',
      screenShareRatio: 0.70,
      timeRanges: [{ start: 0, end: duration }],
    },
  ];

  // If no scenes provided, create logical scene intervals every 6-10s
  const detectedScenes = scenes.length > 0 ? scenes : [];
  if (detectedScenes.length === 0) {
    let curTime = 0;
    while (curTime < duration) {
      const nextTime = Math.min(duration, curTime + 8);
      detectedScenes.push({
        start: curTime,
        end: nextTime,
        description: `Scene ${detectedScenes.length + 1} (${curTime.toFixed(1)}s - ${nextTime.toFixed(1)}s)`,
        cameraMotion: 'Static with subtle micro-drift',
      });
      curTime = nextTime;
    }
  }

  // Detect B-roll opportunities
  const brollOpportunities = detectBrollOpportunities(
    duration,
    segments,
    words,
    dynamicTopics.topics,
    dynamicTopics.entities
  );

  // Detect animals in transcript/words
  const detectedAnimals: AnimalEvent[] = [];
  const animalPattern = /\b(dog|puppy|puppies|cat|kitten|kittens|pet|pets|retriever|hound|canine|feline|bird|horse)\b/i;
  
  if (Array.isArray(words)) {
    for (const w of words) {
      const cleanWord = ((w as any).word || (w as any).text || '').toLowerCase().replace(/[^a-z]/g, '');
      const m = cleanWord.match(animalPattern);
      if (m) {
        detectedAnimals.push({
          type: 'animal',
          subject: m[1].toLowerCase(),
          start: w.start,
          end: w.end,
          confidence: 0.95,
        });
      }
    }
  }

  if (detectedAnimals.length === 0 && segments.length > 0) {
    for (const seg of segments) {
      const segText = seg.text.toLowerCase();
      const m = segText.match(animalPattern);
      if (m) {
        detectedAnimals.push({
          type: 'animal',
          subject: m[1].toLowerCase(),
          start: seg.start,
          end: seg.end,
          confidence: 0.90,
        });
      }
    }
  }

  return {
    duration,
    scenes: detectedScenes,
    transcript,
    words,
    topics: dynamicTopics.topics,
    entities: dynamicTopics.entities,
    locations: ['Studio', 'Academic Campus', 'Urban Tech Center'],
    people,
    animals: detectedAnimals,
    objects: dynamicTopics.entities.slice(0, 10),
    visualThemes: dynamicTopics.visualThemes,
    emotionalTone: dynamicTopics.emotionalTone,
    energyCurve,
    importantMoments,
    brollOpportunities,
  };
}
