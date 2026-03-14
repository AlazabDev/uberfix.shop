import React, { useEffect, useRef, useState, useCallback } from 'react';
import { loadGoogleMaps, getGoogleMapsId } from '@/lib/googleMapsLoader';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MapPin } from 'lucide-react';

interface BranchLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  branch_type?: string;
  status?: string;
  address?: string;
  city?: string;
}

interface BranchesGoogleMapProps {
  height?: string;
  showStats?: boolean;
  className?: string;
}

export const BranchesGoogleMap: React.FC<BranchesGoogleMapProps> = ({
  height = '500px',
  showStats = true,
  className = '',
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [branches, setBranches] = useState<BranchLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load branches
  useEffect(() => {
    const load = async () => {
      try {
        const { data, error: dbError } = await supabase
          .from('branch_locations')
          .select('id, branch, branch_name, latitude, longitude, branch_type, status, address, city')
          .not('latitude', 'is', null)
          .not('longitude', 'is', null);

        if (dbError) throw dbError;

        const valid = (data || [])
          .filter((b: any) => b.latitude && b.longitude)
          .map((b: any) => ({
            id: b.id,
            name: b.branch_name || b.branch,
            latitude: parseFloat(b.latitude),
            longitude: parseFloat(b.longitude),
            branch_type: b.branch_type,
            status: b.status,
            address: b.address,
            city: b.city,
          }));
        setBranches(valid);
      } catch {
        setError('تعذر تحميل بيانات الفروع');
      }
    };
    load();
  }, []);

  // Init map
  useEffect(() => {
    if (!mapRef.current || branches.length === 0) return;
    let mounted = true;

    const init = async () => {
      try {
        setLoading(true);
        await loadGoogleMaps();
        if (!mounted || !mapRef.current || !window.google?.maps) return;

        await new Promise(r => setTimeout(r, 200));

        const map = new google.maps.Map(mapRef.current, {
          center: { lat: 30.0444, lng: 31.2357 },
          zoom: 6,
          mapId: getGoogleMapsId(),
          mapTypeControl: false,
          fullscreenControl: true,
          streetViewControl: false,
          zoomControl: true,
          gestureHandling: 'greedy',
          styles: [
            { elementType: 'geometry', stylers: [{ color: '#0b1e36' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3f7' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#0b1e36' }] },
            { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d2b4e' }] },
            { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a4b8c' }] },
            { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0b1e36' }] },
            { featureType: 'poi', stylers: [{ visibility: 'off' }] },
            { featureType: 'transit', stylers: [{ visibility: 'off' }] },
            { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#1a4b8c' }] },
          ],
        });

        mapInstanceRef.current = map;

        // Add markers
        branches.forEach(branch => {
          if (isNaN(branch.latitude) || isNaN(branch.longitude)) return;

          const markerEl = document.createElement('div');
          markerEl.innerHTML = `
            <div style="
              width: 28px; height: 28px;
              background: #f5bf23;
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(245,191,35,0.5);
              cursor: pointer;
              transition: transform 0.2s;
              display: flex; align-items: center; justify-content: center;
            ">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0b1e36" stroke-width="2.5">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
          `;
          markerEl.addEventListener('mouseenter', () => {
            (markerEl.firstElementChild as HTMLElement).style.transform = 'scale(1.3)';
          });
          markerEl.addEventListener('mouseleave', () => {
            (markerEl.firstElementChild as HTMLElement).style.transform = 'scale(1)';
          });

          const marker = new google.maps.marker.AdvancedMarkerElement({
            map,
            position: { lat: branch.latitude, lng: branch.longitude },
            content: markerEl,
            title: branch.name,
          });

          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="padding:12px 16px;direction:rtl;text-align:right;min-width:180px">
                <h3 style="margin:0 0 4px;font-size:14px;font-weight:700;color:#f5bf23">${branch.name}</h3>
                ${branch.branch_type ? `<p style="margin:0;font-size:11px;color:#666">📍 ${branch.branch_type}</p>` : ''}
                ${branch.address ? `<p style="margin:4px 0 0;font-size:11px;color:#888">${branch.address.substring(0, 60)}</p>` : ''}
                ${branch.status === 'active' || branch.status === 'Active' ? '<span style="display:inline-block;margin-top:6px;padding:2px 8px;background:#22c55e;color:white;border-radius:12px;font-size:10px">✓ نشط</span>' : ''}
              </div>
            `,
            maxWidth: 280,
          });

          marker.addListener('click', () => {
            infoWindow.open(map, marker);
          });

          markersRef.current.push(marker);
        });

        // Fit bounds
        if (branches.length > 1) {
          const bounds = new google.maps.LatLngBounds();
          branches.forEach(b => bounds.extend({ lat: b.latitude, lng: b.longitude }));
          map.fitBounds(bounds, { top: 50, bottom: 80, left: 50, right: 50 });
        }

        setLoading(false);
      } catch (err) {
        console.error('Map init error:', err);
        if (mounted) {
          setError('فشل في تحميل الخريطة');
          setLoading(false);
        }
      }
    };

    init();
    return () => {
      mounted = false;
      markersRef.current.forEach(m => { m.map = null; });
      markersRef.current = [];
    };
  }, [branches]);

  if (error) {
    return (
      <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 ${className}`} style={{ height }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white p-6">
            <MapPin className="w-12 h-12 mx-auto mb-3 text-primary/50" />
            <p className="text-base font-medium">{error}</p>
            <p className="text-sm text-white/50 mt-1">يرجى المحاولة لاحقاً</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative rounded-2xl overflow-hidden shadow-2xl border border-border/50 ${className}`} style={{ height }}>
      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/90 backdrop-blur-sm">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3 text-primary" />
            <p className="text-sm text-muted-foreground">جاري تحميل الخريطة...</p>
          </div>
        </div>
      )}

      <div ref={mapRef} className="absolute inset-0" />

      {showStats && !loading && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-card/95 backdrop-blur-md px-6 py-3 rounded-full border border-border shadow-xl flex items-center gap-4" dir="rtl">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-bold text-foreground">{branches.length}</span>
              <span className="text-xs text-muted-foreground hidden sm:inline">موقع نشط</span>
            </div>
            <div className="w-px h-6 bg-border" />
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">خدمة</span>
              <span className="text-sm font-bold text-primary">24/7</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchesGoogleMap;
