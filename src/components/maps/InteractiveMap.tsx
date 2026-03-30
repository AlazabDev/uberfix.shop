import { useEffect, useState, useRef, useCallback } from "react";
import { MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { loadGoogleMaps, getGoogleMapsId } from "@/lib/googleMapsLoader";

interface InteractiveMapProps {
  latitude: number;
  longitude: number;
  onLocationChange?: (lat: number, lng: number, address?: string) => void;
  height?: string;
  className?: string;
}

export function InteractiveMap({
  latitude,
  longitude,
  onLocationChange,
  height = "400px",
  className = "",
}: InteractiveMapProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const isCleaningUpRef = useRef(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [currentLat, setCurrentLat] = useState(latitude);
  const [currentLng, setCurrentLng] = useState(longitude);

  // Sync props to state
  useEffect(() => {
    setCurrentLat(latitude);
    setCurrentLng(longitude);
  }, [latitude, longitude]);

  // Initialize map ONCE ONLY
  useEffect(() => {
    let isMounted = true;

    const initMap = async () => {
      try {
        // Check if wrapper exists
        if (!wrapperRef.current) return;
        
        await loadGoogleMaps();
        if (!window.google?.maps || !isMounted || !wrapperRef.current) {
          throw new Error("Failed to load Google Maps SDK");
        }

        // Create a NEW div element that React won't track
        const mapDiv = document.createElement('div');
        mapDiv.style.width = '100%';
        mapDiv.style.height = '100%';
        mapDiv.style.minHeight = height;
        
        // Append to wrapper
        wrapperRef.current.appendChild(mapDiv);
        mapDivRef.current = mapDiv;

        const mapId = getGoogleMapsId();

        // Create map instance with mapId to prevent warnings
        const mapInstance = new google.maps.Map(mapDiv, {
          center: { lat: currentLat, lng: currentLng },
          zoom: 15,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          ...(mapId ? { mapId } : {}),
        });

        // Create marker
        const markerInstance = new google.maps.Marker({
          position: { lat: currentLat, lng: currentLng },
          map: mapInstance,
          draggable: true,
          animation: google.maps.Animation.DROP,
        });

        // Create geocoder
        const geocoder = new google.maps.Geocoder();

        // Store refs
        mapInstanceRef.current = mapInstance;
        markerInstanceRef.current = markerInstance;
        geocoderRef.current = geocoder;

        // Add marker dragend listener
        markerInstance.addListener("dragend", async () => {
          if (!isMounted || isCleaningUpRef.current) return;
          const pos = markerInstance.getPosition();
          if (!pos) return;

          const lat = pos.lat();
          const lng = pos.lng();
          
          setCurrentLat(lat);
          setCurrentLng(lng);

          try {
            const result = await geocoder.geocode({ location: { lat, lng } });
            const address = result.results[0]?.formatted_address;
            if (isMounted && !isCleaningUpRef.current) {
              onLocationChange?.(lat, lng, address);
              toast.success("تم تحديث الموقع");
            }
          } catch {
            if (isMounted && !isCleaningUpRef.current) {
              onLocationChange?.(lat, lng);
            }
          }
        });

        // Add map click listener
        mapInstance.addListener("click", async (e: any) => {
          if (!isMounted || isCleaningUpRef.current) return;
          if (!e.latLng) return;

          const lat = e.latLng.lat();
          const lng = e.latLng.lng();

          markerInstance.setPosition(e.latLng);
          mapInstance.panTo(e.latLng);
          
          setCurrentLat(lat);
          setCurrentLng(lng);

          try {
            const result = await geocoder.geocode({ location: { lat, lng } });
            const address = result.results[0]?.formatted_address;
            if (isMounted && !isCleaningUpRef.current) {
              onLocationChange?.(lat, lng, address);
              toast.success("تم تحديث الموقع");
            }
          } catch {
            if (isMounted && !isCleaningUpRef.current) {
              onLocationChange?.(lat, lng);
            }
          }
        });

        if (isMounted) {
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Map initialization error:", error);
        if (isMounted) {
          toast.error("فشل تحميل الخريطة");
          setIsLoading(false);
        }
      }
    };

    initMap();

    // CRITICAL: Cleanup to prevent DOM errors
    return () => {
      isMounted = false;
      isCleaningUpRef.current = true;

      try {
        // Remove marker
        if (markerInstanceRef.current) {
          markerInstanceRef.current.setMap(null);
          google.maps.event.clearInstanceListeners(markerInstanceRef.current);
          markerInstanceRef.current = null;
        }

        // Clear map listeners
        if (mapInstanceRef.current) {
          google.maps.event.clearInstanceListeners(mapInstanceRef.current);
          mapInstanceRef.current = null;
        }

        // Remove the map div we created (not tracked by React)
        if (mapDivRef.current && mapDivRef.current.parentNode) {
          mapDivRef.current.parentNode.removeChild(mapDivRef.current);
          mapDivRef.current = null;
        }

      geocoderRef.current = null;
      } catch {
        // Cleanup error, safe to ignore
      }
    };
  }, [onLocationChange, height]);

  // Update marker position when coordinates change
  useEffect(() => {
    if (!markerInstanceRef.current || !mapInstanceRef.current || isCleaningUpRef.current) return;

    try {
      const newPos = { lat: currentLat, lng: currentLng };
      markerInstanceRef.current.setPosition(newPos);
      mapInstanceRef.current.panTo(newPos);
    } catch (error) {
      console.error("Error updating marker position:", error);
    }
  }, [currentLat, currentLng]);

  const handleCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("المتصفح لا يدعم تحديد الموقع");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (isCleaningUpRef.current) return;
        
        const newLat = position.coords.latitude;
        const newLng = position.coords.longitude;
        const newPos = { lat: newLat, lng: newLng };

        setCurrentLat(newLat);
        setCurrentLng(newLng);

        if (markerInstanceRef.current) {
          try {
            markerInstanceRef.current.setPosition(newPos);
          } catch (error) {
            console.error("Error setting marker position:", error);
          }
        }
        
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.panTo(newPos);
            mapInstanceRef.current.setZoom(16);
          } catch (error) {
            console.error("Error panning map:", error);
          }
        }

        if (geocoderRef.current) {
          try {
            const result = await geocoderRef.current.geocode({ location: newPos });
            const address = result.results[0]?.formatted_address;
            onLocationChange?.(newLat, newLng, address);
          } catch {
            onLocationChange?.(newLat, newLng);
          }
        }
        
        toast.success("تم تحديد موقعك");
      },
      () => toast.error("فشل تحديد الموقع")
    );
  }, [onLocationChange]);

  return (
    <Card className={className}>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">الموقع على الخريطة</h3>
          </div>
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={handleCurrentLocation}
            disabled={isLoading}
          >
            <Navigation className="h-4 w-4 ml-1" />
            موقعي الحالي
          </Button>
        </div>

        <div
          ref={wrapperRef}
          style={{ height, width: "100%", minHeight: height, position: 'relative' }}
          className="rounded-lg border overflow-hidden bg-muted"
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
              <div className="text-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground">جاري تحميل الخريطة...</p>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          💡 انقر على الخريطة أو اسحب العلامة لتحديد الموقع
        </p>
      </div>
    </Card>
  );
}
