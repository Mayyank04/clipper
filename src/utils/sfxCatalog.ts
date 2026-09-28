import { SFXAsset, SFXCategory } from '../types';
import { SFX_LIBRARY } from '../data/sfxLibrary';

export const SFX_CATEGORIES: { id: SFXCategory; label: string; icon: string; description: string }[] = [
  { id: 'impact', label: 'Impact', icon: '💥', description: 'Heavy hits, cinematic drops, slams' },
  { id: 'whoosh', label: 'Whoosh', icon: '💨', description: 'Fast transitions, air swipes, whips' },
  { id: 'hit', label: 'Hit', icon: '🥊', description: 'Punchy strikes, snare accents, beats' },
  { id: 'swoosh', label: 'Swoosh', icon: '🌪️', description: 'Smooth air sweeps, glides, rushes' },
  { id: 'transition', label: 'Transition', icon: '🔄', description: 'Scene switchers, swooshes, passes' },
  { id: 'riser', label: 'Riser', icon: '📈', description: 'Tension builders, pitch sweeps, swells' },
  { id: 'drop', label: 'Drop', icon: '📉', description: 'Pitch falls, gravity drops, bass thuds' },
  { id: 'boom', label: 'Boom', icon: '💣', description: 'Deep explosions, sub rumbles, shocks' },
  { id: 'click', label: 'Click', icon: '🖱️', description: 'Mouse clicks, button taps, switches' },
  { id: 'pop', label: 'Pop', icon: '🫧', description: 'Bubble pops, cork clicks, light accents' },
  { id: 'digital', label: 'Digital', icon: '💾', description: 'Computer telemetry, modem handshake, synth beep' },
  { id: 'glitch', label: 'Glitch', icon: '⚡', description: 'Digital stutter, pixel distortion, data corruption' },
  { id: 'ui', label: 'UI', icon: '📱', description: 'Interface beeps, toggles, interactions' },
  { id: 'chime', label: 'Chime', icon: '🎐', description: 'Crystal bells, glass dings, insights' },
  { id: 'notification', label: 'Notification', icon: '🔔', description: 'Pleasant bells, message chimes' },
  { id: 'laugh', label: 'Laugh', icon: '😂', description: 'Chuckle, snicker, comedic reaction' },
  { id: 'reaction', label: 'Reaction', icon: '😲', description: 'Wow rise, huh dips, surprise vocal accents' },
  { id: 'tension', label: 'Tension', icon: '⏳', description: 'Heartbeat thumps, ticking clocks, drones' },
  { id: 'dramatic', label: 'Dramatic', icon: '🎭', description: 'Orchestral stings, ominous brass, twists' },
  { id: 'comedy', label: 'Comedy', icon: '🤡', description: 'Boings, slide whistles, goofy pops, bonks' },
  { id: 'meme', label: 'Meme', icon: '🤪', description: 'Airhorn, record scratch, vine booms' },
  { id: 'sports', label: 'Sports', icon: '⚽', description: 'Whistles, buzzers, crowd cheers' },
  { id: 'gaming', label: 'Gaming', icon: '🎮', description: '8-bit coins, level ups, power ups' },
  { id: 'cinematic', label: 'Cinematic', icon: '🎬', description: 'Trailer braams, orchestral hits, atmospheric drops' },
  { id: 'success', label: 'Success', icon: '✅', description: 'Victory fanfare, chime ding, affirmative chord' },
  { id: 'failure', label: 'Failure', icon: '❌', description: 'Womp womp, error buzz, descending slide' },
  { id: 'alert', label: 'Alert', icon: '🚨', description: 'Warning siren, klaxon, caution pulse' },
  { id: 'camera', label: 'Camera', icon: '📷', description: 'DSLR shutter, flash strobe, film advance' },
  { id: 'typewriter', label: 'Typewriter', icon: '⌨️', description: 'Mechanical keys, carriage bell, clacks' },
  { id: 'mouse', label: 'Mouse', icon: '🖱️', description: 'Precision mouse clicks and scroll wheels' },
  { id: 'keyboard', label: 'Keyboard', icon: '💻', description: 'Mechanical typing bursts and enter clicks' },
  { id: 'record_scratch', label: 'Record Scratch', icon: '💿', description: 'Vinyl stops, rewind rewinds, freeze frames' },
  { id: 'heartbeat', label: 'Heartbeat', icon: '💓', description: 'Deep visceral pulses and adrenaline thuds' },
  { id: 'bass', label: 'Bass', icon: '🔊', description: 'Deep 808 drops, sub thumps, low rumbles' },
  { id: 'sub_drop', label: 'Sub Drop', icon: '🔉', description: 'Deep downward sweeps and sub thumps' },
  { id: 'air', label: 'Air', icon: '🌬️', description: 'Hydraulic releases, wind rushes, air puffs' },
  { id: 'foley', label: 'Foley', icon: '📦', description: 'Fabric movement, paper slides, wood thumps' },
];

// Helper to generate a realistic waveform array (values 0.1 to 1.0)
function generateSyntheticWaveform(seed: string, length = 32): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  const result: number[] = [];
  for (let i = 0; i < length; i++) {
    const angle = (i / length) * Math.PI * 2;
    const wave = Math.abs(Math.sin(angle * (1 + (Math.abs(h + i * 17) % 3))));
    const decay = Math.exp(-i / (length * 0.55));
    const val = Math.max(0.08, Math.min(1.0, wave * decay + 0.12));
    result.push(Number(val.toFixed(2)));
  }
  return result;
}

// Built-in verified SFX Library catalog (each mapped to a real audio asset)
const LEGACY_SFX_CATALOG: SFXAsset[] = [
  // 1. IMPACT
  {
    id: 'sfx_impact_sub_bass',
    name: 'Sub-Bass Cinematic Boom',
    file: '/assets/sfx/impact.wav',
    duration: 1.8,
    category: 'impact',
    tags: ['impact', 'boom', 'sub bass', 'cinematic', 'slam', 'drop', 'heavy', 'shock'],
    description: 'Deep sub-bass cinematic impact designed for breakthrough revelations and climax hooks.',
    source: 'bundled',
    license: 'Royalty-free',
    hash: 'h_impact_01',
    waveform: generateSyntheticWaveform('sfx_impact_sub_bass'),
    loudness: -14.2,
    sampleRate: 44100,
    channels: 2,
  },
  {
    id: 'sfx_hit_heavy',
    name: 'Heavy Cinematic Hit',
    file: '/assets/sfx/hit.wav',
    duration: 0.9,
    category: 'hit',
    tags: ['hit', 'strike', 'punch', 'cinematic', 'snare', 'accent', 'beat'],
    description: 'Crisp, punchy mid-range strike for framing pivotal bullet points and key takeaways.',
    source: 'bundled',
    license: 'Royalty-free',
    hash: 'h_hit_01',
    waveform: generateSyntheticWaveform('sfx_hit_heavy'),
    loudness: -13.8,
    sampleRate: 44100,
    channels: 2,
  },
  // 2. WHOOSH & TRANSITION
  {
    id: 'sfx_whoosh_swift',
    name: 'Swift Air Whoosh',
    file: '/assets/sfx/whoosh.wav',
    duration: 0.6,
    category: 'whoosh',
    tags: ['whoosh', 'transition', 'swoosh', 'swipe', 'air', 'whip', 'fast', 'movement'],
    description: 'Fast, smooth dynamic air swipe tailored for rapid scene cutaways and slide-ins.',
    source: 'bundled',
    license: 'Royalty-free',
    hash: 'h_whoosh_01',
    waveform: generateSyntheticWaveform('sfx_whoosh_swift'),
    loudness: -15.5,
    sampleRate: 44100,
    channels: 2,
  },
  {
    id: 'sfx_transition_sweep',
    name: 'Dynamic Scene Sweep',
    file: '/assets/sfx/whoosh.wav',
    duration: 0.8,
    category: 'transition',
    tags: ['transition', 'sweep', 'scene', 'camera', 'movement', 'shift'],
    description: 'Broadband kinetic sweep accentuating angle cuts and split-screen reveals.',
    source: 'bundled',
    license: 'Royalty-free',
    hash: 'h_transition_01',
    waveform: generateSyntheticWaveform('sfx_transition_sweep'),
    loudness: -15.0,
    sampleRate: 44100,
    channels: 2,
  },
  // 3. RISER & SUSPENSE
  {
    id: 'sfx_riser_tension',
    name: 'Tension Pitch Riser',
    file: '/assets/sfx/riser.wav',
    duration: 1.5,
    category: 'riser',
    tags: ['riser', 'tension', 'suspense', 'pitch', 'swell', 'climax', 'anticipation'],
    description: 'Exponential pitch riser that builds intense narrative tension right before a plot twist.',
    source: 'bundled',
    license: 'Royalty-free',
    hash: 'h_riser_01',
    waveform: generateSyntheticWaveform('sfx_riser_tension'),
    loudness: -16.1,
    sampleRate: 44100,
    channels: 2,
  },
  {
    id: 'sfx_suspense_clock',
    name: 'Dramatic Ticking Suspense',
    file: '/assets/sfx/click.wav',
    duration: 1.2,
    category: 'suspense',
    tags: ['suspense', 'clock', 'tick', 'time', 'countdown', 'anticipation'],
    description: 'Precise acoustic clock ticking indicating urgency and countdown moments.',
    source: 'bundled',
    license: 'Royalty-free',
    hash: 'h_suspense_01',
    waveform: generateSyntheticWaveform('sfx_suspense_clock'),
    loudness: -17.5,
    sampleRate: 44100,
    channels: 2,
  },
  // 4. POP, CLICK & UI
  {
    id: 'sfx_pop_bubble',
    name: 'Bubble Pop Accent',
    file: '/assets/sfx/pop.wav',
    duration: 0.35,
    category: 'pop',
    tags: ['pop', 'bubble', 'cork', 'light', 'accent', 'friendly', 'stat', 'badge'],
    description: 'Organic bubble pop designed for kinetic caption pops, badges, and stats.',
    source: 'bundled',
    license: 'Royalty-free',
    hash: 'h_pop_01',
    waveform: generateSyntheticWaveform('sfx_pop_bubble'),
    loudness: -16.8,
    sampleRate: 44100,
    channels: 2,
  },
  {
    id: 'sfx_click_switch',
    name: 'Tactile Mechanical Click',
    file: '/assets/sfx/click.wav',
    duration: 0.15,
    category: 'click',
    tags: ['click', 'switch', 'tap', 'ui', 'button', 'mouse', 'mechanical'],
    description: 'Crisp micro-transient click highlighting toggles, buttons, and chapter jumps.',
    source: 'bundled',
    license: 'Royalty-free',
    hash: 'h_click_01',
    waveform: generateSyntheticWaveform('sfx_click_switch'),
    loudness: -18.0,
    sampleRate: 44100,
    channels: 2,
  },
  {
    id: 'sfx_ui_beep',
    name: 'Digital UI Affirmation',
    file: '/assets/sfx/click.wav',
    duration: 0.25,
    category: 'ui',
    tags: ['ui', 'beep', 'interface', 'software', 'tech', 'select'],
    description: 'Sleek interface chime for digital product walk-throughs and screen tutorials.',
    source: 'bundled',
    license: 'Royalty-free',
    hash: 'h_ui_01',
    waveform: generateSyntheticWaveform('sfx_ui_beep'),
    loudness: -17.2,
    sampleRate: 44100,
    channels: 2,
  },
  // 5. NOTIFICATION & SUCCESS
  {
    id: 'sfx_notification_chime',
    name: 'Harmonic Glass Chime',
    file: '/assets/sfx/chime.wav',
    duration: 1.0,
    category: 'notification',
    tags: ['notification', 'chime', 'bell', 'glass', 'alert', 'message', 'sparkle'],
    description: 'Harmonious crystal chime for alerts, subscriber callouts, and key lessons.',
    source: 'bundled',
    license: 'Royalty-free',
    hash: 'h_chime_01',
    waveform: generateSyntheticWaveform('sfx_notification_chime'),
    loudness: -15.8,
    sampleRate: 44100,
    channels: 2,
  },
  {
    id: 'sfx_success_sparkle',
    name: 'Victory Affirmation Chime',
    file: '/assets/sfx/chime.wav',
    duration: 1.1,
    category: 'success',
    tags: ['success', 'victory', 'win', 'achievement', 'chime', 'affirmation'],
    description: 'Uplifting harmonic resolution for triumphant milestones and solved problems.',
    source: 'bundled',
    license: 'Royalty-free',
    hash: 'h_success_01',
    waveform: generateSyntheticWaveform('sfx_success_sparkle'),
    loudness: -15.2,
    sampleRate: 44100,
    channels: 2,
  },
  // 6. GLITCH & DIGITAL
  {
    id: 'sfx_glitch_stutter',
    name: 'Digital Data Glitch',
    file: '/assets/sfx/glitch.wav',
    duration: 0.45,
    category: 'glitch',
    tags: ['glitch', 'digital', 'stutter', 'static', 'error', 'distortion', 'cyber', 'interrupt'],
    description: 'Bite-sized electronic stutter for myth-busting, warnings, and pattern interrupts.',
    source: 'bundled',
    license: 'Royalty-free',
    hash: 'h_glitch_01',
    waveform: generateSyntheticWaveform('sfx_glitch_stutter'),
    loudness: -14.9,
    sampleRate: 44100,
    channels: 2,
  },
  {
    id: 'sfx_digital_telemetry',
    name: 'Cybernetic Telemetry',
    file: '/assets/sfx/glitch.wav',
    duration: 0.5,
    category: 'digital',
    tags: ['digital', 'telemetry', 'computer', 'code', 'data', 'processing', 'ai'],
    description: 'Rapid high-tech data packet burst matching code displays and AI demonstrations.',
    source: 'bundled',
    license: 'Royalty-free',
    hash: 'h_digital_01',
    waveform: generateSyntheticWaveform('sfx_digital_telemetry'),
    loudness: -16.0,
    sampleRate: 44100,
    channels: 2,
  },
  // 7. COMEDY & MEME
  {
    id: 'sfx_comedy_boing',
    name: 'Spring Boing Accent',
    file: '/assets/sfx/pop.wav',
    duration: 0.6,
    category: 'comedy',
    tags: ['comedy', 'boing', 'funny', 'cartoon', 'bounce', 'goofy', 'meme', 'bonk'],
    description: 'Playful cartoon spring boing for humorous mishaps and self-deprecating remarks.',
    source: 'bundled',
    license: 'Royalty-free',
    hash: 'h_comedy_01',
    waveform: generateSyntheticWaveform('sfx_comedy_boing'),
    loudness: -15.4,
    sampleRate: 44100,
    channels: 2,
  },
  {
    id: 'sfx_meme_vine_boom',
    name: 'Bass Meme Thud',
    file: '/assets/sfx/impact.wav',
    duration: 1.5,
    category: 'meme',
    tags: ['meme', 'vine boom', 'funny', 'thud', 'bass', 'ironic', 'shock', 'stare'],
    description: 'Iconic exaggerated bass boom for comedic pauses, stare-downs, and irony.',
    source: 'bundled',
    license: 'Royalty-free',
    hash: 'h_meme_01',
    waveform: generateSyntheticWaveform('sfx_meme_vine_boom'),
    loudness: -13.5,
    sampleRate: 44100,
    channels: 2,
  },
  // 8. CINEMATIC & BASS
  {
    id: 'sfx_cinematic_braam',
    name: 'Cinematic Low Braam',
    file: '/assets/sfx/impact.wav',
    duration: 2.2,
    category: 'cinematic',
    tags: ['cinematic', 'braam', 'trailer', 'sub', 'epic', 'deep', 'movie'],
    description: 'Deep brassy cinematic braam creating high-stakes trailer atmosphere.',
    source: 'bundled',
    license: 'Royalty-free',
    hash: 'h_cinematic_01',
    waveform: generateSyntheticWaveform('sfx_cinematic_braam'),
    loudness: -14.0,
    sampleRate: 44100,
    channels: 2,
  },
  {
    id: 'sfx_bass_drop',
    name: 'Sub-Frequency 808 Drop',
    file: '/assets/sfx/impact.wav',
    duration: 1.6,
    category: 'bass',
    tags: ['bass', '808', 'drop', 'sub', 'low', 'rumble', 'frequency'],
    description: 'Pristine sine 808 drop providing maximum visceral weight on beat drops.',
    source: 'bundled',
    license: 'Royalty-free',
    hash: 'h_bass_01',
    waveform: generateSyntheticWaveform('sfx_bass_drop'),
    loudness: -13.9,
    sampleRate: 44100,
    channels: 2,
  },
  // 9. REVEAL & MAGIC
  {
    id: 'sfx_magic_sparkle',
    name: 'Fairy Sparkle Shimmer',
    file: '/assets/sfx/chime.wav',
    duration: 1.2,
    category: 'magic',
    tags: ['magic', 'sparkle', 'glitter', 'shimmer', 'wand', 'mystic', 'reveal'],
    description: 'High frequency crystalline cascade for product reveals and transformations.',
    source: 'bundled',
    license: 'Royalty-free',
    hash: 'h_magic_01',
    waveform: generateSyntheticWaveform('sfx_magic_sparkle'),
    loudness: -16.5,
    sampleRate: 44100,
    channels: 2,
  },
  {
    id: 'sfx_reveal_curtain',
    name: 'Spotlight Reveal Swell',
    file: '/assets/sfx/riser.wav',
    duration: 1.4,
    category: 'reveal',
    tags: ['reveal', 'curtain', 'spotlight', 'announcement', 'swell', 'intro'],
    description: 'Anticipatory swell resolving into a clean sonic spotlight.',
    source: 'bundled',
    license: 'Royalty-free',
    hash: 'h_reveal_01',
    waveform: generateSyntheticWaveform('sfx_reveal_curtain'),
    loudness: -15.8,
    sampleRate: 44100,
    channels: 2,
  },
  // 10. ALERT & FAILURE
  {
    id: 'sfx_alert_pulse',
    name: 'Caution Klaxon Pulse',
    file: '/assets/sfx/glitch.wav',
    duration: 0.7,
    category: 'alert',
    tags: ['alert', 'warning', 'klaxon', 'caution', 'alarm', 'danger', 'siren'],
    description: 'Urgent twin-tone siren warning viewers of critical mistakes or danger.',
    source: 'bundled',
    license: 'Royalty-free',
    hash: 'h_alert_01',
    waveform: generateSyntheticWaveform('sfx_alert_pulse'),
    loudness: -14.5,
    sampleRate: 44100,
    channels: 2,
  },
  {
    id: 'sfx_failure_buzz',
    name: 'Error Buzz Descents',
    file: '/assets/sfx/glitch.wav',
    duration: 0.8,
    category: 'failure',
    tags: ['failure', 'error', 'buzz', 'womp', 'wrong', 'mistake', 'lose'],
    description: 'Dissonant low frequency buzzer signaling an incorrect answer or fail state.',
    source: 'bundled',
    license: 'Royalty-free',
    hash: 'h_failure_01',
    waveform: generateSyntheticWaveform('sfx_failure_buzz'),
    loudness: -15.0,
    sampleRate: 44100,
    channels: 2,
  },
];
 
// Built-in verified SFX Library catalog (111 verified procedural and curated assets)
export const BUILTIN_SFX_CATALOG: SFXAsset[] = SFX_LIBRARY.map((item) => ({
  id: item.id,
  name: item.name,
  file: item.file,
  duration: item.duration,
  category: item.category.toLowerCase() as SFXCategory,
  tags: item.tags,
  description: `${item.name} (${item.category}): optimized for ${item.recommendedTriggers.join(', ')}.`,
  source: 'bundled' as const,
  license: 'Royalty-free' as const,
  hash: `hash_${item.id}`,
  waveform: generateSyntheticWaveform(item.id),
  loudness: -14.5,
  sampleRate: 44100,
  channels: 2,
}));

// Semantic Synonym Map for Search
const SYNONYM_MAP: Record<string, string[]> = {
  impact: ['boom', 'slam', 'hit', 'blast', 'drop', 'cinematic', 'explosion', 'thud', 'crash'],
  whoosh: ['swoosh', 'swipe', 'transition', 'whip', 'air', 'pass', 'fast', 'speed'],
  funny: ['comedy', 'meme', 'boing', 'womp', 'bonk', 'laugh', 'cartoon', 'goofy', 'joke'],
  comedy: ['funny', 'meme', 'boing', 'womp', 'bonk', 'laugh', 'cartoon', 'humor'],
  transition: ['whoosh', 'swipe', 'swoosh', 'riser', 'cut', 'switch', 'scene'],
  digital: ['tech', 'cyber', 'glitch', 'code', 'ui', 'computer', 'telemetry', 'click'],
  tech: ['digital', 'cyber', 'code', 'telemetry', 'computer', 'interface'],
  success: ['win', 'victory', 'achievement', 'chime', 'applause', 'celebration'],
  fail: ['failure', 'error', 'buzz', 'womp', 'wrong', 'mistake', 'loss'],
  failure: ['fail', 'error', 'buzz', 'womp', 'wrong', 'mistake'],
  danger: ['alert', 'warning', 'alarm', 'klaxon', 'horror', 'siren'],
  warning: ['alert', 'danger', 'alarm', 'klaxon', 'caution'],
  magic: ['sparkle', 'shimmer', 'glitter', 'reveal', 'wand', 'chime'],
  cinematic: ['epic', 'trailer', 'braam', 'movie', 'orchestral', 'dramatic'],
  urgent: ['suspense', 'ticking', 'countdown', 'clock', 'riser', 'heartbeat'],
};

// Multi-Factor Semantic Search for SFX Library
export function searchSFXCatalog(
  catalog: SFXAsset[],
  query: string,
  categoryFilter?: string,
  sourceFilter?: 'all' | 'favorites' | 'user' | 'generated'
): SFXAsset[] {
  const cleanQ = query.trim().toLowerCase();

  return catalog.filter((asset) => {
    // 1. Source filtering
    if (sourceFilter === 'favorites' && !asset.isFavorite) return false;
    if (sourceFilter === 'user' && asset.source !== 'user_imported' && asset.source !== 'google_drive') return false;
    if (sourceFilter === 'generated' && asset.source !== 'ai_generated') return false;

    // 2. Category filtering
    if (categoryFilter && categoryFilter !== 'all' && asset.category !== categoryFilter) {
      return false;
    }

    if (!cleanQ) return true;

    // 3. Direct full query match
    const assetName = asset.name.toLowerCase();
    const assetCat = asset.category.toLowerCase();
    const assetDesc = (asset.description || '').toLowerCase();
    const assetTags = asset.tags.map((t) => t.toLowerCase());

    if (
      assetName.includes(cleanQ) ||
      assetCat.includes(cleanQ) ||
      assetDesc.includes(cleanQ) ||
      assetTags.some((t) => t.includes(cleanQ))
    ) {
      return true;
    }

    // 4. Tokenized word-level match (for multi-word queries like "whoosh transition")
    const tokens = cleanQ.split(/\s+/).filter((t) => t.length > 1);
    if (tokens.length > 1) {
      const allTokensMatch = tokens.every(
        (tok) =>
          assetName.includes(tok) ||
          assetCat.includes(tok) ||
          assetDesc.includes(tok) ||
          assetTags.some((t) => t.includes(tok))
      );
      if (allTokensMatch) return true;
    }

    // 5. Synonym expansion match
    for (const [key, synonyms] of Object.entries(SYNONYM_MAP)) {
      const queryMatchesKey = cleanQ.includes(key) || tokens.some((tok) => tok === key);
      const queryMatchesSynonym = synonyms.some((s) => cleanQ.includes(s) || tokens.some((tok) => tok === s));

      if (queryMatchesKey || queryMatchesSynonym) {
        const matchesAsset =
          assetCat.includes(key) ||
          assetTags.some((t) => t === key || synonyms.includes(t)) ||
          assetName.includes(key) ||
          synonyms.some((s) => assetName.includes(s) || assetTags.some((t) => t.includes(s)));
        if (matchesAsset) return true;
      }
    }

    return false;
  });
}

// Library-First Matching Strategy
// Evaluates semantic match between speech trigger and existing library assets.
// Returns { asset, libraryMatchScore }. If score >= 0.80, use library asset; else consider AI generation.
export function findBestLibraryMatch(
  catalog: SFXAsset[],
  triggerText: string,
  categoryHint: SFXCategory,
  emotionHint?: string
): { asset: SFXAsset | null; libraryMatchScore: number; reason: string } {
  const cleanText = triggerText.toLowerCase();
  let bestAsset: SFXAsset | null = null;
  let highestScore = 0;
  let matchReason = '';

  for (const asset of catalog) {
    let score = 0;

    // Category affinity (0.45 weight)
    if (asset.category === categoryHint) {
      score += 0.45;
    }

    // Direct tag match (0.35 weight)
    let tagMatches = 0;
    for (const tag of asset.tags) {
      if (cleanText.includes(tag.toLowerCase())) {
        tagMatches++;
      }
    }
    if (tagMatches > 0) {
      score += Math.min(0.35, tagMatches * 0.18);
    }

    // Emotion hint match (0.15 weight)
    if (emotionHint && asset.tags.some((t) => t.toLowerCase().includes(emotionHint.toLowerCase()))) {
      score += 0.15;
    }

    // Name match (0.05 weight)
    const nameWords = asset.name.toLowerCase().split(/\s+/);
    if (nameWords.some((w) => w.length > 3 && cleanText.includes(w))) {
      score += 0.05;
    }

    if (score > highestScore) {
      highestScore = score;
      bestAsset = asset;
      matchReason = `Library match on category "${asset.category}" with ${tagMatches} matching keywords`;
    }
  }

  return {
    asset: bestAsset,
    libraryMatchScore: Number(highestScore.toFixed(2)),
    reason: matchReason || 'Standard library audio asset',
  };
}

// Smart Prompt Constructor (Section 17)
// Builds rich, detailed generation prompt: Subject, Action, Environment, Emotion, Duration, Intensity, Style
export function buildSmartSFXPrompt(params: {
  triggerText: string;
  category: SFXCategory;
  duration?: number;
  intensity?: 'low' | 'medium' | 'high';
  style?: string;
}): string {
  const dur = params.duration || 2.0;
  const int = params.intensity || 'high';
  const st = params.style || 'Cinematic';

  switch (params.category) {
    case 'impact':
    case 'cinematic':
    case 'bass':
      return `Short ${st.toLowerCase()} impact sound, deep sub bass boom with a punchy transient attack, dramatic reveal, intense ${int} energy, clean release, ${dur.toFixed(1)} seconds, tailored for a vertical YouTube Short.`;
    case 'whoosh':
    case 'transition':
      return `Kinetic aerodynamic whoosh swipe, smooth air movement, modern dynamic motion accent, ${int} velocity, clean stereo imaging, ${dur.toFixed(1)} seconds.`;
    case 'riser':
    case 'suspense':
      return `Tension-building audio riser, ascending tonal pitch sweep with subtle harmonic texture, dramatic crescendo leading to an abrupt cutoff, ${int} intensity, ${dur.toFixed(1)} seconds.`;
    case 'glitch':
    case 'digital':
      return `Micro digital glitch artifact, electronic stutter with pixelated distortion, cybernetic data interrupt accent, ${int} intensity, crisp high frequencies, ${dur.toFixed(1)} seconds.`;
    case 'comedy':
    case 'meme':
      return `Playful comedy sound effect inspired by "${params.triggerText}", cartoon timing with bouncy acoustic timbre, goofy punchline accent, ${dur.toFixed(1)} seconds.`;
    case 'magic':
    case 'success':
    case 'notification':
      return `Crystalline harmonic chime cascade, uplifting resolution chord, radiant shimmer, ${int} presence, clean decay, ${dur.toFixed(1)} seconds.`;
    default:
      return `Clean sound effect for "${params.triggerText}", ${st.toLowerCase()} style, ${int} intensity, ${dur.toFixed(1)} seconds, high fidelity vertical short audio asset.`;
  }
}
