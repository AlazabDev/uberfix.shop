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

const DEFAULT_MAPBOX_STYLE = 'mapbox://styles/mapbox/satellite-streets-v12';

const GlobalMap = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const spinInterval = useRef<number | null>(null);
  const resizeObserver = useRef<ResizeObserver | null>(null);

  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [tokenLoaded, setTokenLoaded] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [mapLoaded, setMapLoaded] = useState(false);

  const { branches, loading: branchesLoading } = useBranchLocations();

  // Load Mapbox public token. Prefer VITE_MAPBOX_TOKEN, then Edge Function fallback.
  useEffect(() => {
    let cancelled = false;

    const fetchToken = async () => {
      try {
        const token = await getMapboxToken();

        if (cancelled) return;

        if (token) {
          setMapboxToken(token);
          setTokenLoaded(true);
          setRuntimeError(null);
        } else {
          setRuntimeError('مطلوب مفتاح Mapbox صالح لعرض الخريطة.');
        }
      } catch (err) {
        console.error('[GlobalMap] Failed to load Mapbox token:', err);
        if (!cancelled) {
          setRuntimeError('فشل في تحميل مفتاح الخريطة.');
        }
      }
    };

    fetchToken();

    return () => {
      cancelled = true;
    };
  }, []);

  // Initialize the globe once. Marker updates are handled in a separate effect.
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || !tokenLoaded || map.current) return;

    if (!mapboxgl.supported()) {
      setRuntimeError('المتصفح أو كارت الشاشة لا يدعم WebGL المطلوب لتشغيل الخريطة ثلاثية الأبعاد.');
      return;
    }

    // Force a known-good public Mapbox style. Custom styles from env caused
    // silent tile failures (load fires but no tiles render → blank blue globe).
    try {
      mapboxgl.accessToken = mapboxToken;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: DEFAULT_MAPBOX_STYLE,
        projection: { name: 'globe' },
        zoom: 1.8,
        center: [30, 26],
        pitch: 0,
        attributionControl: false,
        failIfMajorPerformanceCaveat: false,
      });
    } catch (err) {
      console.error('[GlobalMap] Mapbox init failed:', err);
      setRuntimeError('تعذر تهيئة الخريطة.');
      return;
    }

    map.current.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      'top-right'
    );

    map.current.scrollZoom.disable();

    map.current.on('error', (e) => {
      console.error('[GlobalMap] Mapbox runtime error:', e?.error || e);
      const msg = String(e?.error?.message || e?.error || '');
      if (msg.includes('style') || msg.includes('401') || msg.includes('403') || msg.includes('404')) {
        setRuntimeError('حدث خطأ أثناء تحميل الخريطة. يرجى المحاولة لاحقًا.');
      }
    });

    map.current.on('load', () => {
      setMapLoaded(true);
      setRuntimeError(null);
      map.current?.resize();
    });

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

      window.setTimeout(() => map.current?.resize(), 100);
    });

    const secondsPerRevolution = 180;
    const maxSpinZoom = 5;
    const slowSpinZoom = 3;
    let userInteracting = false;

    map.current.on('mousedown', () => { userInteracting = true; });
    map.current.on('dragstart', () => { userInteracting = true; });
    map.current.on('mouseup', () => { userInteracting = false; });
    map.current.on('touchend', () => { userInteracting = false; });

    spinInterval.current = window.setInterval(() => {
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

    if (mapContainer.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver.current = new ResizeObserver(() => map.current?.resize());
      resizeObserver.current.observe(mapContainer.current);
    }

    return () => {
      if (spinInterval.current) {
        window.clearInterval(spinInterval.current);
        spinInterval.current = null;
      }

      resizeObserver.current?.disconnect();
      resizeObserver.current = null;

      markers.current.forEach((marker) => marker.remove());
      markers.current = [];

      map.current?.remove();
      map.current = null;
      setMapLoaded(false);
    };
  }, [mapboxToken, tokenLoaded]);

  // Keep branch markers in sync after the map and branch data are both ready.
  useEffect(() => {
    if (!map.current || !mapLoaded || branchesLoading) return;

    markers.current.forEach((marker) => marker.remove());
    markers.current = [];

    branches.forEach((branch) => {
      const lat = parseFloat(branch.latitude || '');
      const lng = parseFloat(branch.longitude || '');
      if (Number.isNaN(lat) || Number.isNaN(lng)) return;

      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.setAttribute('aria-label', branch.branch_name || branch.branch || 'branch location');
      el.style.width = '42px';
      el.style.height = '42px';
      el.style.borderRadius = '9999px';
      el.style.backgroundColor = '#f5bf23';
      el.style.border = '2px solid rgba(255,255,255,0.9)';
      el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.35)';
      el.style.backgroundImage = branch.icon ? `url(${branch.icon})` : 'url(/icons/branch-icon.png)';
      el.style.backgroundSize = 'contain';
      el.style.backgroundPosition = 'center';
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
      const safeType = escapeHtml(branch.branch_type || 'فرع');
      const safeCity = escapeHtml(branch.city || '');

      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        className: 'custom-popup',
      }).setHTML(`
        <div style="padding: 8px; text-align: center; direction: rtl; min-width: 140px;">
          <strong style="color: #f5bf23; font-size: 14px; display:block; margin-bottom:4px;">${safeName}</strong>
          <span style="font-size:12px; color:#666;">${safeType}${safeCity ? ` • ${safeCity}` : ''}</span>
        </div>
      `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map.current!);

      markers.current.push(marker);
    });
  }, [branches, branchesLoading, mapLoaded]);

  const showLoadingOverlay = (!tokenLoaded || branchesLoading || !mapLoaded) && !runtimeError;

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

        <div className="relative rounded-2xl overflow-hidden shadow-elevated animate-scale-in" style={{ height: '600px', minHeight: '600px' }}>
          <div ref={mapContainer} className="absolute inset-0" />

          {runtimeError && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
              <p className="text-base font-medium text-destructive text-center px-6" dir="rtl">
                {runtimeError}
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

          {!runtimeError && !showLoadingOverlay && (
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
