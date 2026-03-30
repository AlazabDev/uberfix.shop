/**
 * Mapbox Loader - للاستخدام الترويجي فقط (Globe 3D)
 * يجلب المفتاح من Edge Function للأمان
 */

import type mapboxglType from 'mapbox-gl';
import { supabase } from '@/integrations/supabase/client';

let mapboxLoaded = false;
let mapboxPromise: Promise<typeof mapboxglType> | null = null;
let cachedToken: string | null = null;

/**
 * جلب مفتاح Mapbox من Edge Function
 */
export const getMapboxToken = async (): Promise<string> => {
  if (cachedToken) {
    return cachedToken;
  }

  // Prefer client-side env var (public browser key)
  const envToken = import.meta.env.VITE_MAPBOX_TOKEN;
  if (envToken) {
    cachedToken = envToken;
    return envToken;
  }

  // Fallback to edge function
  try {
    const { data, error } = await supabase.functions.invoke('get-mapbox-token');
    
    if (error) {
      console.warn('Failed to get Mapbox token from Edge Function:', error);
      return '';
    }
    
    if (data?.token) {
      cachedToken = data.token;
      return data.token;
    }
    
    return '';
  } catch (err) {
    console.warn('Error fetching Mapbox token:', err);
    return '';
  }
};

/**
 * الحصول على المفتاح بشكل متزامن (للتوافق مع الكود القديم)
 * يستخدم القيمة المُخزنة مؤقتًا فقط
 */
export const getMapboxTokenSync = (): string => {
  return cachedToken || '';
};

export const loadMapbox = async (): Promise<typeof mapboxglType> => {
  if (mapboxPromise) {
    return mapboxPromise;
  }

  mapboxPromise = (async () => {
    const mapboxgl = await import('mapbox-gl');
    
    const token = await getMapboxToken();
    if (!token) {
      console.warn('Mapbox token not found - Globe visualization may not work');
    } else {
      mapboxgl.default.accessToken = token;
    }
    
    mapboxLoaded = true;
    // Mapbox loaded successfully
    
    return mapboxgl.default;
  })();

  return mapboxPromise;
};

export const isMapboxLoaded = (): boolean => mapboxLoaded;

export const mapboxLoader = {
  getToken: getMapboxToken,
  getTokenSync: getMapboxTokenSync,
  load: loadMapbox,
  isLoaded: isMapboxLoaded,
};

// تصريح للنافذة
declare global {
  interface Window {
    mapboxgl?: typeof mapboxglType;
  }
}
