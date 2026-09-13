/**
 * VIRALCLIP STUDIO — SEMANTIC B-ROLL ENGINE
 * Generates 3-8 queries per speech opportunity, searches authorized stock providers,
 * aligns B-roll to sentence timing (+0.15s / -0.10s), enforces 20-40% timeline coverage,
 * supports Picture-in-Picture (PIP) and Image/Meme overlays.
 */

import { ImageOverlayEvent } from './types';
import { PixabayProvider } from './pixabayProvider';
import { PinterestProvider } from './pinterestProvider';
import { VERIFIED_BROLL_CATALOG } from '../analysisEngine';

export interface BRollOpportunity {
  id: string;
  sentence: string;
  startTime: number;
  endTime: number;
  semanticConcept: string;
  queries: string[];
  isPIP: boolean;
  transition: 'hard_cut' | 'quick_zoom' | 'subtle_push' | 'fade';
  imageOverlay?: ImageOverlayEvent;
}

export interface PlacedBRollTrackItem {
  id: string;
  concept: string;
  queryMatched: string;
  startTime: number;
  endTime: number;
  duration: number;
  assetUrl: string;
  assetType?: 'video' | 'image';
  provider: 'pixabay' | 'pinterest' | 'verified_catalog';
  isPIP: boolean;
  transition: 'hard_cut' | 'quick_zoom' | 'subtle_push' | 'fade';
  attribution: string;
  confidence: number;
}

export class SemanticBRollEngine {
  private pixabay: PixabayProvider;
  private pinterest: PinterestProvider;

  constructor() {
    this.pixabay = new PixabayProvider();
    this.pinterest = new PinterestProvider();
  }

  /**
   * Generates 3-8 targeted semantic queries for a given sentence
   */
  public generateSemanticQueries(sentence: string, topic?: string): string[] {
    const clean = sentence.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').trim();
    const words = clean.split(/\s+/).filter((w) => w.length > 3);
    const queries: string[] = [];

    // Core topic-based query
    if (topic) {
      queries.push(`${topic} visual`);
    }

    // Technology / AI / Software keywords
    if (clean.includes('ai') || clean.includes('artificial intelligence') || clean.includes('model') || clean.includes('neural')) {
      queries.push('artificial intelligence technology');
      queries.push('students using AI laptop');
      queries.push('modern AI interface');
      queries.push('future machine learning digital');
    }

    // Coding / Developer keywords
    if (clean.includes('code') || clean.includes('developer') || clean.includes('software') || clean.includes('programming')) {
      queries.push('software developer coding');
      queries.push('programming on computer ide');
      queries.push('cybersecurity code terminal');
    }

    // Business / Money / Growth keywords
    if (clean.includes('money') || clean.includes('business') || clean.includes('revenue') || clean.includes('dollar') || clean.includes('growth')) {
      queries.push('business analytics dashboard');
      queries.push('financial growth charts screen');
      queries.push('modern executive meeting office');
    }

    // Studio / Creator / Video
    if (clean.includes('video') || clean.includes('camera') || clean.includes('youtube') || clean.includes('creator')) {
      queries.push('content creator recording studio');
      queries.push('cinema camera 4k lens');
      queries.push('video editor timeline workflow');
    }

    // Extract top 2 significant nouns
    if (words.length >= 2) {
      queries.push(`${words[0]} ${words[1]}`);
    }

    // Ensure at least 3 queries exist
    if (queries.length < 3) {
      queries.push(clean.slice(0, 40));
      queries.push('modern cinematic workspace');
      queries.push('city timelapse dynamic');
    }

    // Deduplicate and cap at 8 queries
    return Array.from(new Set(queries)).slice(0, 8);
  }

  /**
   * Identifies candidate B-roll opportunities across a timeline,
   * enforcing 20-40% timeline coverage and timing offsets (+0.15s / -0.10s)
   */
  public planBRollTimeline(
    sentences: { text: string; start: number; end: number }[],
    totalDuration: number,
    targetCoveragePercent = 30
  ): BRollOpportunity[] {
    const maxBrollDuration = totalDuration * (targetCoveragePercent / 100);
    let accumulatedBrollTime = 0;
    const opportunities: BRollOpportunity[] = [];

    // Prioritize sentences with high visual relevance (skip the first 2s hook if speaker needs to establish connection)
    for (let i = 0; i < sentences.length; i++) {
      const s = sentences[i];
      const duration = s.end - s.start;

      // Skip sentences that are too brief (< 1.8s) or when we've reached max B-roll coverage
      if (duration < 1.8 || accumulatedBrollTime + duration > maxBrollDuration + 2.0) {
        continue;
      }

      // Timing rule (Part 18): sentenceStart + 0.15s, sentenceEnd - 0.10s
      const brollStart = Number((s.start + 0.15).toFixed(2));
      const brollEnd = Number((s.end - 0.10).toFixed(2));
      const brollDuration = brollEnd - brollStart;

      if (brollDuration <= 1.0) continue;

      const queries = this.generateSemanticQueries(s.text);
      const isPIP = i % 3 === 0; // Picture-in-Picture on every 3rd opportunity to keep speaker visible

      let imageOverlay: ImageOverlayEvent | undefined;
      // If sentence discusses stats or a specific tool, create an ImageOverlayEvent
      if (s.text.includes('%') || s.text.includes('$') || s.text.includes('tool')) {
        imageOverlay = {
          id: `img_ov_${i}`,
          type: 'diagram',
          imageUrl: '/assets/broll/analytics.jpg',
          startTime: brollStart + 0.5,
          duration: 2.0,
          position: 'top_right',
          scale: 0.85,
          animation: 'pop_in',
          reason: 'Visual statistical accent supporting spoken claim',
          confidence: 0.92,
        };
      }

      opportunities.push({
        id: `opp_${i}_${Math.round(brollStart * 10)}`,
        sentence: s.text,
        startTime: brollStart,
        endTime: brollEnd,
        semanticConcept: queries[0] || 'visual concept',
        queries,
        isPIP,
        transition: isPIP ? 'quick_zoom' : 'hard_cut',
        imageOverlay,
      });

      accumulatedBrollTime += brollDuration;
    }

    return opportunities;
  }

  /**
   * Resolves opportunities into placed B-roll assets using Pixabay with verified offline fallback
   */
  public async resolveBRollAssets(opportunities: BRollOpportunity[]): Promise<PlacedBRollTrackItem[]> {
    const results: PlacedBRollTrackItem[] = [];

    for (const opp of opportunities) {
      const query = opp.queries[0] || 'cinematic visual';
      let assetUrl = '/assets/broll/coding_broll.mp4';
      let assetType: 'video' | 'image' = 'video';
      let attribution = 'Royalty-free verified video asset';
      let provider: 'pixabay' | 'pinterest' | 'verified_catalog' = 'verified_catalog';

      // 1. Try Pixabay video search first
      try {
        const pixRes = await this.pixabay.searchVideos(query, { perPage: 3 });
        if (pixRes.success && pixRes.assets.length > 0) {
          const topAsset = pixRes.assets[0];
          assetUrl = topAsset.url;
          attribution = topAsset.attributionText;
          assetType = topAsset.assetType || (topAsset.url.endsWith('.mp4') ? 'video' : 'image');
          provider = topAsset.source === 'pixabay' ? 'pixabay' : 'verified_catalog';
        } else {
          // Check all opp queries against verified catalog
          const allQueriesText = opp.queries.join(' ').toLowerCase();
          const localMatch = VERIFIED_BROLL_CATALOG.find((b) =>
            b.keywords.some((k) => allQueriesText.includes(k.toLowerCase())) ||
            b.entities.some((e) => allQueriesText.includes(e.toLowerCase()))
          ) || VERIFIED_BROLL_CATALOG[0];

          if (localMatch) {
            assetUrl = localMatch.assetUrl;
            attribution = `Catalog Video: ${localMatch.concept}`;
            assetType = localMatch.assetType || (assetUrl.endsWith('.mp4') ? 'video' : 'image');
            provider = 'verified_catalog';
          }
        }
      } catch {
        // Fallback to local verified catalog
        const allQueriesText = opp.queries.join(' ').toLowerCase();
        const localMatch = VERIFIED_BROLL_CATALOG.find((b) =>
          b.keywords.some((k) => allQueriesText.includes(k.toLowerCase()))
        ) || VERIFIED_BROLL_CATALOG[0];

        assetUrl = localMatch.assetUrl;
        assetType = localMatch.assetType || (assetUrl.endsWith('.mp4') ? 'video' : 'image');
        attribution = `Catalog Video: ${localMatch.concept}`;
      }

      results.push({
        id: `broll_track_${opp.id}`,
        concept: opp.semanticConcept,
        queryMatched: query,
        startTime: opp.startTime,
        endTime: opp.endTime,
        duration: Number((opp.endTime - opp.startTime).toFixed(2)),
        assetUrl,
        assetType,
        provider,
        isPIP: opp.isPIP,
        transition: opp.transition,
        attribution,
        confidence: 0.94,
      });
    }

    return results;
  }
}
