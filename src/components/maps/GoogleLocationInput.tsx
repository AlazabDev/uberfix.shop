import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Navigation } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  type?: 'vendor' | 'request' | 'user' | 'branch';
  icon?: string;
  color?: string;
  data?: Record<string, string | number | boolean>;
}

interface GoogleLocationInputProps {
  latitude?: number;
  longitude?: number;
  onLocationSelect?: (lat: number, lng: number, address?: string) => void;
  markers?: MapMarker[];
  zoom?: number;
  height?: string;
  interactive?: boolean;
  onMarkerClick?: (marker: MapMarker) => void;
}

export const GoogleLocationInput: React.FC<GoogleLocationInputProps> = ({
  latitude = 30.0444,
  longitude = 31.2357,
  onLocationSelect,
  markers = [],
  height: _height = '400px',
  interactive = true,
}) => {
  const [lat, setLat] = useState(latitude.toString());
  const [lng, setLng] = useState(longitude.toString());
  const { toast } = useToast();

  const handleLocationUpdate = () => {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    
    if (isNaN(latNum) || isNaN(lngNum)) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال أرقام صحيحة",
        variant: "destructive",
      });
      return;
    }
    
    onLocationSelect?.(latNum, lngNum);
    toast({
      title: "تم تحديث الموقع",
      description: `${latNum.toFixed(6)}, ${lngNum.toFixed(6)}`,
    });
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "خطأ",
        description: "المتصفح لا يدعم تحديد الموقع",
        variant: "destructive",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLat = position.coords.latitude;
        const newLng = position.coords.longitude;
        setLat(newLat.toString());
        setLng(newLng.toString());
        onLocationSelect?.(newLat, newLng);
        toast({
          title: "تم تحديد الموقع",
          description: `${newLat.toFixed(6)}, ${newLng.toFixed(6)}`,
        });
      },
      (error) => {
        console.error('Error getting location:', error);
        toast({
          title: "خطأ",
          description: "فشل تحديد الموقع الحالي",
          variant: "destructive",
        });
      }
    );
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="map-latitude">خط العرض</Label>
            <Input
              id="map-latitude"
              type="number"
              step="0.000001"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              disabled={!interactive}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="map-longitude">خط الطول</Label>
            <Input
              id="map-longitude"
              type="number"
              step="0.000001"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              disabled={!interactive}
            />
          </div>
        </div>

        {interactive && (
          <div className="flex gap-2">
            <Button 
              onClick={handleLocationUpdate} 
              className="flex-1"
              variant="outline"
            >
              <MapPin className="h-4 w-4 ml-2" />
              تحديث
            </Button>
            <Button 
              onClick={getCurrentLocation} 
              variant="outline"
              className="gap-2"
            >
              <Navigation className="h-4 w-4" />
              موقعي
            </Button>
          </div>
        )}

        {markers.length > 0 && (
          <div className="p-3 rounded-md bg-muted text-sm">
            <p className="font-medium mb-2">المواقع المحددة ({markers.length}):</p>
            {markers.slice(0, 3).map(marker => (
              <p key={marker.id} className="text-xs text-muted-foreground">
                • {marker.title}
              </p>
            ))}
            {markers.length > 3 && (
              <p className="text-xs text-muted-foreground mt-1">
                +{markers.length - 3} موقع آخر
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
