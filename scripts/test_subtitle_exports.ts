import assert from 'assert';
import {
  formatSrtSubtitle,
  formatVttSubtitle,
  formatAssSubtitle,
  formatTxtSubtitle,
  formatJsonSubtitle,
} from '../src/utils/subtitleFormatter';

const sampleCaptions = [
  {
    id: 'c1',
    start: 0.5,
    end: 2.8,
    text: 'Welcome to ViralClip Studio',
    words: [
      { word: 'Welcome', start: 0.5, end: 1.1 },
      { word: 'to', start: 1.1, end: 1.3 },
      { word: 'ViralClip', start: 1.3, end: 2.0, emphasis: 'hero' },
      { word: 'Studio', start: 2.0, end: 2.8 },
    ],
  },
  {
    id: 'c2',
    start: 2.9,
    end: 5.5,
    text: 'Create viral high retention shorts',
    words: [
      { word: 'Create', start: 2.9, end: 3.4 },
      { word: 'viral', start: 3.4, end: 4.0 },
      { word: 'high', start: 4.0, end: 4.5 },
      { word: 'retention', start: 4.5, end: 5.0 },
      { word: 'shorts', start: 5.0, end: 5.5 },
    ],
  },
];

console.log('=== TESTING SUBTITLE EXPORTS (SRT, VTT, ASS, TXT, JSON) ===');

// 1. SRT
const srt = formatSrtSubtitle(sampleCaptions);
assert(srt.includes('1\n00:00:00,500 --> 00:00:02,800'), 'SRT must contain valid timestamp for first cue');
assert(srt.includes('2\n00:00:02,900 --> 00:00:05,500'), 'SRT must contain valid timestamp for second cue');
assert(srt.includes('Welcome to ViralClip Studio'), 'SRT must contain text');
console.log('✓ PASS: SRT export format verified');

// 2. VTT
const vtt = formatVttSubtitle(sampleCaptions);
assert(vtt.startsWith('WEBVTT'), 'VTT must begin with WEBVTT');
assert(vtt.includes('00:00:00.500 --> 00:00:02.800'), 'VTT must contain valid timestamp format');
assert(vtt.includes('Create viral high retention shorts'), 'VTT must contain text');
console.log('✓ PASS: VTT export format verified');

// 3. ASS
const ass = formatAssSubtitle(sampleCaptions, { fontSize: 32, primaryColor: '#ffffff', highlightColor: '#facc15' });
assert(ass.includes('[Script Info]'), 'ASS must contain [Script Info]');
assert(ass.includes('[V4+ Styles]'), 'ASS must contain [V4+ Styles]');
assert(ass.includes('[Events]'), 'ASS must contain [Events]');
assert(ass.includes('Dialogue: 0,'), 'ASS must contain Dialogue events');
console.log('✓ PASS: ASS export format verified');

// 4. TXT
const txt = formatTxtSubtitle(sampleCaptions);
assert(txt === 'Welcome to ViralClip Studio Create viral high retention shorts', 'TXT must match clean transcript');
console.log('✓ PASS: TXT export format verified');

// 5. JSON
const jsonStr = formatJsonSubtitle(sampleCaptions, { title: 'Test Short', duration: 5.5 });
const parsed = JSON.parse(jsonStr);
assert(parsed.generator === 'ViralClip Studio', 'JSON must identify generator');
assert(parsed.captions.length === 2, 'JSON must contain 2 captions');
assert(parsed.metadata.title === 'Test Short', 'JSON must preserve metadata');
console.log('✓ PASS: JSON export format verified');

console.log('=== ALL SUBTITLE EXPORT FORMATS PASSED ✓ ===');
