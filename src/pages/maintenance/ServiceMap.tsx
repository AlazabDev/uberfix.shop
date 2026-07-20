import { useState, useEffect, useRef, useMemo, useCallback, useDeferredValue } from "react";
import { createRoot } from "react-dom/client";
import { useNavigate } from "react-router-dom";
import {
  Search, MapPin, Users, Building2, Home as HomeIcon, ClipboardList,
  Layers, Flame, RefreshCw, AlertTriangle, Phone, MessageCircle, X,
  CheckCircle2, Settings as SettingsIcon, Activity, Plus, LocateFixed, Keyboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { loadGoogleMaps } from "@/lib/googleMapsLoader";
import { MAPS_CONFIG } from "@/config/maps";
import { useServiceMapData, MapTechnician, MapActiveRequest, MapBranch, MapProperty } from "@/hooks/useServiceMapData";
import {
  SPECIALIZATIONS_LIST, mapStatusToMapLabel,
  getTechnicianIconByText, getBranchIcon,
} from "@/constants/technicianConstants";
import { WORKFLOW_STAGES, WorkflowStage } from "@/constants/workflowStages";
import { TechnicianMapPopup } from "@/components/maps/TechnicianMapPopup";
import { BranchMapPopup } from "@/components/maps/BranchMapPopup";
import { openWhatsApp } from "@/config/whatsapp";
// @ts-ignore - markerclusterer types optional
import { MarkerClusterer } from "@googlemaps/markerclusterer";

declare global { interface Window { google?: any } }

const SPECIALTIES = [
  { id: "all", label: "كل التخصصات", emoji: "🛠️", keywords: [] as string[] },
  ...SPECIALIZATIONS_LIST.map(s => ({ id: s.id, label: s.label, emoji: s.emoji, keywords: s.keywords })),
];

// UberFix Navy/Gold map style
const MAP_STYLE: any[] = [
  { elementType: "geometry", stylers: [{ color: "#f7f8fa" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#475569" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eef2ff" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#dcfce7" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#FFB900" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#030957" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#cbd5e1" }] },
];

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "#dc2626", high: "#f97316", normal: "#0ea5e9", low: "#64748b",
};

type SelectedItem =
  | { kind: "technician"; data: MapTechnician }
  | { kind: "branch"; data: MapBranch }
  | { kind: "property"; data: MapProperty }
  | { kind: "request"; data: MapActiveRequest }
  | null;

export default function ServiceMap() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { technicians, branches, properties, requests, loading, refetch } = useServiceMapData();

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const clustererRef = useRef<any>(null);
  const heatmapRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [layerTechnicians, setLayerTechnicians] = useState(true);
  const [layerBranches, setLayerBranches] = useState(true);
  const [layerProperties, setLayerProperties] = useState(true);
  const [layerRequests, setLayerRequests] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showClusters, setShowClusters] = useState(true);
  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Debounce search input via useDeferredValue → smoother filtering at scale
  const deferredQuery = useDeferredValue(searchQuery);

  // Authorization check (for assignment)
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
      const roles = (data || []).map((r: any) => r.role);
      setIsAuthorized(roles.some(r => ['admin','manager','staff','dispatcher'].includes(r)));
    })();
  }, []);

  // Initialize map once
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (typeof window.google === "undefined" || !window.google.maps) {
          await loadGoogleMaps();
        }
        if (!mapRef.current || mapInstanceRef.current || !mounted) return;
        mapInstanceRef.current = new google.maps.Map(mapRef.current, {
          center: MAPS_CONFIG.defaultCenter,
          zoom: 12,
          styles: MAP_STYLE,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          zoomControl: true,
          gestureHandling: "greedy",
          backgroundColor: "#f7f8fa",
        });
        setMapReady(true);
      } catch (e) {
        console.error("Map init error", e);
        if (mounted) setMapError(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Filtering
  const selectedSpecConfig = SPECIALTIES.find(s => s.id === selectedSpecialty);
  const q = deferredQuery.toLowerCase();

  const filteredTechs = useMemo(() => technicians.filter(t => {
    const spec = (t.specialization || "").toLowerCase();
    const matchSpec = selectedSpecialty === "all"
      || (selectedSpecConfig?.keywords.some(k => spec.includes(k.toLowerCase())) ?? false);
    const matchQ = !q || (t.name || "").toLowerCase().includes(q) || spec.includes(q);
    return matchSpec && matchQ;
  }), [technicians, selectedSpecialty, q, selectedSpecConfig]);

  const filteredBranches = useMemo(() => branches.filter(b =>
    !q || (b.branch || "").toLowerCase().includes(q) || (b.address || "").toLowerCase().includes(q)
  ), [branches, q]);

  const filteredProperties = useMemo(() => properties.filter(p =>
    !q || (p.name || "").toLowerCase().includes(q) || (p.code || "").toLowerCase().includes(q)
  ), [properties, q]);

  const filteredRequests = useMemo(() => requests.filter(r =>
    !q || (r.request_number || "").toLowerCase().includes(q) || (r.customer_display || "").toLowerCase().includes(q)
  ), [requests, q]);

  // Render markers / clusters / heatmap
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // cleanup
    markersRef.current.forEach(m => m.setMap?.(null));
    markersRef.current = [];
    clustererRef.current?.clearMarkers?.();
    clustererRef.current = null;
    heatmapRef.current?.setMap?.(null);
    heatmapRef.current = null;

    const allMarkers: any[] = [];

    const makeIcon = (url: string, size = 40) => ({
      url, scaledSize: new google.maps.Size(size, size + 8),
      anchor: new google.maps.Point(size / 2, size + 8),
    });

    if (layerBranches) {
      filteredBranches.forEach(b => {
        const lat = parseFloat(b.latitude!); const lng = parseFloat(b.longitude!);
        if (isNaN(lat) || isNaN(lng)) return;
        const m = new google.maps.Marker({
          position: { lat, lng }, icon: makeIcon(getBranchIcon(), 38),
          title: b.branch, zIndex: 100,
        });
        m.addListener("click", () => setSelectedItem({ kind: "branch", data: b }));
        allMarkers.push(m);
      });
    }

    if (layerProperties) {
      filteredProperties.forEach(p => {
        if (!p.latitude || !p.longitude) return;
        const m = new google.maps.Marker({
          position: { lat: p.latitude, lng: p.longitude },
          icon: {
            path: google.maps.SymbolPath.CIRCLE, scale: 9,
            fillColor: "#030957", fillOpacity: 0.9,
            strokeColor: "#FFB900", strokeWeight: 2.5,
          },
          title: p.name, zIndex: 80,
        });
        m.addListener("click", () => setSelectedItem({ kind: "property", data: p }));
        allMarkers.push(m);
      });
    }

    if (layerTechnicians) {
      filteredTechs.forEach(t => {
        if (!t.current_latitude || !t.current_longitude) return;
        const m = new google.maps.Marker({
          position: { lat: Number(t.current_latitude), lng: Number(t.current_longitude) },
          icon: makeIcon(getTechnicianIconByText(t.specialization || ""), 42),
          title: t.name, zIndex: 200,
        });
        m.addListener("click", () => setSelectedItem({ kind: "technician", data: t }));
        allMarkers.push(m);
      });
    }

    if (layerRequests) {
      filteredRequests.forEach(r => {
        const color = r.is_sla_breached ? "#dc2626" : (PRIORITY_COLOR[r.priority] || "#0ea5e9");
        const m = new google.maps.Marker({
          position: { lat: Number(r.latitude), lng: Number(r.longitude) },
          icon: {
            path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW, scale: 6,
            fillColor: color, fillOpacity: 0.95,
            strokeColor: "#ffffff", strokeWeight: 2,
          },
          title: `${r.request_number} • ${r.customer_display}`,
          zIndex: r.is_sla_breached ? 400 : 300,
          animation: r.is_sla_breached ? google.maps.Animation.BOUNCE : undefined,
        });
        m.addListener("click", () => setSelectedItem({ kind: "request", data: r }));
        allMarkers.push(m);
      });
    }

    markersRef.current = allMarkers;

    if (showClusters && allMarkers.length > 30) {
      try {
        clustererRef.current = new MarkerClusterer({ map, markers: allMarkers });
      } catch {
        allMarkers.forEach(m => m.setMap(map));
      }
    } else {
      allMarkers.forEach(m => m.setMap(map));
    }

    if (showHeatmap && google.maps.visualization) {
      const data = filteredRequests.map(r => new google.maps.LatLng(Number(r.latitude), Number(r.longitude)));
      heatmapRef.current = new (google.maps.visualization.HeatmapLayer as any)({
        data, map, radius: 28, opacity: 0.55,
      });
    }
  }, [mapReady, filteredTechs, filteredBranches, filteredProperties, filteredRequests,
      layerTechnicians, layerBranches, layerProperties, layerRequests, showClusters, showHeatmap]);

  // Pan map to selected item for instant visual focus
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedItem) return;
    const map = mapInstanceRef.current;
    let lat: number | null = null, lng: number | null = null;
    if (selectedItem.kind === 'technician') {
      lat = Number(selectedItem.data.current_latitude);
      lng = Number(selectedItem.data.current_longitude);
    } else if (selectedItem.kind === 'branch') {
      lat = parseFloat(selectedItem.data.latitude || '');
      lng = parseFloat(selectedItem.data.longitude || '');
    } else if (selectedItem.kind === 'property') {
      lat = selectedItem.data.latitude;
      lng = selectedItem.data.longitude;
    } else if (selectedItem.kind === 'request') {
      lat = Number(selectedItem.data.latitude);
      lng = Number(selectedItem.data.longitude);
    }
    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
      map.panTo({ lat, lng });
      if (map.getZoom() < 14) map.setZoom(15);
    }
  }, [selectedItem]);

  // Keyboard shortcuts: / search, F heatmap, C clusters, R refresh, Esc close, ? help
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const inField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === 'Escape') { setSelectedItem(null); setShowShortcuts(false); return; }
      if (inField) return;
      if (e.key === '/') {
        e.preventDefault();
        (document.getElementById('service-map-search') as HTMLInputElement | null)?.focus();
      } else if (e.key.toLowerCase() === 'f') {
        setShowHeatmap(v => !v);
      } else if (e.key.toLowerCase() === 'c') {
        setShowClusters(v => !v);
      } else if (e.key.toLowerCase() === 'r') {
        refetch();
      } else if (e.key === '?') {
        setShowShortcuts(v => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [refetch]);

  const handleAssignTechnician = useCallback(async (requestId: string, technicianId: string) => {
    const { data, error } = await supabase.rpc('assign_technician_to_map_request', {
      p_request_id: requestId, p_technician_id: technicianId,
    });
    if (error || !(data as any)?.success) {
      toast({ title: "فشل التعيين", description: (data as any)?.error || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "✓ تم التعيين", description: "تم تعيين الفني للطلب بنجاح" });
    refetch();
    setSelectedItem(null);
  }, [toast, refetch]);

  const handleQuickRequestFromLocation = (lat: number, lng: number, ctx?: any) => {
    sessionStorage.setItem('mapPickedLocation', JSON.stringify({ lat, lng, ctx }));
    navigate('/quick-request-from-map');
  };

  const handleQuickRequestFromMapCenter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const c = map.getCenter();
    if (!c) return;
    handleQuickRequestFromLocation(c.lat(), c.lng());
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation || !mapInstanceRef.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapInstanceRef.current.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        mapInstanceRef.current.setZoom(15);
        toast({ title: '📍 موقعك الحالي', description: 'تم تحديد موقعك على الخريطة' });
      },
      () => toast({ title: 'تعذر تحديد الموقع', variant: 'destructive' })
    );
  };

  const handleFollowTechnician = (t: MapTechnician) => {
    if (!t.current_latitude || !t.current_longitude) return;
    const map = mapInstanceRef.current;
    map.panTo({ lat: Number(t.current_latitude), lng: Number(t.current_longitude) });
    map.setZoom(16);
    toast({ title: "تتبع نشط", description: `جاري تتبع ${t.name}` });
  };

  // KPIs
  const kpis = useMemo(() => ({
    techsTotal: technicians.length,
    techsAvailable: technicians.filter(t => t.status === 'online').length,
    branches: branches.length,
    properties: properties.length,
    activeRequests: requests.length,
    slaBreaches: requests.filter(r => r.is_sla_breached).length,
  }), [technicians, branches, properties, requests]);

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Top Bar — Navy */}
      <header className="sticky top-0 z-40 bg-gradient-to-l from-[#030957] via-[#040a6a] to-[#030957] text-white shadow-lg">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFB900] text-[#030957] flex items-center justify-center font-bold shadow-md ring-2 ring-[#FFB900]/30">UF</div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#FFB900] font-semibold">Live Operations</p>
              <h1 className="text-base font-bold">خريطة خدمات UberFix — المرآة الميدانية</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 hidden md:inline-flex"
              onClick={() => setShowShortcuts(v => !v)} title="اختصارات لوحة المفاتيح">
              <Keyboard className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 ml-1" /> تحديث
            </Button>
            <Badge className="bg-[#FFB900] text-[#030957] hover:bg-[#FFB900] gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
              Live
            </Badge>
          </div>
        </div>

        {/* KPI strip */}
        <div className="bg-[#040a6a] border-t border-white/5">
          <div className="container mx-auto px-4 py-2 grid grid-cols-3 md:grid-cols-6 gap-2 text-xs animate-fade-in">
            <Kpi label="إجمالي الفنيين" value={kpis.techsTotal} />
            <Kpi label="متاح الآن" value={kpis.techsAvailable} accent />
            <Kpi label="الفروع" value={kpis.branches} />
            <Kpi label="العقارات" value={kpis.properties} />
            <Kpi label="طلبات نشطة" value={kpis.activeRequests} />
            <Kpi label="تجاوز SLA" value={kpis.slaBreaches} danger />
          </div>
        </div>
      </header>

      <main className="relative">
        <div className="container mx-auto p-4 grid grid-cols-12 gap-4">
          {/* Sidebar Filters */}
          <aside className="col-span-12 lg:col-span-3 space-y-3">
            <Card className="p-3 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-muted-foreground" />
                <Input id="service-map-search" placeholder="بحث: اسم/تخصص/رقم طلب…  (اضغط /)" value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)} className="pr-9" />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')}
                    className="absolute top-1/2 -translate-y-1/2 left-2 p-0.5 rounded hover:bg-slate-100"
                    aria-label="مسح البحث">
                    <X className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                )}
              </div>

              <div>
                <Label className="text-xs font-bold text-[#030957] mb-2 block flex items-center gap-1">
                  <Layers className="w-3 h-3" /> الطبقات
                </Label>
                <div className="space-y-1.5">
                  <LayerToggle icon={<Users className="w-3.5 h-3.5" />} label="الفنيون" count={filteredTechs.length}
                    checked={layerTechnicians} onChange={setLayerTechnicians} />
                  <LayerToggle icon={<Building2 className="w-3.5 h-3.5" />} label="الفروع" count={filteredBranches.length}
                    checked={layerBranches} onChange={setLayerBranches} />
                  <LayerToggle icon={<HomeIcon className="w-3.5 h-3.5" />} label="العقارات" count={filteredProperties.length}
                    checked={layerProperties} onChange={setLayerProperties} />
                  <LayerToggle icon={<ClipboardList className="w-3.5 h-3.5" />} label="الطلبات النشطة" count={filteredRequests.length}
                    checked={layerRequests} onChange={setLayerRequests} />
                </div>
              </div>

              <div className="border-t pt-3 space-y-2">
                <Label className="text-xs font-bold text-[#030957] mb-1 block flex items-center gap-1">
                  <SettingsIcon className="w-3 h-3" /> العرض
                </Label>
                <LayerToggle icon={<Flame className="w-3.5 h-3.5" />} label="Heatmap كثافة الطلبات"
                  checked={showHeatmap} onChange={setShowHeatmap} />
                <LayerToggle icon={<Layers className="w-3.5 h-3.5" />} label="تجميع Clusters"
                  checked={showClusters} onChange={setShowClusters} />
              </div>
            </Card>

            <Card className="p-3">
              <Label className="text-xs font-bold text-[#030957] mb-2 block">التخصصات</Label>
              <div className="flex flex-wrap gap-1">
                {SPECIALTIES.map(s => (
                  <button key={s.id}
                    onClick={() => setSelectedSpecialty(s.id)}
                    className={`text-xs px-2 py-1 rounded-md border transition ${
                      selectedSpecialty === s.id
                        ? "bg-[#030957] text-white border-[#030957]"
                        : "bg-white text-slate-700 border-slate-200 hover:border-[#FFB900]"
                    }`}
                  >
                    <span className="ml-1">{s.emoji}</span>{s.label}
                  </button>
                ))}
              </div>
            </Card>

            {kpis.slaBreaches > 0 && (
              <Card className="p-3 border-red-200 bg-red-50">
                <div className="flex items-center gap-2 text-red-700 text-sm font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  {kpis.slaBreaches} طلب تجاوز SLA
                </div>
              </Card>
            )}
          </aside>

          {/* Map */}
          <section className="col-span-12 lg:col-span-9">
            <Card className="overflow-hidden border-2 border-slate-200 shadow-xl relative">
              {mapError ? (
                <div className="h-[640px] flex items-center justify-center bg-slate-100">
                  <div className="text-center space-y-3">
                    <MapPin className="w-10 h-10 mx-auto text-slate-400" />
                    <p className="text-sm text-muted-foreground">تعذر تحميل الخريطة</p>
                    <Button onClick={() => window.location.reload()} variant="outline" size="sm">إعادة المحاولة</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div ref={mapRef} className="w-full h-[640px]" />
                  {(loading || !mapReady) && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center pointer-events-none animate-fade-in">
                      <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-lg">
                        <RefreshCw className="w-4 h-4 animate-spin text-[#030957]" />
                        <span className="text-sm text-[#030957] font-semibold">جاري تحميل الخريطة…</span>
                      </div>
                    </div>
                  )}
                  {/* Floating action buttons */}
                  {mapReady && (
                    <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-10">
                      <Button size="icon" onClick={handleLocateMe}
                        className="rounded-full bg-white text-[#030957] hover:bg-slate-50 shadow-lg w-11 h-11"
                        title="موقعي الحالي">
                        <LocateFixed className="w-5 h-5" />
                      </Button>
                      <Button size="icon" onClick={handleQuickRequestFromMapCenter}
                        className="rounded-full bg-[#FFB900] text-[#030957] hover:bg-[#FFB900]/90 shadow-lg w-12 h-12"
                        title="إنشاء طلب من مركز الخريطة">
                        <Plus className="w-6 h-6" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </Card>

            {/* Legend */}
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
              <LegendDot color="#030957" label="عقارات" />
              <LegendDot color="#FFB900" label="فروع" />
              <LegendDot color="#0ea5e9" label="طلب عادي" />
              <LegendDot color="#f97316" label="أولوية عالية" />
              <LegendDot color="#dc2626" label="تجاوز SLA" pulse />
            </div>
          </section>
        </div>
      </main>

      {/* Keyboard shortcuts overlay */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowShortcuts(false)}>
          <Card className="w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-[#030957] flex items-center gap-2">
                <Keyboard className="w-4 h-4" /> اختصارات لوحة المفاتيح
              </h3>
              <Button size="icon" variant="ghost" onClick={() => setShowShortcuts(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2 text-sm">
              {[
                ['/', 'تركيز شريط البحث'],
                ['F', 'تبديل Heatmap'],
                ['C', 'تبديل Clusters'],
                ['R', 'تحديث البيانات'],
                ['Esc', 'إغلاق التفاصيل'],
                ['?', 'إظهار/إخفاء هذه القائمة'],
              ].map(([k, label]) => (
                <div key={k} className="flex items-center justify-between border-b pb-1.5">
                  <span className="text-slate-700">{label}</span>
                  <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-xs font-mono">{k}</kbd>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Detail Side Sheet */}
      <Sheet open={!!selectedItem} onOpenChange={(o) => !o && setSelectedItem(null)}>
        <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto" dir="rtl">
          <SheetHeader>
            <SheetTitle className="text-[#030957]">
              {selectedItem?.kind === "technician" && "تفاصيل الفني"}
              {selectedItem?.kind === "branch" && "تفاصيل الفرع"}
              {selectedItem?.kind === "property" && "تفاصيل العقار"}
              {selectedItem?.kind === "request" && "تفاصيل الطلب"}
            </SheetTitle>
          </SheetHeader>

          {selectedItem?.kind === "technician" && (
            <TechnicianDetail t={selectedItem.data}
              onFollow={() => handleFollowTechnician(selectedItem.data)}
              onWhatsApp={() => openWhatsApp(`مرحباً ${selectedItem.data.name}، رجاءً تواصل بخصوص مهمة جديدة.`)}
              onCall={() => selectedItem.data.phone && window.open(`tel:${selectedItem.data.phone}`)}
            />
          )}
          {selectedItem?.kind === "branch" && (
            <BranchDetail b={selectedItem.data}
              onCreateRequest={() => handleQuickRequestFromLocation(
                parseFloat(selectedItem.data.latitude!), parseFloat(selectedItem.data.longitude!),
                { branch_id: selectedItem.data.id }
              )}
              onCall={() => selectedItem.data.phone && window.open(`tel:${selectedItem.data.phone}`)}
            />
          )}
          {selectedItem?.kind === "property" && (
            <PropertyDetail p={selectedItem.data}
              onCreateRequest={() => handleQuickRequestFromLocation(
                selectedItem.data.latitude!, selectedItem.data.longitude!,
                { property_id: selectedItem.data.id }
              )}
            />
          )}
          {selectedItem?.kind === "request" && (
            <RequestDetail r={selectedItem.data} technicians={technicians}
              isAuthorized={isAuthorized}
              onAssign={(techId) => handleAssignTechnician(selectedItem.data.id, techId)}
              onOpenRequest={() => navigate(`/requests/${selectedItem.data.id}`)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─────────── Sub-components ───────────
function Kpi({ label, value, accent, danger }: { label: string; value: number; accent?: boolean; danger?: boolean }) {
  return (
    <div className={`rounded-lg px-3 py-1.5 ${danger ? "bg-red-500/20 border border-red-400/30" : accent ? "bg-[#FFB900]/20 border border-[#FFB900]/30" : "bg-white/5 border border-white/10"}`}>
      <div className={`text-base font-bold ${danger ? "text-red-200" : accent ? "text-[#FFB900]" : "text-white"}`}>{value}</div>
      <div className="text-[10px] text-white/70">{label}</div>
    </div>
  );
}

function LayerToggle({ icon, label, count, checked, onChange }: {
  icon: React.ReactNode; label: string; count?: number; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-1.5 text-sm text-slate-700">
        {icon}<span>{label}</span>
        {count !== undefined && <Badge variant="secondary" className="text-[10px] h-4">{count}</Badge>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function LegendDot({ color, label, pulse }: { color: string; label: string; pulse?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-3 h-3 rounded-full ${pulse ? "animate-pulse" : ""}`} style={{ background: color }} />
      <span>{label}</span>
    </div>
  );
}

function TechnicianDetail({ t, onFollow, onWhatsApp, onCall }: any) {
  const status = mapStatusToMapLabel(t.status || 'offline');
  return (
    <div className="space-y-4 mt-4">
      <div>
        <div className="text-lg font-bold text-[#030957]">{t.name}</div>
        <div className="text-sm text-muted-foreground">{t.specialization}</div>
        <Badge className="mt-2" variant={status === "available" ? "default" : "secondary"}>
          {status === "available" ? "متاح الآن" : status === "busy" ? "مشغول" : "غير متصل"}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-slate-50 p-2 rounded"><span className="text-muted-foreground">التقييم: </span><b>{t.rating?.toFixed(1) || "—"}</b></div>
        <div className="bg-slate-50 p-2 rounded"><span className="text-muted-foreground">آخر تحديث: </span><b className="text-xs">{t.location_updated_at ? new Date(t.location_updated_at).toLocaleTimeString('ar-EG') : "—"}</b></div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Button onClick={onFollow} className="bg-[#030957] hover:bg-[#040a6a]"><MapPin className="w-4 h-4 ml-1"/>تتبع</Button>
        <Button onClick={onWhatsApp} variant="outline"><MessageCircle className="w-4 h-4 ml-1"/>واتساب</Button>
        <Button onClick={onCall} variant="outline" disabled={!t.phone}><Phone className="w-4 h-4 ml-1"/>اتصال</Button>
      </div>
    </div>
  );
}

function BranchDetail({ b, onCreateRequest, onCall }: any) {
  return (
    <div className="space-y-4 mt-4">
      <div>
        <div className="text-lg font-bold text-[#030957]">{b.branch}</div>
        <div className="text-sm text-muted-foreground">{b.address || "—"}</div>
        {b.district && <Badge variant="outline" className="mt-2">{b.district}</Badge>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={onCreateRequest} className="bg-[#FFB900] text-[#030957] hover:bg-[#FFB900]/90">
          <ClipboardList className="w-4 h-4 ml-1"/>طلب صيانة
        </Button>
        <Button onClick={onCall} variant="outline" disabled={!b.phone}><Phone className="w-4 h-4 ml-1"/>اتصال</Button>
      </div>
    </div>
  );
}

function PropertyDetail({ p, onCreateRequest }: any) {
  return (
    <div className="space-y-4 mt-4">
      <div>
        <div className="text-lg font-bold text-[#030957]">{p.name}</div>
        {p.code && <Badge className="bg-[#FFB900] text-[#030957] mt-1">{p.code}</Badge>}
        <div className="text-sm text-muted-foreground mt-2">{p.address || "—"}</div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-slate-50 p-2 rounded">النوع: <b>{p.type}</b></div>
        <div className="bg-slate-50 p-2 rounded">الحالة: <b>{p.status}</b></div>
      </div>
      <Button onClick={onCreateRequest} className="w-full bg-[#FFB900] text-[#030957] hover:bg-[#FFB900]/90">
        <ClipboardList className="w-4 h-4 ml-1"/>إنشاء طلب صيانة
      </Button>
    </div>
  );
}

function RequestDetail({ r, technicians, isAuthorized, onAssign, onOpenRequest }: any) {
  const stage = WORKFLOW_STAGES[r.workflow_stage as WorkflowStage];
  const [selTech, setSelTech] = useState<string>("");
  return (
    <div className="space-y-4 mt-4">
      <div>
        <div className="text-lg font-bold text-[#030957]">{r.request_number}</div>
        <div className="text-sm text-muted-foreground">{r.customer_display}</div>
        <div className="flex gap-2 mt-2">
          <Badge style={{ background: stage?.color, color: 'white' }}>{stage?.label || r.workflow_stage}</Badge>
          <Badge style={{ background: PRIORITY_COLOR[r.priority] || "#0ea5e9", color: 'white' }}>{r.priority}</Badge>
          {r.is_sla_breached && <Badge variant="destructive"><AlertTriangle className="w-3 h-3 ml-1"/>SLA</Badge>}
        </div>
      </div>

      {isAuthorized && (
        <div className="space-y-2 border-t pt-3">
          <Label className="text-xs font-bold text-[#030957]">تعيين فني</Label>
          <select value={selTech} onChange={(e) => setSelTech(e.target.value)}
            className="w-full text-sm border rounded-md p-2 bg-white">
            <option value="">— اختر فنياً —</option>
            {technicians.filter((t: any) => t.status === 'online').map((t: any) => (
              <option key={t.id} value={t.id}>{t.name} • {t.specialization}</option>
            ))}
          </select>
          <Button disabled={!selTech} onClick={() => onAssign(selTech)}
            className="w-full bg-[#030957] hover:bg-[#040a6a]">
            <CheckCircle2 className="w-4 h-4 ml-1"/>تعيين الفني
          </Button>
        </div>
      )}

      <Button onClick={onOpenRequest} variant="outline" className="w-full">فتح الطلب الكامل</Button>
    </div>
  );
}
