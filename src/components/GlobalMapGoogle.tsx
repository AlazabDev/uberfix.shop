// Reliable homepage globe replacement using Google Maps (already loaded in the app).
// Replaces the Mapbox 3D globe which failed silently on WebGL/token/style issues.
import React, { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps, getGoogleMapsId } from '@/lib/googleMapsLoader';
import { useBranchLocations } from '@/hooks/useBranchLocations';

const GlobalMapGoogle: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { branches, loading: branchesLoading } = useBranchLocations();

  // Init map once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadGoogleMaps();
        if (cancelled || !mapRef.current || mapInstance.current) return;
        const g = (window as any).google;
        mapInstance.current = new g.maps.Map(mapRef.current, {
          center: { lat: 26.8206, lng: 30.8025 }, // Egypt
          zoom: 6,
          mapId: getGoogleMapsId() || undefined,
          mapTypeId: 'hybrid',
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
          gestureHandling: 'cooperative',
          backgroundColor: '#0b1e3f',
        });
        setReady(true);
      } catch (e: any) {
        console.error('[GlobalMapGoogle] init failed', e);
        setError('تعذر تحميل الخريطة.');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Sync markers
  useEffect(() => {
    if (!ready || !mapInstance.current || branchesLoading) return;
    const g = (window as any).google;
    markersRef.current.forEach((m) => m.setMap?.(null));
    markersRef.current = [];
    const bounds = new g.maps.LatLngBounds();
    branches.forEach((b) => {
      const lat = parseFloat(b.latitude || '');
      const lng = parseFloat(b.longitude || '');
      if (Number.isNaN(lat) || Number.isNaN(lng)) return;
      const marker = new g.maps.Marker({
        position: { lat, lng },
        map: mapInstance.current,
        title: b.branch_name || b.branch || 'branch',
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: '#f5bf23',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });
      markersRef.current.push(marker);
      bounds.extend({ lat, lng });
    });
    if (markersRef.current.length > 1) {
      mapInstance.current.fitBounds(bounds, 60);
    }
  }, [branches, branchesLoading, ready]);

  return (
    <section className="relative py-20 bg-background overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12" dir="rtl">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            شبكة عالمية من
            <span className="bg-gradient-primary bg-clip-text text-transparent"> الشركاء</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            نخدم أكثر من {branches.length} موقع لعملائنا من العلامات التجارية الكبرى وسلاسل الإمداد في مصر
          </p>
        </div>

        <div
          className="relative rounded-2xl overflow-hidden shadow-elevated bg-[#0b1e3f]"
          style={{ height: '600px', minHeight: '400px' }}
        >
          <div ref={mapRef} className="absolute inset-0" />

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
              <p className="text-base font-medium text-destructive text-center px-6" dir="rtl">{error}</p>
            </div>
          )}
          {!error && !ready && (
            <div className="absolute inset-0 flex items-center justify-center bg-primary-dark/40 backdrop-blur-sm z-10">
              <p className="text-base font-medium text-white" dir="rtl">جاري تحميل الخريطة...</p>
            </div>
          )}
          {!error && ready && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm px-6 py-3 rounded-full border border-border shadow-lg z-10" dir="rtl">
              <p className="text-sm text-foreground font-medium">
                🌍 {branches.length} موقع نشط • <span className="text-primary">خدمة 24/7</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default GlobalMapGoogle;