import { MAPS_CONFIG } from '@/config/maps';
import { supabase } from '@/integrations/supabase/client';

/**
 * Google Maps Loader - يجلب المفتاح من Edge Function
 */
class GoogleMapsLoader {
  private static instance: GoogleMapsLoader;
  private loadPromise: Promise<void> | null = null;
  private isLoaded = false;
  private cachedApiKey: string | null = null;

  private constructor() {}

  static getInstance(): GoogleMapsLoader {
    if (!GoogleMapsLoader.instance) {
      GoogleMapsLoader.instance = new GoogleMapsLoader();
    }
    return GoogleMapsLoader.instance;
  }

  private async getApiKey(): Promise<string> {
    if (this.cachedApiKey) return this.cachedApiKey;

    // Prefer client-side browser key when available.
    // This is a public browser key and avoids preview failures if the edge secret is restricted.
    const envKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (envKey) {
      this.cachedApiKey = envKey;
      return envKey;
    }

    // Try edge function first
    try {
      const { data, error } = await supabase.functions.invoke('get-maps-key');
      if (!error && data?.apiKey) {
        this.cachedApiKey = data.apiKey;
        return data.apiKey;
      }
      console.warn('Edge function failed:', error);
    } catch (e) {
      console.warn('Failed to fetch maps key from edge function:', e);
    }

    throw new Error('Google Maps API key not available');
  }

  async load(): Promise<void> {
    if (this.isLoaded && window.google?.maps) {
      return Promise.resolve();
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = (async () => {
      if (window.google?.maps) {
        this.isLoaded = true;
        return;
      }

      const apiKey = await this.getApiKey();

      // Remove any old script
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) existingScript.remove();

      const libs = MAPS_CONFIG.libraries.join(',');

      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=${libs}&language=ar&region=EG&v=weekly`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          this.isLoaded = true;
          // Google Maps loaded
          resolve();
        };
        script.onerror = () => {
          this.loadPromise = null;
          reject(new Error('فشل في تحميل Google Maps'));
        };
        document.head.appendChild(script);
      });
    })();

    return this.loadPromise;
  }

  isGoogleMapsLoaded(): boolean {
    return this.isLoaded && !!window.google?.maps;
  }

  reset(): void {
    this.loadPromise = null;
    this.isLoaded = false;
    this.cachedApiKey = null;
  }

  getMapId(): string {
    return MAPS_CONFIG.defaultOptions.mapId || '';
  }
}

export const googleMapsLoader = GoogleMapsLoader.getInstance();
export const loadGoogleMaps = () => googleMapsLoader.load();
export const resetGoogleMapsLoader = () => googleMapsLoader.reset();
export const getGoogleMapsId = () => googleMapsLoader.getMapId();
