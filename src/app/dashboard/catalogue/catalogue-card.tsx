"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, MapPin } from "lucide-react";

import {
  Card,
  CardTitle,
  CardHeader,
  CardFooter,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import PropertyBadge from "./property-badge";
import { CatalogueInterface } from "./page";

// Using the provided interfaces
interface CategoryInterface {
  name: string;
  description: string;
  properties: string[];
}

interface CatalogueCardProps {
  catalogue: CatalogueInterface;
}

export default function CatalogueCard({ catalogue }: CatalogueCardProps) {
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

  const toggleCategory = (categoryName: string) => {
    setOpenCategories((prev) => ({
      ...prev,
      [categoryName]: !prev[categoryName],
    }));
  };

  return (
    <Card className="w-full max-w-3xl overflow-hidden transition-all duration-200 hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">{catalogue.name}</CardTitle>
            <div className="mt-1 flex items-center text-muted-foreground">
              <MapPin className="mr-1 h-4 w-4" />
              <span>{catalogue.location}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-base leading-relaxed">
          {catalogue.description}
        </CardDescription>

        <div className="mt-4">
          <h3 className="mb-2 text-lg font-semibold">
            Categories ({catalogue.categories.length})
          </h3>
          <div className="space-y-3">
            {catalogue.categories.map((category, index) => (
              <Collapsible
                key={`${category.name}-${index}`}
                open={openCategories[category.name]}
                onOpenChange={() => toggleCategory(category.name)}
                className="rounded-md border"
              >
                <div className="flex items-center justify-between p-4">
                  <div>
                    <h4 className="font-medium">{category.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {category.description}
                    </p>
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      {openCategories[category.name] ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      <span className="sr-only">Toggle category details</span>
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                  <div className="border-t p-4">
                    <h5 className="mb-2 text-sm font-medium">Properties:</h5>
                    <div className="flex flex-wrap gap-2">
                      {category.properties.map((property: any, propIndex) => (
                        <PropertyBadge
                          key={propIndex}
                          property={property.VSID}
                          bookedMonths={property.bookedMonths}
                          catalogueId={catalogue._id!}
                        />
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end border-t bg-muted/10 px-6 py-4">
        <Button variant="outline" className="mr-2">
          View Details
        </Button>
        <Button>Explore Catalogue</Button>
      </CardFooter>
    </Card>
  );
}
