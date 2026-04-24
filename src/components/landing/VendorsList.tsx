import { Star, Phone, MapPin, Wrench, Zap, Paintbrush, Hammer, Droplets, Wind } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Vendor {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  reviews: number;
  distance: number;
  hourlyRate: number;
  phone: string;
  available: boolean;
  lat: number;
  lng: number;
}

const vendors: Vendor[] = [
  {
    id: "1",
    name: "محمد علي",
    specialty: "سباك",
    rating: 4.9,
    reviews: 203,
    distance: 8.6,
    hourlyRate: 120,
    phone: "+201234567891",
    available: true,
    lat: 30.0444,
    lng: 31.2357
  },
  {
    id: "2",
    name: "عمر فاروق",
    specialty: "فني تكييف",
    rating: 4.9,
    reviews: 142,
    distance: 10.7,
    hourlyRate: 180,
    phone: "+201234567893",
    available: true,
    lat: 30.0544,
    lng: 31.2457
  },
  {
    id: "3",
    name: "Sara Mostafa",
    specialty: "كهربائي",
    rating: 4.8,
    reviews: 87,
    distance: 187.1,
    hourlyRate: 150,
    phone: "+201133355566",
    available: true,
    lat: 31.2001,
    lng: 29.9187
  },
  {
    id: "4",
    name: "Omar Nasser",
    specialty: "نجار",
    rating: 4.8,
    reviews: 98,
    distance: 102.3,
    hourlyRate: 140,
    phone: "+201004006620",
    available: true,
    lat: 30.0131,
    lng: 31.2089
  },
  {
    id: "5",
    name: "Ahmed Ali",
    specialty: "سباك",
    rating: 4.8,
    reviews: 93,
    distance: 7.3,
    hourlyRate: 150,
    phone: "+201111111111",
    available: true,
    lat: 30.1286,
    lng: 31.2422
  },
  {
    id: "6",
    name: "Lina Ahmed",
    specialty: "كهربائي",
    rating: 4.8,
    reviews: 60,
    distance: 123.1,
    hourlyRate: 150,
    phone: "+201564875200",
    available: true,
    lat: 29.9668,
    lng: 30.9171
  },
  {
    id: "7",
    name: "أحمد حسين",
    specialty: "كهربائي",
    rating: 4.8,
    reviews: 114,
    distance: 7.3,
    hourlyRate: 150,
    phone: "+201234567890",
    available: true,
    lat: 31.0409,
    lng: 31.3785
  },
  {
    id: "8",
    name: "Mohamed Hassan",
    specialty: "سباك",
    rating: 4.8,
    reviews: 111,
    distance: 6.9,
    hourlyRate: 150,
    phone: "+201222333344",
    available: true,
    lat: 30.7865,
    lng: 31.0004
  },
  {
    id: "9",
    name: "خالد سعيد",
    specialty: "نجار",
    rating: 4.7,
    reviews: 102,
    distance: 7.0,
    hourlyRate: 130,
    phone: "+201234567892",
    available: false,
    lat: 30.5852,
    lng: 31.5021
  },
  {
    id: "10",
    name: "ياسر محمود",
    specialty: "دهان",
    rating: 4.6,
    reviews: 87,
    distance: 7.0,
    hourlyRate: 100,
    phone: "+201234567894",
    available: true,
    lat: 30.0344,
    lng: 31.2257
  }
];

const getSpecialtyIcon = (specialty: string) => {
  switch (specialty.toLowerCase()) {
    case "سباك":
      return <Droplets className="h-4 w-4" />;
    case "كهربائي":
      return <Zap className="h-4 w-4" />;
    case "نجار":
      return <Hammer className="h-4 w-4" />;
    case "دهان":
      return <Paintbrush className="h-4 w-4" />;
    case "فني تكييف":
      return <Wind className="h-4 w-4" />;
    default:
      return <Wrench className="h-4 w-4" />;
  }
};

const getSpecialtyColor = (specialty: string) => {
  switch (specialty.toLowerCase()) {
    case "سباك":
      return "from-blue-400 to-blue-600";
    case "كهربائي":
      return "from-yellow-400 to-yellow-600";
    case "نجار":
      return "from-amber-400 to-amber-600";
    case "دهان":
      return "from-purple-400 to-purple-600";
    case "فني تكييف":
      return "from-cyan-400 to-cyan-600";
    default:
      return "from-gray-400 to-gray-600";
  }
};

interface VendorsListProps {
  onVendorSelect?: (vendor: Vendor) => void;
}

export const VendorsList = ({ onVendorSelect }: VendorsListProps) => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          variant="default" 
          size="lg"
          className="fixed left-4 top-24 z-50 shadow-lg hover:shadow-xl transition-all animate-pulse-soft"
        >
          <Wrench className="h-5 w-5 ml-2" />
          الفنيون المتاحون ({vendors.length})
        </Button>
      </SheetTrigger>
      
      <SheetContent side="left" className="w-full sm:w-[400px] p-0">
        <SheetHeader className="p-6 pb-4 border-b bg-gradient-to-br from-primary/5 to-secondary/5">
          <SheetTitle className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" />
            الفنيون المتاحون
          </SheetTitle>
          <p className="text-sm text-muted-foreground text-right">
            {vendors.filter(v => v.available).length} فني متاح الآن • 10 فني إجمالي
          </p>
        </SheetHeader>

        <div className="p-4">
          <ScrollArea className="max-h-[800px]">
            <div className="space-y-3 pr-2">
              {vendors.map((vendor) => (
              <div
                key={vendor.id}
                onClick={() => onVendorSelect?.(vendor)}
                className={`
                  group relative bg-card border-2 rounded-xl p-4 cursor-pointer
                  transition-all duration-300 hover:shadow-lg hover:-translate-y-1
                  ${vendor.available 
                    ? 'border-border hover:border-primary/50' 
                    : 'border-border/50 opacity-60'
                  }
                `}
              >
                {/* Status Badge */}
                <Badge 
                  variant={vendor.available ? "default" : "secondary"}
                  className="absolute top-3 left-3 text-xs"
                >
                  {vendor.available ? "متاح" : "مشغول"}
                </Badge>

                <div className="flex items-start gap-3 mb-3">
                  {/* Avatar with specialty color */}
                  <Avatar className="h-14 w-14 border-4 border-white shadow-lg">
                    <AvatarFallback className={`bg-gradient-to-br ${getSpecialtyColor(vendor.specialty)} text-white font-bold`}>
                      {vendor.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                      {vendor.name}
                    </h3>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r ${getSpecialtyColor(vendor.specialty)} text-white text-xs font-medium`}>
                        {getSpecialtyIcon(vendor.specialty)}
                        <span>{vendor.specialty}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-bold">{vendor.rating}</span>
                    <span className="text-muted-foreground">({vendor.reviews})</span>
                  </div>
                  
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>{vendor.distance} كم</span>
                  </div>
                </div>

                {/* Price & Contact */}
                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">ج.م/ساعة</span>
                    <span className="text-lg font-bold text-primary">{vendor.hourlyRate}</span>
                  </div>

                  <a 
                    href={`tel:${vendor.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg
                             hover:bg-primary/90 transition-colors text-sm font-medium shadow-sm"
                  >
                    <Phone className="h-4 w-4" />
                    اتصال
                  </a>
                </div>

                {/* Hover Effect */}
                <div className="absolute inset-0 rounded-xl bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};

// Re-export vendors and Vendor type separately for tree-shaking
export { vendors, type Vendor };
