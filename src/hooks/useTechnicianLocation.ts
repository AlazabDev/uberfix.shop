import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { supabaseLegacy } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface UseTechnicianLocationOptions {
  technicianId: string;
  updateInterval?: number; // milliseconds, default 60000 (1 minute)
  enabled?: boolean;
}

export const useTechnicianLocation = ({
  technicianId,
  updateInterval = 60000,
  enabled = true,
}: UseTechnicianLocationOptions) => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const { toast } = useToast();

  const updateLocationInDB = useCallback(async (lat: number, lng: number) => {
    try {
      const { error } = await supabaseLegacy.from('technicians')
        .update({
          current_latitude: lat,
          current_longitude: lng,
          location_updated_at: new Date().toISOString(),
        })
        .eq('id', technicianId);

      if (error) throw error;
    } catch (err: any) {
      console.error('Error updating location in DB:', err);
      setError(err.message);
    }
  }, [technicianId]);

  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      toast({
        title: 'خطأ',
        description: 'المتصفح لا يدعم تحديد الموقع',
        variant: 'destructive',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        };

        setLocation(locationData);
        setError(null);

        // Update in database
        updateLocationInDB(locationData.latitude, locationData.longitude);
      },
      (err) => {
        console.error('Error getting location:', err);
        setError(err.message);
        
        if (err.code === err.PERMISSION_DENIED) {
          toast({
            title: 'تحذير',
            description: 'يجب السماح بالوصول للموقع لتتبع الزيارات',
            variant: 'destructive',
          });
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [updateLocationInDB, toast]);

  const startTracking = useCallback(() => {
    if (!enabled) return;

    setIsTracking(true);
    getCurrentPosition(); // Get initial position

    // Set up interval for continuous tracking
    const intervalId = setInterval(() => {
      getCurrentPosition();
    }, updateInterval);

    return () => {
      clearInterval(intervalId);
      setIsTracking(false);
    };
  }, [enabled, getCurrentPosition, updateInterval]);

  const stopTracking = useCallback(() => {
    setIsTracking(false);
  }, []);

  useEffect(() => {
    if (enabled) {
      const cleanup = startTracking();
      return cleanup;
    }
  }, [enabled, startTracking]);

  return {
    location,
    error,
    isTracking,
    startTracking,
    stopTracking,
    getCurrentPosition,
  };
};

// Helper function to calculate distance between two points (Haversine formula)
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  
  return distance;
};
