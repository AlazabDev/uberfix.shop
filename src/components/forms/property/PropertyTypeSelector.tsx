import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Building2, Home, Factory } from "lucide-react";

export type PropertyCategory = "residential" | "commercial" | "industrial";

interface PropertyTypeSelectorProps {
  selectedCategory: PropertyCategory;
  onCategoryChange: (category: PropertyCategory) => void;
}

const categories = [
  {
    id: "residential" as const,
    label: "سكني",
    description: "شقق، فيلات، مجمعات سكنية",
    icon: Home,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500",
  },
  {
    id: "commercial" as const,
    label: "تجاري",
    description: "محلات، مولات، مكاتب",
    icon: Building2,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500",
  },
  {
    id: "industrial" as const,
    label: "صناعي",
    description: "مصانع، مستودعات، ورش",
    icon: Factory,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500",
  },
];

export function PropertyTypeSelector({
  selectedCategory,
  onCategoryChange,
}: PropertyTypeSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4">
      {categories.map((cat) => {
        const Icon = cat.icon;
        const isSelected = selectedCategory === cat.id;

        return (
          <Card
            key={cat.id}
            className={cn(
              "cursor-pointer transition-all duration-200 hover:shadow-md border-2 relative",
              isSelected
                ? `${cat.borderColor} ${cat.bgColor}`
                : "border-border hover:border-muted-foreground/30"
            )}
            onClick={() => onCategoryChange(cat.id)}
          >
            <CardContent className="p-3 sm:p-4 flex flex-col items-center text-center gap-2">
              <div
                className={cn(
                  "p-2.5 sm:p-3 rounded-lg",
                  isSelected ? cat.bgColor : "bg-muted"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 sm:h-6 sm:w-6",
                    isSelected ? cat.color : "text-muted-foreground"
                  )}
                />
              </div>
              <h3
                className={cn(
                  "font-semibold text-sm sm:text-base",
                  isSelected ? cat.color : "text-foreground"
                )}
              >
                {cat.label}
              </h3>
              <p className="text-[11px] sm:text-xs text-muted-foreground leading-snug">
                {cat.description}
              </p>
              {isSelected && (
                <div
                  className={cn(
                    "absolute top-2 left-2 w-4 h-4 rounded-full border-2 flex items-center justify-center",
                    cat.borderColor
                  )}
                >
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full",
                      cat.color.replace("text-", "bg-")
                    )}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
