import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { FilteredPropertiesInterface } from "./page";

interface PropertyListProps {
  properties: FilteredPropertiesInterface[];
  isSearchTerm?: boolean;
}

const PropertyList = ({ properties, isSearchTerm = false }: PropertyListProps) => {
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());

  const toggleFlip = (id: string) => {
    setFlippedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <div className="border border-neutral-700 rounded-md p-4">
      <h2 className="text-xl font-semibold mb-4">Properties</h2>

      <div className="w-full flex flex-wrap justify-center gap-6">
        {properties?.map((property) => {
          const isFlipped = flippedCards.has(property._id.toString());

          return (
            <div
              key={property._id.toString()}
              className="relative w-80 h-96 cursor-pointer"
              style={{ perspective: "1000px" }}
              onClick={() => toggleFlip(property._id.toString())}
            >
              <div
                className={`relative w-full h-full transition-transform duration-500`}
                style={{
                  transformStyle: "preserve-3d",
                  transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
              >
                <div
                  className="absolute w-full h-full border border-neutral-700 rounded-lg overflow-hidden bg-neutral-900"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <div className="relative h-64">
                    <img
                      src={property.propertyCoverFileUrl}
                      alt={`Property ${property.VSID}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 bg-white text-black font-semibold px-3 py-1 rounded-md shadow-lg">
                      {property.VSID}
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold text-white">
                        €{property.rentalType === "Short Term" ? property.basePrice : property.basePriceLongTerm}
                      </div>
                      <div
                        className="bg-white hover:bg-neutral-200 text-black p-2 rounded-md shadow-md transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(
                            `https://www.vacationsaga.com/listing-stay-detail/${property._id.toString()}`,
                            "_blank"
                          );
                        }}
                      >
                        <ExternalLink size={20} />
                      </div>
                    </div>

                    {isSearchTerm && (
                      <div className="space-y-2 text-sm text-neutral-300">
                        <div className="flex items-center gap-2">
                          <span className="bg-white text-black font-medium px-2 py-0.5 rounded text-xs">
                            Location
                          </span>
                          <span className="truncate">
                            {property.city}, {property.state}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-neutral-500 text-center pt-2 border-t border-neutral-700">
                      Click to see details
                    </div>
                  </div>
                </div>

                <div
                  className="absolute w-full h-full border border-neutral-700 rounded-lg bg-neutral-900 p-6"
                  style={{
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                  }}
                >
                  <div className="h-full flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-neutral-700 pb-3">
                        <div className="bg-white text-black font-semibold px-3 py-1 rounded-md">
                          {property.VSID}
                        </div>
                        <div className="text-xl font-bold text-white">
                          €{property.rentalType === "Short Term" ? property.basePrice : property.basePriceLongTerm}
                        </div>
                      </div>

                      <div className="space-y-3 text-sm">
                        {property.email && (
                          <div>
                            <div className="text-neutral-400 text-xs uppercase tracking-wider mb-1">
                              Email
                            </div>
                            <div className="text-white font-medium truncate">
                              {property.email}
                            </div>
                          </div>
                        )}

                        <div>
                          <div className="text-neutral-400 text-xs uppercase tracking-wider mb-1">
                            Location
                          </div>
                          <div className="text-white font-medium">
                            {property.city}, {property.state}
                            <div className="text-neutral-300">{property.country}</div>
                          </div>
                        </div>

                        <div>
                          <div className="text-neutral-400 text-xs uppercase tracking-wider mb-1">
                            Rental Type
                          </div>
                          <div className="text-white font-medium">
                            {property.rentalType}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <button
                        className="w-full bg-white hover:bg-neutral-200 text-black font-semibold py-2.5 rounded-md transition-colors flex items-center justify-center gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(
                            `https://www.vacationsaga.com/listing-stay-detail/${property._id.toString()}`,
                            "_blank"
                          );
                        }}
                      >
                        View Full Details
                        <ExternalLink size={16} />
                      </button>

                      <div className="text-xs text-neutral-500 text-center">
                        Click to flip back
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PropertyList;
