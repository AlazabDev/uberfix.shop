import { useEffect, useRef, useState, useCallback } from 'react';
import { loadGoogleMaps, getGoogleMapsId } from '@/lib/googleMapsLoader';
import { MAPS_CONFIG } from '@/config/maps';
import { Loader2, MapPin, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title?: string;
  type?: 'branch' | 'technician' | 'property' | 'custom';
  icon?: string;
  data?: Record<string, unknown>;
}

interface GoogleMapContainerProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: MapMarker[];
  onMapLoad?: (map: any) => void;
  onMarkerClick?: (marker: MapMarker, mapMarker: any) => void;
  onMapClick?: (lat: number, lng: number) => void;
  height?: string;
  className?: string;
  interactive?: boolean;
  showCurrentLocation?: boolean;
  mapStyle?: any[];
}

export const GoogleMapContainer = ({
  center = MAPS_CONFIG.defaultCenter,
  zoom = MAPS_CONFIG.defaultZoom,
  markers = [],
  onMapLoad,
  onMarkerClick,
  onMapClick,
  height = '400px',
  className = '',
  interactive = true,
  showCurrentLocation = false,
  mapStyle,
}: GoogleMapContainerProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  // تحميل الخريطة
  useEffect(() => {
    let mounted = true;

    const initMap = async () => {
      try {
        setIsLoading(true);
        setError(null);

        await loadGoogleMaps();

        if (!mounted || !mapRef.current) return;

        // انتظار قليلاً للتأكد من تحميل المكتبة
        await new Promise(resolve => setTimeout(resolve, 100));

        if (!window.google?.maps) {
          throw new Error('Google Maps failed to initialize');
        }

        const mapOptions: any = {
          center,
          zoom,
          mapId: getGoogleMapsId(),
          disableDefaultUI: !interactive,
          zoomControl: interactive,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: interactive,
          gestureHandling: interactive ? 'greedy' : 'none',
          styles: mapStyle,
        };

        mapInstanceRef.current = new google.maps.Map(mapRef.current, mapOptions);

        // استمع لنقرات الخريطة
        if (onMapClick && interactive) {
          mapInstanceRef.current.addListener('click', (e: any) => {
            if (e.latLng) {
              onMapClick(e.latLng.lat(), e.latLng.lng());
            }
          });
        }

        if (onMapLoad) {
          onMapLoad(mapInstanceRef.current);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Map initialization error:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'فشل في تحميل الخريطة');
          setIsLoading(false);
        }
      }
    };

    initMap();

    return () => {
      mounted = false;
      // تنظيف العلامات
      markersRef.current.forEach(marker => {
        marker.map = null;
      });
      markersRef.current = [];
    };
  }, [center.lat, center.lng, zoom, interactive, mapStyle, onMapClick, onMapLoad]);

  // إضافة العلامات
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps?.marker) return;

    // إزالة العلامات القديمة
    markersRef.current.forEach(marker => {
      marker.map = null;
    });
    markersRef.current = [];

    // إضافة العلامات الجديدة
    markers.forEach(markerData => {
      if (isNaN(markerData.lat) || isNaN(markerData.lng)) return;

      const markerElement = document.createElement('div');
      
      if (markerData.icon) {
        const img = document.createElement('img');
        img.src = markerData.icon;
        img.style.cssText = 'width: 40px; height: 48px; cursor: pointer;';
        markerElement.appendChild(img);
      } else {
        markerElement.innerHTML = `
          <div style="
            width: 32px;
            height: 32px;
            background: #f5bf23;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            cursor: pointer;
          ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0f172a" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
        `;
      }

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: mapInstanceRef.current!,
        position: { lat: markerData.lat, lng: markerData.lng },
        content: markerElement,
        title: markerData.title || '',
      });

      if (onMarkerClick) {
        marker.addListener('click', () => {
          onMarkerClick(markerData, marker);
        });
      }

      markersRef.current.push(marker);
    });
  }, [markers, onMarkerClick]);

  // الحصول على الموقع الحالي
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('المتصفح لا يدعم تحديد الموقع');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCurrentLocation(location);
        
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo(location);
          mapInstanceRef.current.setZoom(15);
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
        setError('فشل في تحديد موقعك');
      },
      { enableHighAccuracy: true }
    );
  }, []);

  // إعادة المحاولة
  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    window.location.reload();
  };

  if (error) {
    return (
      <div 
        className={`flex flex-col items-center justify-center bg-slate-100 rounded-xl border border-slate-200 ${className}`}
        style={{ height }}
      >
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-3" />
        <p className="text-slate-700 font-medium mb-2">تعذر تحميل الخريطة</p>
        <p className="text-slate-500 text-sm mb-4">{error}</p>
        <Button onClick={handleRetry} variant="outline" size="sm">
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  return (
    <div className={`relative rounded-xl overflow-hidden ${className}`} style={{ height }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-slate-600 text-sm">جاري تحميل الخريطة...</p>
          </div>
        </div>
      )}
      
      <div ref={mapRef} className="w-full h-full" />

      {showCurrentLocation && interactive && (
        <Button
          onClick={getCurrentLocation}
          size="sm"
          variant="secondary"
          className="absolute bottom-4 right-4 z-20 shadow-lg"
        >
          <MapPin className="w-4 h-4 mr-1" />
          موقعي
        </Button>
      )}
    </div>
  );
};

export default GoogleMapContainer;
