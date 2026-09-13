import { StockVideo } from '../types';

export interface PinterestProviderStatus {
  available: boolean;
  message: string;
}

/**
 * Authorized Pinterest API Provider.
 * Enforces strict compliance with authorized API policies.
 * Never scrapes HTML or downloads unauthorized pins.
 * When credentials are not provided, returns an honest status without faking results.
 */
export class AuthorizedPinterestProvider {
  private accessToken: string;

  constructor(accessToken?: string) {
    this.accessToken = (accessToken || process.env.PINTEREST_ACCESS_TOKEN || '').trim();
  }

  public getStatus(): PinterestProviderStatus {
    if (!this.accessToken) {
      return {
        available: false,
        message: 'Pinterest integration unavailable. Connect Pinterest API to enable Pinterest results.',
      };
    }
    return {
      available: true,
      message: 'Pinterest API connected.',
    };
  }

  public async searchVisuals(query: string): Promise<{ success: boolean; items: StockVideo[]; message: string }> {
    const status = this.getStatus();
    if (!status.available) {
      return {
        success: false,
        items: [],
        message: status.message,
      };
    }

    try {
      // Official Pinterest API search
      const res = await fetch(`https://api.pinterest.com/v5/search/pins?query=${encodeURIComponent(query)}&page_size=10`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        return {
          success: false,
          items: [],
          message: `Pinterest API returned ${res.status}: ${res.statusText}`,
        };
      }

      const data = await res.json();
      const items: StockVideo[] = (data.items || []).map((pin: any) => ({
        id: `pinterest_${pin.id}`,
        provider: 'pinterest' as const,
        width: pin.media?.images?.['1200x']?.width || 1080,
        height: pin.media?.images?.['1200x']?.height || 1920,
        duration: 5.0,
        url: pin.media?.images?.['1200x']?.url || pin.link,
        thumbnailUrl: pin.media?.images?.['600x']?.url || pin.media?.images?.['150x150']?.url || '',
        videoFiles: [],
        tags: pin.tags || [query],
        author: pin.board_owner?.username || 'Pinterest Creator',
        license: 'Pinterest Authorized API Access',
        queryMatched: query,
      }));

      return {
        success: true,
        items,
        message: `Found ${items.length} pins from Pinterest API`,
      };
    } catch (err: any) {
      return {
        success: false,
        items: [],
        message: `Pinterest API request error: ${err?.message || 'Unknown error'}`,
      };
    }
  }
}
