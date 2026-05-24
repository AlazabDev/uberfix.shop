import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, RefreshCw, Clock, Route } from "lucide-react";
import { GoogleLocationInput as GoogleMap } from "@/modules/maps";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import { ar } from "date-fns/locale";
import { useVendorRouting } from "@/hooks/useVendorRouting";

interface VendorLocationTrackerProps {
  vendorId: string;
  currentLatitude: number | null;
  currentLongitude: number | null;
  isTrackingEnabled: boolean;
  destinationLatitude?: number | null;
  destinationLongitude?: number | null;
}

export const VendorLocationTracker = ({
  vendorId,
  currentLatitude,
  currentLongitude,
  isTrackingEnabled,
  destinationLatitude,
  destinationLongitude,
}: VendorLocationTrackerProps) => {
  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
    updatedAt: string | null;
  } | null>(
    currentLatitude && currentLongitude
      ? { lat: currentLatitude, lng: currentLongitude, updatedAt: null }
      : null
  );
  const [loading, setLoading] = useState(false);

  // Calculate route and ETA using edge function
  const { routeInfo, loading: routeLoading } = useVendorRouting({
    vendorLat: location?.lat || null,
    vendorLng: location?.lng || null,
    destinationLat: destinationLatitude || null,
    destinationLng: destinationLongitude || null,
  });

  useEffect(() => {
    if (!vendorId) return;

    // الاشتراك في التحديثات الفورية
    const channel = supabase
      .channel(`vendor-location-${vendorId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "vendors",
          filter: `id=eq.${vendorId}`,
        },
        (payload) => {
          const newData = payload.new as any;
          if (newData.current_latitude && newData.current_longitude) {
            setLocation({
              lat: newData.current_latitude,
              lng: newData.current_longitude,
              updatedAt: newData.location_updated_at,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [vendorId]);

  const refreshLocation = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("vendors")
        .select("current_latitude, current_longitude, location_updated_at")
        .eq("id", vendorId)
        .maybeSingle();

      if (error) throw error;

      if (data.current_latitude && data.current_longitude) {
        setLocation({
          lat: data.current_latitude,
          lng: data.current_longitude,
          updatedAt: data.location_updated_at,
        });
        toast({
          title: "تم تحديث الموقع",
          description: "تم تحديث موقع الفني بنجاح",
        });
      }
    } catch (error) {
      console.error("Error refreshing location:", error);
      toast({
        title: "خطأ",
        description: "فشل تحديث الموقع",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isTrackingEnabled) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Navigation className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">تتبع الموقع غير مفعل</p>
          <p className="text-sm text-muted-foreground">
            يجب على الفني تفعيل خاصية تتبع الموقع لعرض موقعه الحالي
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!location) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">لا يوجد موقع محدد</p>
          <p className="text-sm text-muted-foreground">
            لم يتم تحديد موقع الفني بعد
          </p>
          <Button onClick={refreshLocation} disabled={loading} className="mt-4">
            <RefreshCw className={`h-4 w-4 ml-2 ${loading ? "animate-spin" : ""}`} />
            تحديث الموقع
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-primary" />
              الموقع الحالي
            </CardTitle>
            <div className="flex items-center gap-2">
              {location.updatedAt && (
                <Badge variant="outline">
                  آخر تحديث:{" "}
                  {formatDistanceToNow(new Date(location.updatedAt), {
                    addSuffix: true,
                    locale: ar,
                  })}
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={refreshLocation}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ml-2 ${loading ? "animate-spin" : ""}`} />
                تحديث
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Route and ETA Information */}
          {routeInfo && destinationLatitude && destinationLongitude && (
            <div className="mb-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">الوقت المتوقع للوصول</p>
                        <p className="text-lg font-bold text-primary">
                          {format(new Date(routeInfo.eta), 'HH:mm', { locale: ar })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-secondary/5 border-secondary/20">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Route className="h-5 w-5 text-secondary" />
                      <div>
                        <p className="text-xs text-muted-foreground">المسافة</p>
                        <p className="text-lg font-bold">{routeInfo.distance}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-accent/5 border-accent/20">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Navigation className="h-5 w-5 text-accent" />
                      <div>
                        <p className="text-xs text-muted-foreground">مدة الرحلة</p>
                        <p className="text-lg font-bold">{routeInfo.duration}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          <div className="rounded-lg overflow-hidden border">
            <GoogleMap
              latitude={location.lat}
              longitude={location.lng}
              zoom={14}
              height="500px"
              interactive={true}
              markers={[
                {
                  id: vendorId,
                  lat: location.lat,
                  lng: location.lng,
                  title: "موقع الفني",
                  type: "vendor",
                  color: "green",
                },
                ...(destinationLatitude && destinationLongitude
                  ? [
                      {
                        id: "destination",
                        lat: destinationLatitude,
                        lng: destinationLongitude,
                        title: "موقع العميل",
                        type: "request" as const,
                        color: "blue",
                      },
                    ]
                  : []),
              ]}
            />
          </div>
          
          <div className="mt-4 p-4 bg-muted rounded-lg space-y-3">
            <div className="flex items-start gap-2">
              <MapPin className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">موقع الفني الحالي</p>
                <p className="text-sm text-muted-foreground">
                  خط العرض: {location.lat.toFixed(6)} | خط الطول:{" "}
                  {location.lng.toFixed(6)}
                </p>
              </div>
            </div>
            
            {routeLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>جاري حساب المسار...</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
