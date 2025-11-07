import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";
import { FilteredPropertiesInterface } from "./page";

interface OwnerInterface {
  _id: string;
  name: string;
  email: string;
  phone: string;
  profilePic: string;
  nationality: string;
  gender: string;
  spokenLanguage: string;
  address: string;
  role: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PropertyListProps {
  properties: FilteredPropertiesInterface[];
  isSearchTerm?: boolean;
}

const PropertyList = ({ properties, isSearchTerm = false }: PropertyListProps) => {
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const [ownersMap, setOwnersMap] = useState<Map<string, OwnerInterface>>(new Map());
  const [loadingOwners, setLoadingOwners] = useState<Set<string>>(new Set());

  const fetchOwner = async (userId: string) => {
    if (loadingOwners.has(userId) || ownersMap.has(userId)) return;

    try {
      setLoadingOwners((prev) => new Set(prev).add(userId));

      const response = await axios.post(`/api/property/ownerFromProperty`, { userId });

      if (response.data.success) {
        setOwnersMap((prev) => {
          const newMap = new Map(prev);
          newMap.set(userId, response.data.data.owner);
          return newMap;
        });
      } else {
        console.error(`Failed to fetch owner for userId ${userId}`);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Error fetching owner:", {
          status: error.response?.status,
          data: error.response?.data,
        });
      }
    } finally {
      setLoadingOwners((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  useEffect(() => {
    if (!properties?.length) return;
    const uniqueUserIds = Array.from(new Set(properties.map((p) => p.userId).filter(Boolean)));
    uniqueUserIds.forEach((userId) => fetchOwner(userId));
  }, [properties]);

  const toggleFlip = (id: string) => {
    setFlippedCards((prev) => {
      const newSet = new Set(prev);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  };

  return (
    <div className="border border-neutral-700 rounded-md p-4">
      <h2 className="text-xl font-semibold mb-4">Properties</h2>

      <div className="w-full flex flex-wrap justify-center gap-6">
        {properties?.map((property) => {
          const propertyId = property._id.toString();
          const isFlipped = flippedCards.has(propertyId);
          const owner = ownersMap.get(property.userId);
          const isLoadingOwner = loadingOwners.has(property.userId);

          return (
            <div
              key={propertyId}
              className="relative w-80 h-96 cursor-pointer"
              style={{ perspective: "1000px" }}
              onDoubleClick={() => toggleFlip(propertyId)}
            >
              <div
                className={`relative w-full h-full transition-transform duration-500`}
                style={{
                  transformStyle: "preserve-3d",
                  transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
              >
                {/* Front Side */}
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
                    <div className="absolute top-3 right-3 bg-white text-black font-semibold px-3 py-1 rounded-md shadow-lg">
                      {property.rentalType}
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold text-white">
                        €
                        {property.rentalType === "Short Term"
                          ? property.basePrice
                          : property.basePriceLongTerm}
                      </div>
                      <div
                        className="bg-white hover:bg-neutral-200 text-black p-2 rounded-md shadow-md transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(
                            `https://www.vacationsaga.com/listing-stay-detail/${propertyId}`,
                            "_blank"
                          );
                        }}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </div>
                    </div>

                    {isSearchTerm && (
                      <div className="text-sm text-neutral-300 space-y-2">
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
                      Double click to see details
                    </div>
                  </div>
                </div>

                {/* Back Side */}
                <div
                  className="absolute w-full h-full border border-neutral-700 rounded-lg bg-neutral-900 p-6 overflow-y-auto"
                  style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                  <div className="h-full flex flex-col justify-between">
                    <div className="space-y-4 text-sm">
                      <div>
                        <div className="text-neutral-400 text-xs uppercase tracking-wider mb-1">
                          Location
                        </div>
                        <div className="text-white font-medium">
                          {property.city}, {property.state}
                          <div className="text-neutral-300">{property.country}</div>
                        </div>
                      </div>

                      <div className="border-t border-neutral-700 pt-3">
                        <div className="text-neutral-400 text-xs uppercase tracking-wider mb-2">
                          Property Owner
                        </div>

                        {isLoadingOwner ? (
                          <div className="text-neutral-300 text-xs">Loading owner info...</div>
                        ) : owner ? (
                          <>
                            <div className="text-white font-medium mb-1">{owner.name}</div>
                            {owner?.phone && owner.phone !== "0" && (
                              <div className="text-neutral-300 text-xs">{owner.phone}</div>
                            )}
                            {owner.email && (
                              <div className="text-neutral-300 text-xs truncate">
                                {owner.email}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-xs">Owner info unavailable</div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 text-xs text-neutral-500 text-center">
                      Double click to flip back
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
