import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, X, Loader2 } from 'lucide-react';
import { loadGoogleMaps } from '@/lib/googleMapsLoader';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PlaceResult {
  address: string;
  lat: number;
  lng: number;
  placeId?: string;
  city?: string;
  district?: string;
  country?: string;
}

interface GooglePlacesAutocompleteProps {
  value?: string;
  placeholder?: string;
  onPlaceSelect: (place: PlaceResult) => void;
  showMap?: boolean;
  mapHeight?: string;
  className?: string;
  disabled?: boolean;
  country?: string;
}

export const GooglePlacesAutocomplete: React.FC<GooglePlacesAutocompleteProps> = ({
  value = '',
  placeholder = 'ابحث عن عنوان...',
  onPlaceSelect,
  showMap = false,
  mapHeight = '250px',
  className,
  disabled = false,
  country = 'eg'
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  
  const [inputValue, setInputValue] = useState(value);
  const [loading, setLoading] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  
  const { toast } = useToast();

  // Initialize Google Maps and Autocomplete
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setLoading(true);
        await loadGoogleMaps();

        if (!mounted || !inputRef.current) return;

        // Initialize Autocomplete
        autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country },
          fields: ['address_components', 'geometry', 'formatted_address', 'place_id', 'name'],
          types: ['geocode', 'establishment']
        });

        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current?.getPlace();
          if (!place?.geometry?.location) return;

          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          
          // Extract address components
          let city = '';
          let district = '';
          let countryName = '';
          
          place.address_components?.forEach(component => {
            if (component.types.includes('locality')) {
              city = component.long_name;
            }
            if (component.types.includes('sublocality') || component.types.includes('neighborhood')) {
              district = component.long_name;
            }
            if (component.types.includes('country')) {
              countryName = component.long_name;
            }
          });

          const result: PlaceResult = {
            address: place.formatted_address || '',
            lat,
            lng,
            placeId: place.place_id,
            city,
            district,
            country: countryName
          };

          setInputValue(result.address);
          setSelectedPlace(result);
          onPlaceSelect(result);

          // Update map marker
          if (mapInstanceRef.current && markerRef.current) {
            mapInstanceRef.current.setCenter({ lat, lng });
            mapInstanceRef.current.setZoom(16);
            markerRef.current.position = { lat, lng };
          }
        });

        // Initialize Map if needed
        if (showMap && mapRef.current) {
          setMapLoading(true);
          const defaultCenter = { lat: 30.0444, lng: 31.2357 }; // Cairo

          mapInstanceRef.current = new google.maps.Map(mapRef.current, {
            center: defaultCenter,
            zoom: 12,
            mapId: 'b41c60a3f8e58bdb15b2c668',
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
          });

          // Create marker
          const markerContent = document.createElement('div');
          markerContent.innerHTML = `
            <div style="
              width: 40px;
              height: 50px;
              background: linear-gradient(135deg, #f5bf23 0%, #e6a800 100%);
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              border: 3px solid white;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <span style="transform: rotate(45deg); font-size: 18px;">📍</span>
            </div>
          `;

          markerRef.current = new google.maps.marker.AdvancedMarkerElement({
            map: mapInstanceRef.current,
            position: defaultCenter,
            content: markerContent,
            gmpDraggable: true
          });

          // Handle marker drag
          markerRef.current.addListener('dragend', async () => {
            const position = markerRef.current?.position;
            if (!position) return;

            const lat = typeof position.lat === 'function' ? position.lat() : position.lat;
            const lng = typeof position.lng === 'function' ? position.lng() : position.lng;

            // Reverse geocode
            const geocoder = new google.maps.Geocoder();
            try {
              const response = await geocoder.geocode({ location: { lat, lng } });
              if (response.results[0]) {
                const place = response.results[0];
                
                let city = '';
                let district = '';
                let countryName = '';
                
                place.address_components?.forEach(component => {
                  if (component.types.includes('locality')) city = component.long_name;
                  if (component.types.includes('sublocality')) district = component.long_name;
                  if (component.types.includes('country')) countryName = component.long_name;
                });

                const result: PlaceResult = {
                  address: place.formatted_address,
                  lat,
                  lng,
                  placeId: place.place_id,
                  city,
                  district,
                  country: countryName
                };

                setInputValue(result.address);
                setSelectedPlace(result);
                onPlaceSelect(result);
              }
            } catch (err) {
              console.error('Geocoding error:', err);
            }
          });

          // Handle map click
          mapInstanceRef.current.addListener('click', async (e: any) => {
            if (!e.latLng || !markerRef.current) return;

            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            
            markerRef.current.position = { lat, lng };

            // Reverse geocode
            const geocoder = new google.maps.Geocoder();
            try {
              const response = await geocoder.geocode({ location: { lat, lng } });
              if (response.results[0]) {
                const place = response.results[0];
                
                let city = '';
                let district = '';
                let countryName = '';
                
                place.address_components?.forEach(component => {
                  if (component.types.includes('locality')) city = component.long_name;
                  if (component.types.includes('sublocality')) district = component.long_name;
                  if (component.types.includes('country')) countryName = component.long_name;
                });

                const result: PlaceResult = {
                  address: place.formatted_address,
                  lat,
                  lng,
                  placeId: place.place_id,
                  city,
                  district,
                  country: countryName
                };

                setInputValue(result.address);
                setSelectedPlace(result);
                onPlaceSelect(result);
              }
            } catch (err) {
              console.error('Geocoding error:', err);
            }
          });

          setMapLoading(false);
        }

        setLoading(false);
      } catch (err) {
        console.error('Google Maps initialization error:', err);
        setLoading(false);
        setMapLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [country, onPlaceSelect, showMap]);

  // Get current location
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast({
        title: 'خطأ',
        description: 'المتصفح لا يدعم تحديد الموقع',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        // Update map
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setCenter({ lat, lng });
          mapInstanceRef.current.setZoom(16);
          markerRef.current.position = { lat, lng };
        }

        // Reverse geocode
        const geocoder = new google.maps.Geocoder();
        try {
          const response = await geocoder.geocode({ location: { lat, lng } });
          if (response.results[0]) {
            const place = response.results[0];
            
            let city = '';
            let district = '';
            let countryName = '';
            
            place.address_components?.forEach(component => {
              if (component.types.includes('locality')) city = component.long_name;
              if (component.types.includes('sublocality')) district = component.long_name;
              if (component.types.includes('country')) countryName = component.long_name;
            });

            const result: PlaceResult = {
              address: place.formatted_address,
              lat,
              lng,
              placeId: place.place_id,
              city,
              district,
              country: countryName
            };

            setInputValue(result.address);
            setSelectedPlace(result);
            onPlaceSelect(result);

            toast({
              title: 'تم تحديد الموقع',
              description: result.address.substring(0, 50) + '...'
            });
          }
        } catch (err) {
          console.error('Geocoding error:', err);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast({
          title: 'خطأ',
          description: 'فشل تحديد الموقع الحالي',
          variant: 'destructive'
        });
        setLoading(false);
      }
    );
  }, [onPlaceSelect, toast]);

  // Clear selection
  const clearSelection = () => {
    setInputValue('');
    setSelectedPlace(null);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="relative">
        <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          disabled={disabled || loading}
          className="pr-10 pl-20"
          dir="rtl"
        />
        <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {inputValue && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={clearSelection}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={getCurrentLocation}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Navigation className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {selectedPlace && (
        <div className="bg-muted/50 rounded-lg p-3 text-sm" dir="rtl">
          <div className="flex items-center gap-2 text-primary font-medium mb-1">
            <MapPin className="w-4 h-4" />
            <span>الموقع المحدد</span>
          </div>
          <p className="text-muted-foreground text-xs">{selectedPlace.address}</p>
          <p className="text-xs mt-1 text-muted-foreground/70">
            {selectedPlace.lat.toFixed(6)}, {selectedPlace.lng.toFixed(6)}
          </p>
        </div>
      )}

      {showMap && (
        <div className="relative rounded-lg overflow-hidden border border-border" style={{ height: mapHeight }}>
          {mapLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
          <div ref={mapRef} className="absolute inset-0" />
        </div>
      )}
    </div>
  );
};

export default GooglePlacesAutocomplete;
