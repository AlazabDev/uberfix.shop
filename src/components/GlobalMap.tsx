// src/components/GlobalMap.tsx
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { getMapboxToken } from '@/lib/mapboxLoader';
import { useBranchLocations } from '@/hooks/useBranchLocations';

const escapeHtml = (str: string): string => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

const GlobalMap = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [tokenLoaded, setTokenLoaded] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string>('');

  const { branches, loading: branchesLoading } = useBranchLocations();

  // جلب المفتاح من Edge Function
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const token = await getMapboxToken();
        if (token) {
          setMapboxToken(token);
          setTokenLoaded(true);
        } else {
          setRuntimeError('مطلوب مفتاح Mapbox صالح لعرض الخريطة.');
        }
      } catch {
        setRuntimeError('فشل في تحميل مفتاح الخريطة.');
      }
    };
    fetchToken();
  }, []);

  const isReady = tokenLoaded && !!mapboxToken && !branchesLoading;

  const mapError = runtimeError;
  const showLoadingOverlay = !isReady && !runtimeError;

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || !tokenLoaded) return;
    if (map.current) return; // prevent re-init

    const customStyle = import.meta.env.VITE_MAPBOX_STYLE_URL as string | undefined;

    try {
      mapboxgl.accessToken = mapboxToken;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: customStyle || 'mapbox://styles/mapbox/satellite-streets-v12',
        projection: { name: 'globe' },
        zoom: 1.8,
        center: [30, 26],
        pitch: 0,
        attributionControl: false,
      });
    } catch (err) {
      console.error('[GlobalMap] Mapbox init failed:', err);
      setRuntimeError('تعذر تهيئة الخريطة.');
      return;
    }

    map.current.on('error', (e) => {
      console.error('[GlobalMap] Mapbox runtime error:', e?.error || e);
      if (!map.current?.isStyleLoaded()) {
        setRuntimeError('حدث خطأ أثناء تحميل الخريطة. يرجى المحاولة لاحقًا.');
      }
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      'top-right'
    );

    map.current.scrollZoom.disable();

    map.current.on('style.load', () => {
      try {
        map.current?.setFog({
          color: 'rgb(30, 30, 40)',
          'high-color': 'rgb(50, 50, 70)',
          'horizon-blend': 0.4,
          'space-color': 'rgb(10, 10, 20)',
          'star-intensity': 0.6,
        });
      } catch (err) {
        console.warn('[GlobalMap] setFog failed (non-fatal):', err);
      }
      setTimeout(() => map.current?.resize(), 100);
    });

    const secondsPerRevolution = 180;
    const maxSpinZoom = 5;
    const slowSpinZoom = 3;
    let userInteracting = false;

    map.current.on('mousedown', () => { userInteracting = true; });
    map.current.on('dragstart', () => { userInteracting = true; });
    map.current.on('mouseup', () => { userInteracting = false; });
    map.current.on('touchend', () => { userInteracting = false; });

    const spinInterval = setInterval(() => {
      if (!map.current) return;
      const zoom = map.current.getZoom();
      if (!userInteracting && zoom < maxSpinZoom) {
        let distancePerSecond = 360 / secondsPerRevolution;
        if (zoom > slowSpinZoom) {
          distancePerSecond *= (maxSpinZoom - zoom) / (maxSpinZoom - slowSpinZoom);
        }
        const center = map.current.getCenter();
        center.lng -= distancePerSecond;
        map.current.easeTo({ center, duration: 1000, easing: (n) => n });
      }
    }, 1000);

    // Add markers for branches
    branches.forEach((branch) => {
      const lat = parseFloat(branch.latitude || '');
      const lng = parseFloat(branch.longitude || '');
      if (isNaN(lat) || isNaN(lng)) return;

      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.style.width = '40px';
      el.style.height = '40px';
      el.style.backgroundImage = `url(${branch.icon || '/icons/branch-icon.png'})`;
      el.style.backgroundSize = 'contain';
      el.style.backgroundRepeat = 'no-repeat';
      el.style.cursor = 'pointer';
      el.style.transition = 'transform 0.3s ease';

      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.3) translateY(-5px)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1) translateY(0)';
      });

      const safeName = escapeHtml(branch.branch_name || branch.branch || '');
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        className: 'custom-popup',
      }).setHTML(`
        <div style="padding: 8px; text-align: center; direction: rtl;">
          <strong style="color: #f5bf23; font-size: 14px;">${safeName}</strong>
        </div>
      `);

      new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map.current!);
    });

    return () => {
      clearInterval(spinInterval);
      map.current?.remove();
    };
  }, [branches, mapboxToken, tokenLoaded]);

  return (
    <section className="relative py-20 bg-background overflow-hidden" style={{ backgroundColor: '#f4f4f4' }}>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#ffffff22] to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12 animate-fade-in" dir="rtl">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            شبكة عالمية من
            <span className="bg-gradient-primary bg-clip-text text-transparent"> الشركاء</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            نخدم أكثر من {branches.length} موقع لعملائنا من العلامات التجارية الكبرى وسلاسل الإمداد في مصر
          </p>
        </div>

        <div className="relative rounded-2xl overflow-hidden shadow-elevated animate-scale-in" style={{ height: '600px' }}>
          <div ref={mapContainer} className="absolute inset-0" />

          {mapError && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
              <p className="text-base font-medium text-destructive" dir="rtl">
                {mapError}
              </p>
            </div>
          )}

          {showLoadingOverlay && (
            <div className="absolute inset-0 flex items-center justify-center bg-primary-dark/40 backdrop-blur-sm z-10">
              <p className="text-base font-medium text-white" dir="rtl">
                جاري تحميل الخريطة...
              </p>
            </div>
          )}

          {!mapError && !showLoadingOverlay && (
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-card/90 backdrop-blur-sm px-6 py-3 rounded-full border border-border shadow-lg z-10" dir="rtl">
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

export default GlobalMap;
