/**
 * VIRALCLIP STUDIO — PINTEREST PROVIDER
 * Official Pinterest API Compliance (https://developers.pinterest.com/)
 * 
 * Strict Compliance Rules:
 * 1. Zero web scraping or cookie collection.
 * 2. Requires approved developer OAuth application and bearer token.
 * 3. Video URLs require special API access permissions.
 * 4. If credentials are missing or unauthorized, reports STATUS = CONFIGURATION_REQUIRED
 *    and cascades to Pixabay/verified catalog.
 */

import { AssetProvenance } from './types';

export interface PinterestProviderStatus {
  status: 'READY' | 'CONFIGURATION_REQUIRED' | 'ACCESS_RESTRICTED';
  message: string;
  hasOAuthToken: boolean;
}

export class PinterestProvider {
  private accessToken: string;
  private readonly baseUrl = 'https://api.pinterest.com/v5';

  constructor(accessToken?: string) {
    this.accessToken = (accessToken || process.env.PINTEREST_ACCESS_TOKEN || '').trim();
  }

  public getStatus(): PinterestProviderStatus {
    if (!this.accessToken) {
      return {
        status: 'CONFIGURATION_REQUIRED',
        hasOAuthToken: false,
        message: 'Pinterest API OAuth access token not configured (PINTEREST_ACCESS_TOKEN). Set in .env to enable authorized Pinterest pins.',
      };
    }
    return {
      status: 'READY',
      hasOAuthToken: true,
      message: 'Pinterest API connected with authorized bearer token.',
    };
  }

  /**
   * Searches authorized pins via official API. Never scrapes.
   */
  public async searchAuthorizedPins(query: string): Promise<{
    success: boolean;
    status: PinterestProviderStatus['status'];
    items: AssetProvenance[];
    message: string;
  }> {
    const providerStatus = this.getStatus();

    if (providerStatus.status !== 'READY') {
      return {
        success: false,
        status: providerStatus.status,
        items: [],
        message: providerStatus.message,
      };
    }

    try {
      const res = await fetch(`${this.baseUrl}/search/pins?query=${encodeURIComponent(query)}&page_size=10`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.status === 401 || res.status === 403) {
        return {
          success: false,
          status: 'ACCESS_RESTRICTED',
          items: [],
          message: 'Pinterest token expired or lacks video/pin search scopes. Reauthorization required.',
        };
      }

      if (!res.ok) {
        return {
          success: false,
          status: 'ACCESS_RESTRICTED',
          items: [],
          message: `Pinterest API error HTTP ${res.status}: ${res.statusText}`,
        };
      }

      const data = await res.json();
      const items: AssetProvenance[] = (data.items || []).map((pin: any) => ({
        id: `pinterest_${pin.id}`,
        source: 'pinterest',
        providerName: 'Pinterest Official API',
        license: 'Pinterest Authorized API Access',
        url: pin.media?.images?.['1200x']?.url || pin.link,
        author: pin.board_owner?.username || 'Pinterest Creator',
        downloadedAt: Date.now(),
        hash: `pinterest_${pin.id}`,
        duration: 5.0,
        resolution: {
          width: pin.media?.images?.['1200x']?.width || 1080,
          height: pin.media?.images?.['1200x']?.height || 1920,
        },
        attributionRequired: true,
        attributionText: `Pin by ${pin.board_owner?.username || 'Pinterest Creator'} via Pinterest API`,
      }));

      return {
        success: true,
        status: 'READY',
        items,
        message: `Retrieved ${items.length} authorized pins for "${query}".`,
      };
    } catch (err: any) {
      return {
        success: false,
        status: 'ACCESS_RESTRICTED',
        items: [],
        message: `Network error reaching Pinterest API: ${err.message}`,
      };
    }
  }
}
