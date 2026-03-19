// src/components/GlobalMap.tsx
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { getMapboxToken } from '@/lib/mapboxLoader';

interface BranchLocation {
  name: string;
  latitude: number;
  longitude: number;
  url?: string;
}

const GlobalMap = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [branches, setBranches] = useState<BranchLocation[]>([]);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [tokenLoaded, setTokenLoaded] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string>('');

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

  const mapError = !tokenLoaded && !mapboxToken
    ? (runtimeError || 'جاري تحميل الخريطة...')
    : runtimeError;

  useEffect(() => {
    fetch('/data/branch_locations.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to load branch locations');
        }
        return response.json();
      })
      .then((data) => setBranches(data))
      .catch((error) => {
        console.error('Error loading branch locations:', error);
        setRuntimeError('تعذر تحميل مواقع الفروع حاليًا.');
      });
  }, []);

  useEffect(() => {
    if (!mapContainer.current || branches.length === 0 || !mapboxToken || !tokenLoaded) return;

    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/standard',
      projection: { name: 'globe' },
      zoom: 1.5,
      center: [30, 20],
      pitch: 0,
    });

    map.current.on('error', () => {
      setRuntimeError('حدث خطأ أثناء تحميل الخريطة. يرجى المحاولة لاحقًا.');
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    map.current.scrollZoom.disable();

    map.current.on('style.load', () => {
      map.current?.setFog({
        color: 'rgb(30, 30, 40)',
        'high-color': 'rgb(50, 50, 70)',
        'horizon-blend': 0.4,
        'space-color': 'rgb(10, 10, 20)',
        'star-intensity': 0.6
      });
    });

    const secondsPerRevolution = 180;
    const maxSpinZoom = 5;
    const slowSpinZoom = 3;
    let userInteracting = false;

    map.current.on('mousedown', () => { userInteracting = true; });
    map.current.on('dragstart', () => { userInteracting = true; });
    map.current.on('mouseup', () => { userInteracting = false; });
    map.current.on('touchend', () => { userInteracting = false; });

    // Use an interval instead of moveend→easeTo loop to avoid infinite recursion
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
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.style.width = '40px';
      el.style.height = '40px';
      el.style.backgroundImage = 'url(/icons/branch-icon.png)';
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

      const popup = new mapboxgl.Popup({ 
        offset: 25,
        closeButton: false,
        className: 'custom-popup'
      }).setHTML(`
        <div style="padding: 8px; text-align: center; direction: rtl;">
          <strong style="color: #f59e0b; font-size: 14px;">${branch.name}</strong>
        </div>
      `);

      new mapboxgl.Marker(el)
        .setLngLat([branch.longitude, branch.latitude])
        .setPopup(popup)
        .addTo(map.current!);
    });

    spinGlobe();

    return () => {
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

          {mapError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <p className="text-base font-medium text-muted-foreground" dir="rtl">
                {mapError}
              </p>
            </div>
          ) : (
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-card/90 backdrop-blur-sm px-6 py-3 rounded-full border border-border shadow-lg" dir="rtl">
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
