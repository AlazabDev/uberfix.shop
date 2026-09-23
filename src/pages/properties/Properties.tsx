import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProperties } from "@/hooks/useProperties";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, LayoutGrid, Upload } from "lucide-react";
import { PropertyCard } from "@/components/properties/PropertyCard";
import { PropertyFilters } from "@/components/properties/PropertyFilters";
import { PropertyStatsCards } from "@/components/properties/PropertyStatsCards";
import { PropertySettingsMenu } from "@/components/properties/PropertySettingsMenu";
import { PropertyActionsDialog } from "@/components/properties/PropertyActionsDialog";

export default function Properties() {
  const navigate = useNavigate();
  const { properties, loading } = useProperties();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedProperty, setSelectedProperty] = useState<{ id: string; name: string } | null>(null);

  const filteredProperties = properties.filter((property) => {
    const matchesSearch =
      property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.code?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === "all" || property.type === filterType;
    const matchesStatus = filterStatus === "all" || property.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="flex items-center justify-between gap-4 mb-6">
        <PropertySettingsMenu />
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/properties/bulk-import")}
          >
            <Upload className="h-4 w-4 ml-2" />
            استيراد بالجملة
          </Button>
          <Button
            onClick={() => navigate("/properties/add")}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 ml-2" />
            عقار جديد
          </Button>
          <Button variant="outline" size="icon">
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <PropertyStatsCards properties={properties} />

      <PropertyFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterType={filterType}
        setFilterType={setFilterType}
      />

      {filteredProperties.length === 0 ? (
        <div className="text-center py-16">
          <div className="mb-4">
            <LayoutGrid className="mx-auto h-24 w-24 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            لا توجد عقارات
          </h3>
          <p className="text-muted-foreground mb-6">
            {searchTerm || filterType !== "all" || filterStatus !== "all"
              ? "لم يتم العثور على نتائج تطابق البحث"
              : "ابدأ بإضافة عقار جديد لإدارة طلبات الصيانة"}
          </p>
          <Button
            onClick={() => navigate("/properties/add")}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 ml-2" />
            إضافة عقار جديد
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {filteredProperties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onActionsClick={setSelectedProperty}
            />
          ))}
        </div>
      )}
      {selectedProperty && (
        <PropertyActionsDialog
          propertyId={selectedProperty.id}
          propertyName={selectedProperty.name}
          open={!!selectedProperty}
          onOpenChange={(open) => !open && setSelectedProperty(null)}
        />
      )}
    </div>
  );
}
