import { useEffect, useMemo, useState, useCallback } from "react";

import {
  Select,
  SelectItem,
  SelectLabel,
  SelectValue,
  SelectGroup,
  SelectTrigger,
  SelectContent,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover,PopoverContent,PopoverTrigger,} from "@/components/ui/popover";

import axios from "axios";
import { DateRange } from "react-day-picker";
import { X, Search, Star, Pin, Euro, ArrowUp, ArrowDown } from "lucide-react";

import { useAuthStore } from "@/AuthStore";
import { MultiAreaSelect } from "@/components/multipleAreaSearch/page";


interface PageProps {
  filters: FiltersInterfaces;
  setFilters: React.Dispatch<React.SetStateAction<FiltersInterfaces>>;
  selectedTab: string;
}
interface TargetType {
  _id: string;
  city: string;
  areas: AreaType[];
}
interface AreaType {
  _id: string;
  city: string;
  name: string;
}
export interface FiltersInterfaces {
  searchType: string;
  searchValue: string;
  propertyType: string;
  place: string[];
  area: string[];
  zone: string;
  metroZone: string;
  minPrice: number | null;
  maxPrice: number | null;
  sortByPrice?: "asc" | "desc" | "";
  beds: number;
  dateRange: DateRange | undefined;
  isImportant?: boolean;
  isPinned?: boolean;
}

const apartmentTypes = ["1 Bedroom","2 Bedroom","3 Bedroom","4 Bedroom","Villa","Pent House","Detached House","Loft","Shared Apartment","Maisotte","Studio",];

// Common name patterns and indicators
const NAME_INDICATORS = {
  // Common first name prefixes/suffixes
  prefixes: ["mc", "mac", "van", "von", "de", "la", "el"],
  suffixes: ["son","sen","ez","es","is","os","us","ian","yan","ski","sky","ov","ova",],
  // Common short names that might look like VSID
  commonShortNames: ["sam","max","ben","tom","tim","jim","bob","rob","dan","mat","pat","joe","jon","ann","amy","eva","ada","may","kay","joy","sue","kim","lee","ray",
    "roy","alex","john","mary", "jane", "jose", "anna", "nina","emma","ella","sara","eleni", "elena", "ivan", "igor", "olga","omar","alan","adam","eric", "evan", "mike",],
  // Patterns that indicate it's likely a name
  namePatterns: [
    /^[a-z]{2,}[aeiou][a-z]*$/i, // Contains vowels in natural positions
    /^[A-Z][a-z]+$/, // Capitalized like a name
    /^[a-z]+\s+[a-z]+$/i, // Has space (first + last name)
  ],
};

// Enhanced helper function to detect search type
const detectSearchType = (
  value: string
): {
  type: "phoneNumber" | "partialPhone" | "VSID" | "name";
  confidence: "high" | "medium" | "low";
  searchStrategy?: "exact" | "partial" | "fuzzy";
} => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return { type: "name", confidence: "low", searchStrategy: "fuzzy" };
  }

  // Extract digits for phone number analysis
  const digitsOnly = trimmedValue.replace(/\D/g, "");
  const hasLetters = /[a-zA-Z]/.test(trimmedValue);
  const hasSpecialChars = /[^a-zA-Z0-9\s+\-().]/.test(trimmedValue);
  const hasSpaces = /\s/.test(trimmedValue);

  // 1. Check for phone numbers first (most specific)
  if (!hasLetters && !hasSpecialChars) {
    // Full international phone number patterns
    const fullPhonePatterns = [
      /^\+?[1-9]\d{1,3}[\s\-.]?\(?\d{1,4}\)?[\s\-.]?\d{1,4}[\s\-.]?\d{1,4}[\s\-.]?\d{0,4}$/,
      /^\+?[1-9]\d{7,14}$/, // Simple international format
      /^00[1-9]\d{7,13}$/, // International prefix with 00
    ];

    const matchesFullPhone = fullPhonePatterns.some((pattern) =>
      pattern.test(trimmedValue)
    );

    if (matchesFullPhone && digitsOnly.length >= 7 && digitsOnly.length <= 15) {
      return {
        type: "phoneNumber",
        confidence: "high",
        searchStrategy: "exact",
      };
    }

    // Partial phone number (4-6 digits)
    if (digitsOnly.length >= 4 && digitsOnly.length <= 6) {
      return {
        type: "partialPhone",
        confidence: "medium",
        searchStrategy: "partial",
      };
    }

    // Looks like a phone but maybe incomplete (7+ digits)
    if (digitsOnly.length >= 7) {
      return {
        type: "phoneNumber",
        confidence: "medium",
        searchStrategy: "partial",
      };
    }
  }

  // 2. Check if it's likely a name before checking VSID
  const lowerValue = trimmedValue.toLowerCase();

  // 2a. Check against common short names
  if (NAME_INDICATORS.commonShortNames.includes(lowerValue)) {
    return { type: "name", confidence: "high", searchStrategy: "fuzzy" };
  }

  // 2b. Check if it has spaces (likely first + last name)
  if (hasSpaces && hasLetters) {
    return { type: "name", confidence: "high", searchStrategy: "fuzzy" };
  }

  // 2c. Check name patterns (vowel distribution, capitalization, etc.)
  const hasNaturalVowelPattern =
    /[aeiou]/i.test(trimmedValue) &&
    !/^[^aeiou]*$/i.test(trimmedValue) && // Has vowels
    !/^[aeiou]+$/i.test(trimmedValue); // Not only vowels

  // 2d. Check for name prefixes/suffixes
  const hasNamePrefix = NAME_INDICATORS.prefixes.some((prefix) =>
    lowerValue.startsWith(prefix)
  );
  const hasNameSuffix = NAME_INDICATORS.suffixes.some((suffix) =>
    lowerValue.endsWith(suffix)
  );

  // 3. Check for VSID (7 characters, alphanumeric)
  // But now with stricter rules to avoid false positives
  const vsidRegex = /^[A-Z0-9]{7}$/i;

  if (vsidRegex.test(trimmedValue)) {
    // Even if it matches VSID pattern, check if it's likely a name
    if (hasNaturalVowelPattern && !digitsOnly.length) {
      // All letters with natural vowel pattern = likely a name
      return { type: "name", confidence: "medium", searchStrategy: "fuzzy" };
    }

    // Must have at least one digit to be considered a VSID with high confidence
    if (digitsOnly.length > 0) {
      return { type: "VSID", confidence: "high", searchStrategy: "exact" };
    } else {
      // 7 letters only - could be VSID or name, lean towards name
      return { type: "name", confidence: "medium", searchStrategy: "fuzzy" };
    }
  }

  // 4. Check for partial VSID (3-6 chars)
  // But be more careful about false positives
  if (
    trimmedValue.length >= 3 &&
    trimmedValue.length < 7 &&
    /^[A-Z0-9]+$/i.test(trimmedValue)
  ) {
    // If it has natural vowel patterns and no digits, it's likely a name
    if (hasNaturalVowelPattern && !digitsOnly.length) {
      return { type: "name", confidence: "high", searchStrategy: "fuzzy" };
    }

    // If it has name indicators, it's a name
    if (hasNamePrefix || hasNameSuffix) {
      return { type: "name", confidence: "high", searchStrategy: "fuzzy" };
    }

    // Mixed alphanumeric or has unusual letter patterns = likely partial VSID
    if (digitsOnly.length > 0) {
      return { type: "VSID", confidence: "medium", searchStrategy: "partial" };
    }

    // Default short text to name
    return { type: "name", confidence: "medium", searchStrategy: "fuzzy" };
  }

  // 5. Check if it's purely numeric but doesn't fit phone patterns
  if (/^\d+$/.test(trimmedValue)) {
    if (digitsOnly.length < 4) {
      // Too short to be meaningful phone search
      return { type: "name", confidence: "low", searchStrategy: "fuzzy" };
    }
    // Could be a partial phone search
    return {
      type: "partialPhone",
      confidence: "low",
      searchStrategy: "partial",
    };
  }

  // 6. Default to name search for anything else
  return {
    type: "name",
    confidence: hasLetters ? "high" : "medium",
    searchStrategy: "fuzzy",
  };
};

// Helper to format the detected type for display
const getSearchTypeLabel = (
  detectionResult: ReturnType<typeof detectSearchType>
): string => {
  const { type, confidence, searchStrategy } = detectionResult;

  if (type === "partialPhone") {
    return "Phone (partial)";
  }

  const typeLabels = {
    phoneNumber: "Phone",
    VSID: "VSID",
    name: "Name",
  };

  const label = typeLabels[type as keyof typeof typeLabels] || "Search";

  // Add confidence indicator if not high
  if (confidence !== "high") {
    return `${label}?`;
  }

  return label;
};

// Helper to get icon for search type
const getSearchTypeIcon = (type: string): string => {
  switch (type) {
    case "phoneNumber":
    case "partialPhone":
      return "📱";
    case "VSID":
      return "🆔";
    case "name":
      return "Aa";
    default:
      return "🔍";
  }
};

const FilterBar = ({ filters, setFilters, selectedTab }: PageProps) => {
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({});
  const [locationws, setLocationws] = useState<string[]>([]);
  const [targets, setTargets] = useState<TargetType[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [areas, setAreas] = useState<AreaType[]>([]);
  const [isImportant, setIsImportant] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [localSearchValue, setLocalSearchValue] = useState<string>(
    filters.searchValue || ""
  );
  const [detectionResult, setDetectionResult] = useState<ReturnType<
    typeof detectSearchType
  > | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const token = useAuthStore((state) => state.token);
  const allocations = token?.allotedArea || [];

  const parsedAllocations =
    typeof allocations === "string"
      ? allocations.split(",").filter(Boolean)
      : allocations;

  // Handle search with Enter key or button click
  const handleSearch = useCallback(async () => {
    if (!localSearchValue.trim()) {
      // Clear search if empty
      setFilters({
        ...filters,
        searchType: "",
        searchValue: "",
      });
      return;
    }

    const detection = detectSearchType(localSearchValue);

    // Set searching state for UI feedback
    setIsSearching(true);

    // Map the detected type to your backend's expected searchType
    let backendSearchType = "";
    if (detection.type === "phoneNumber" || detection.type === "partialPhone") {
      backendSearchType = "phoneNumber";
    } else if (detection.type === "VSID") {
      backendSearchType = "VSID";
    } else {
      backendSearchType = "name";
    }

    // Update filters with searchType, searchValue, and search strategy
    setFilters({
      ...filters,
      searchType: backendSearchType,
      searchValue: localSearchValue.trim(),
      // You might want to pass the search strategy to backend
      // searchStrategy: detection.searchStrategy
    });

    // Reset searching state after a brief delay
    setTimeout(() => setIsSearching(false), 500);
  }, [localSearchValue, filters, setFilters]);

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  // Update local search value when typing with debounced detection
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalSearchValue(value);

    // Update detection result for visual feedback
    if (value.trim()) {
      const detection = detectSearchType(value);
      setDetectionResult(detection);
    } else {
      setDetectionResult(null);
    }
  };

  // Clear search
  const handleClearSearch = () => {
    setLocalSearchValue("");
    setDetectionResult(null);
    setFilters({
      ...filters,
      searchType: "",
      searchValue: "",
    });
  };

  // Sync local search value with filters
  useEffect(() => {
    setLocalSearchValue(filters.searchValue || "");
    if (filters.searchValue) {
      const detection = detectSearchType(filters.searchValue);
      setDetectionResult(detection);
    }
  }, [filters.searchValue]);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const endpoint = "/api/unregisteredOwners/getCounts";
        const res = await axios.post(endpoint, {
          filters: {
            ...filters,
            allocations: parsedAllocations,
          },
          availability:
            selectedTab === "available" ? "Available" : "Not Available",
        });

        setTypeCounts(res.data.counts || {});
      } catch (err) {
        console.error("Failed to fetch counts:", err);
      }
    };
    fetchCounts();
  }, [filters, selectedTab]);

  useEffect(() => {
    const getAllLocations = async () => {
      try {
        const res = await axios.get(`/api/addons/target/getAlLocations`);
        const fetchedCities: string[] = res.data.data.map(
          (loc: any) => loc.city
        );

        setLocationws(fetchedCities);
      } catch (error) {
        console.error("Error fetching locations:", error);
        setLocationws([]);
      }
    };

    getAllLocations();
  }, []);

  useEffect(() => {
    const fetchTargets = async () => {
      try {
        const res = await axios.get("/api/addons/target/getAreaFilterTarget");
        setTargets(res.data.data);
      } catch (error) {
        console.error("Error fetching targets:", error);
      }
    };
    fetchTargets();
  }, []);

  useEffect(() => {
    const target = targets.find((t) => t.city === selectedLocation);
    if (target) {
      setAreas(target.areas);
    } else {
      setAreas([]);
    }
    setFilters((prev) => ({ ...prev, area: [] }));
  }, [selectedLocation, targets]);

  const filteredTargets = useMemo(() => {
    if (!targets || targets.length === 0) return [];
    if (!parsedAllocations || parsedAllocations.length === 0) return targets;

    const lowerAlloc = parsedAllocations.map((a: string) => a.toLowerCase());
    return targets.filter((t) => lowerAlloc.includes(t.city.toLowerCase()));
  }, [parsedAllocations, targets]);

  useEffect(() => {
    if (!filteredTargets) return;

    const current =
      filters.place && filters.place.length > 0 ? filters.place[0] : "";
    const matchesCurrent =
      current &&
      filteredTargets.some(
        (t) => t.city.toLowerCase() === current.toLowerCase()
      );

    if (!matchesCurrent) {
      if (filteredTargets.length === 1) {
        setFilters((prev) => ({ ...prev, place: [filteredTargets[0].city] }));
      } else {
        setFilters((prev) => ({ ...prev, place: [] }));
      }
    }
  }, [filteredTargets]);

  useEffect(() => {
    const place =
      filters.place && filters.place.length > 0 ? filters.place[0] : "";

    if (!place) {
      setAreas([]);
      setSelectedLocation("");
      if (filters.area) setFilters((prev) => ({ ...prev, area: [] }));
      return;
    }

    const match = targets.find(
      (t) => t.city.toLowerCase() === place.toLowerCase()
    );

    if (match) {
      setAreas(match.areas || []);
      setSelectedLocation(match.city);
    } else {
      setAreas([]);
      setSelectedLocation(place);
    }

    if (filters.area) setFilters((prev) => ({ ...prev, area: [] }));
  }, [filters.place, targets]);

  const getActiveFilters = () => {
  const active: Array<{ key: string; label: string; value: any }> = [];

  if (filters.searchType && filters.searchValue) {
    active.push({
      key: "search",
      label: `${filters.searchType}: ${filters.searchValue}`,
      value: null,
    });
  }
  if (filters.propertyType) {
    active.push({
      key: "propertyType",
      label: `Type: ${filters.propertyType}`,
      value: null,
    });
  }
  if (filters.place && filters.place.length > 0) {
    active.push({
      key: "place",
      label: `Location: ${filters.place.join(", ")}`,
      value: null,
    });
  }
  
  // ✅ CHANGED: Individual area chips instead of combined
  if (filters.area && filters.area.length > 0) {
    filters.area.forEach((areaValue) => {
      active.push({
        key: `area-${areaValue}`,
        label: `Area: ${areaValue}`,
        value: areaValue, // ✅ Store the area value for removal
      });
    });
  }
  
  if (filters.zone) {
    active.push({ key: "zone", label: `Zone: ${filters.zone}`, value: null });
  }
  if (filters.metroZone) {
    active.push({
      key: "metroZone",
      label: `Metro: ${filters.metroZone}`,
      value: null,
    });
  }
  if (filters.minPrice !== null && filters.minPrice > 0) {
    active.push({
      key: "minPrice",
      label: `Min: ${filters.minPrice}`,
      value: null,
    });
  }
  if (filters.maxPrice !== null && filters.maxPrice > 0) {
    active.push({
      key: "maxPrice",
      label: `Max: ${filters.maxPrice}`,
      value: null,
    });
  }
  if (filters.sortByPrice) {
    active.push({
      key: "sortByPrice",
      label: `Sort: ${filters.sortByPrice}`,
      value: null,
    });
  }
  if (filters.beds > 0) {
    active.push({ key: "beds", label: `Beds: ${filters.beds}`, value: null });
  }

  if (filters.isImportant) {
    active.push({
      key: "isImportant",
      label: "⭐ Important",
      value: null,
    });
  }

  if (filters.isPinned) {
    active.push({ key: "isPinned", label: "📌 Pinned", value: null });
  }

  return active;
};
  const activeFilters = getActiveFilters();

  const removeFilter = (key: string) => {

     if (key.startsWith("area-")) {
    const areaToRemove = key.replace("area-", "");
    setFilters({
      ...filters,
      area: filters.area.filter((a) => a !== areaToRemove),
    });
    return; // ✅ Important: return early to skip the switch statement
  }

    const updatedFilters = { ...filters };

    switch (key) {
      case "search":
        updatedFilters.searchType = "";
        updatedFilters.searchValue = "";
        setLocalSearchValue("");
        setDetectionResult(null);
        break;
      case "propertyType":
        updatedFilters.propertyType = "";
        break;
      case "place":
        updatedFilters.place = [];
        break;
      // case "area":
      //   updatedFilters.area = [];
      //   break;
      case "zone":
        updatedFilters.zone = "";
        break;
      case "metroZone":
        updatedFilters.metroZone = "";
        break;
      case "minPrice":
        updatedFilters.minPrice = null;
        break;
      case "maxPrice":
        updatedFilters.maxPrice = null;
        break;
      case "sortByPrice":
        updatedFilters.sortByPrice = "";
        break;
      case "beds":
        updatedFilters.beds = 0;
        break;
      case "isImportant":
        updatedFilters.isImportant = false;
        break;
      case "isPinned":
        updatedFilters.isPinned = false;
      default:
        break;
    }

    setFilters(updatedFilters);
  };

  const clearAllFilters = () => {
    setLocalSearchValue("");
    setDetectionResult(null);
    setFilters({
      searchType: "",
      searchValue: "",
      propertyType: "",
      place: [],
      area: [],
      zone: "",
      metroZone: "",
      minPrice: null,
      maxPrice: null,
      sortByPrice: "",
      beds: 0,
      dateRange: undefined,
      isImportant: false,
    });
  };

  return (
    <div className="flex flex-col">
      <div className="  bg-background">
        <div className="flex flex-wrap items-center gap-2 p-2">
          {/* Enhanced Smart Search Box */}
          <div className="relative flex items-center">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search: name, phone (full/partial), or 7-char VSID"
                className={`w-72 h-9 pr-24 transition-all ${
                  isSearching ? "opacity-70" : ""
                }`}
                onChange={handleSearchInputChange}
                onKeyPress={handleKeyPress}
                value={localSearchValue}
                disabled={isSearching}
              />

              {/* Show detection result with confidence */}
              {detectionResult && localSearchValue && (
                <div className="absolute right-12 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs bg-background px-1 rounded">
                  <span className="text-base">
                    {getSearchTypeIcon(detectionResult.type)}
                  </span>
                  <span
                    className={`
                    ${
                      detectionResult.confidence === "high"
                        ? "text-green-600"
                        : detectionResult.confidence === "medium"
                        ? "text-yellow-600"
                        : "text-gray-500"
                    }
                  `}
                  >
                    {getSearchTypeLabel(detectionResult)}
                  </span>
                </div>
              )}

              {/* Clear button */}
              {localSearchValue && !isSearching && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-8 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded transition-opacity"
                  type="button"
                >
                  <X className="w-3 h-3 text-gray-500" />
                </button>
              )}

              {/* Search button */}
              <button
                onClick={handleSearch}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-all
                  ${
                    isSearching
                      ? "animate-pulse bg-blue-100"
                      : "hover:bg-gray-100"
                  }`}
                type="button"
                disabled={isSearching}
              >
                <Search
                  className={`w-4 h-4 ${
                    isSearching ? "text-blue-500" : "text-gray-500"
                  }`}
                />
              </button>
            </div>

            
          </div>

          <Select
            value={filters.propertyType}
            onValueChange={(value) =>
              setFilters({ ...filters, propertyType: value })
            }
          >
            <SelectTrigger className="w-44 h-9">
              <SelectValue placeholder="Property Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Property Type</SelectLabel>
                {apartmentTypes.sort().map((type) => {
                  return (
                    <SelectItem key={type} value={type}>
                      <div className="flex justify-between items-center w-full">
                        <span>{type}</span>
                        {typeCounts[type] && (
                          <span className="ml-2 text-xs bg-pink-600 text-white rounded-full px-2">
                            {typeCounts[type] ?? 0}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select
            onValueChange={(value) => {
              setFilters({ ...filters, place: value ? [value] : [] });
            }}
            value={filters.place.length > 0 ? filters.place[0] : ""}
          >
            <SelectTrigger className="w-40 h-9">
              <SelectValue
                placeholder={
                  parsedAllocations.length === 0
                    ? "Select location"
                    : parsedAllocations.length === 1 &&
                      filteredTargets.length === 1
                    ? filteredTargets[0].city
                    : "Select location"
                }
              />
            </SelectTrigger>

            <SelectContent>
              <SelectGroup>
                <SelectLabel>
                  {parsedAllocations.length === 0
                    ? "Locations"
                    : "Allotted Locations"}
                </SelectLabel>

                {filteredTargets.map((loc) => (
                  <SelectItem key={loc.city} value={loc.city}>
                    {loc.city}
                  </SelectItem>
                ))}

                {filteredTargets.length === 0 &&
                  parsedAllocations.length > 0 &&
                  parsedAllocations.map((city: string) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <div className="w-50">
            <MultiAreaSelect
              maxWidth="100%"
              data={[...areas]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((loc: AreaType) => ({
                  label: loc.name,
                  value: loc.name,
                }))}
              values={Array.isArray(filters.area) ? filters.area : []}
              save={(newValues: string[]) =>
                setFilters({ ...filters, area: newValues })
              }
              tooltipText="Select one or more areas"
            />
          </div>

         <Select
  onValueChange={(value) => setFilters({ ...filters, zone: value })}
  value={filters.zone}
>
  <SelectTrigger
    className={`w-36 h-9 flex items-center justify-between transition-all border
      ${
        filters.zone === "North"
          ? "border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400"
          : filters.zone === "South"
          ? "border-red-500 text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400"
          : filters.zone === "East"
          ? "border-green-500 text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400"
          : filters.zone === "West"
          ? "border-yellow-500 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30 dark:text-yellow-400"
          : filters.zone === "Center"
          ? "border-purple-500 text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400"
          : filters.zone?.includes("North-")
          ? "border-cyan-500 text-cyan-600 bg-cyan-50 dark:bg-cyan-900/30 dark:text-cyan-400"
          : filters.zone?.includes("South-")
          ? "border-pink-500 text-pink-600 bg-pink-50 dark:bg-pink-900/30 dark:text-pink-400"
          : "border-gray-400 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
      }`}
  >
    <SelectValue placeholder="Select Zone" />
  </SelectTrigger>
  <SelectContent>
    <SelectGroup>
      <SelectLabel>Zones</SelectLabel>

      <SelectItem value="North">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
          North
        </div>
      </SelectItem>

      <SelectItem value="South">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
          South
        </div>
      </SelectItem>

      <SelectItem value="East">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
          East
        </div>
      </SelectItem>

      <SelectItem value="West">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
          West
        </div>
      </SelectItem>

      <SelectItem value="Center">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
          Center
        </div>
      </SelectItem>

      <SelectItem value="North-East">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-500" />
          North-East
        </div>
      </SelectItem>

      <SelectItem value="North-West">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-600" />
          North-West
        </div>
      </SelectItem>

      <SelectItem value="South-East">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-pink-500" />
          South-East
        </div>
      </SelectItem>

      <SelectItem value="South-West">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-pink-600" />
          South-West
        </div>
      </SelectItem>
    </SelectGroup>
  </SelectContent>
</Select>


          <Select
            onValueChange={(value) =>
              setFilters({ ...filters, metroZone: value })
            }
            value={filters.metroZone}
          >
            <SelectTrigger
              className={`w-36 h-9 flex items-center justify-between transition-all border
      ${
        filters.metroZone === "Red Line"
          ? "border-red-500 text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400"
          : filters.metroZone === "Blue Line"
          ? "border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400"
          : filters.metroZone === "Green Line"
          ? "border-green-500 text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400"
          : filters.metroZone === "Yellow Line"
          ? "border-yellow-500 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30 dark:text-yellow-400"
          : filters.metroZone === "Purple Line"
          ? "border-purple-500 text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400"
          : "border-gray-400 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
      }`}
            >
              <SelectValue placeholder="Metro Line" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Metro Line</SelectLabel>
                <SelectItem value="Red Line">Red Line</SelectItem>
                <SelectItem value="Blue Line">Blue Line</SelectItem>
                <SelectItem value="Green Line">Green Line</SelectItem>
                <SelectItem value="Yellow Line">Yellow Line</SelectItem>
                <SelectItem value="Purple Line">Purple Line</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`h-9 flex items-center gap-2 px-3 transition-all border text-green-600 border-green-500 
    hover:bg-green-50 dark:hover:bg-green-900`}
              >
                <Euro className="h-4 w-4 text-green-600" />
                <span>Price Range</span>
              </Button>
            </PopoverTrigger>

            <PopoverContent className="w-56 p-2" align="start">
              <div className="flex gap-x-4">
                <div>
                  <Label htmlFor="minPrice">Min Price</Label>
                  <Input
                    id="minPrice"
                    value={filters.minPrice === null ? "" : filters.minPrice}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFilters({
                        ...filters,
                        minPrice: value === "" ? null : parseInt(value, 10),
                      });
                    }}
                    type="number"
                    placeholder="0"
                    autoFocus
                  />
                </div>
                <div>
                  <Label htmlFor="maxPrice">Max Price</Label>
                  <Input
                    id="maxPrice"
                    value={filters.maxPrice === null ? "" : filters.maxPrice}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFilters({
                        ...filters,
                        maxPrice: value === "" ? null : parseInt(value, 10),
                      });
                    }}
                    type="number"
                    placeholder="0"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            className={`h-9 flex items-center gap-2 px-3 transition-all border
    ${
      filters.sortByPrice === "asc"
        ? "bg-green-500 hover:bg-green-600 text-white border-green-500 dark:bg-green-400 dark:hover:bg-green-300 dark:text-gray-900"
        : filters.sortByPrice === "desc"
        ? "bg-blue-500 hover:bg-blue-600 text-white border-blue-500 dark:bg-blue-400 dark:hover:bg-blue-300 dark:text-gray-900"
        : "text-gray-600 border-gray-400 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
    }`}
            onClick={() => {
              setFilters({
                ...filters,
                sortByPrice:
                  filters.sortByPrice === "asc"
                    ? "desc"
                    : filters.sortByPrice === "desc"
                    ? ""
                    : "asc",
              });
            }}
          >
            {filters.sortByPrice === "asc" ? (
              <>
                <ArrowUp className="h-4 w-4" />
                <span>Increasing</span>
              </>
            ) : filters.sortByPrice === "desc" ? (
              <>
                <ArrowDown className="h-4 w-4" />
                <span>Decreasing</span>
              </>
            ) : (
              <>
                <ArrowUp className="h-4 w-4 text-gray-500" />
                <span>Sort by Price</span>
              </>
            )}
          </Button>

          <Button
            variant="outline"
            className={`h-9 flex items-center gap-2 px-3 transition-all border
    ${
      filters.isImportant
        ? "bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500 dark:bg-yellow-400 dark:hover:bg-yellow-300 dark:text-gray-900"
        : "text-yellow-500 border-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900"
    }`}
            onClick={() => {
              setFilters({
                ...filters,
                isImportant: !filters.isImportant,
              });
            }}
          >
            <Star
              className={`h-4 w-4 transition-all
      ${
        filters.isImportant
          ? "fill-white text-white dark:fill-gray-900 dark:text-gray-900"
          : "text-yellow-500"
      }`}
            />
            <span>Star</span>
          </Button>

          <Button
            variant="outline"
            className={`h-9 flex items-center gap-2 px-3 transition-all border
    ${
      filters.isPinned
        ? "bg-red-500 hover:bg-red-600 text-white border-red-500 dark:bg-red-400 dark:hover:bg-red-300 dark:text-gray-900"
        : "text-red-500 border-red-500 hover:bg-blue-50 dark:hover:bg-red-900"
    }`}
            onClick={() => {
              setFilters({
                ...filters,
                isPinned: !filters.isPinned,
              });
            }}
          >
            <Pin
              className={`h-4 w-4 transition-all
      ${
        filters.isPinned
          ? "fill-white text-white dark:fill-gray-900 dark:text-gray-900"
          : "text-red-500"
      }`}
            />
            <span>Pin</span>
          </Button>
        </div>
      </div>

      <div className="h-10 flex flex-wrap items-center gap-2 p-2 bg-muted/30 border border-border ">
        <div className="flex flex-wrap gap-2 flex-1">
          {activeFilters.map((filter) => (
            <div
              key={filter.key}
              className="inline-flex items-center gap-1 px-2 py-1 bg-background border border-border rounded-md text-xs"
            >
              <span>{filter.label}</span>
              <button
                onClick={() => removeFilter(filter.key)}
                className="hover:bg-accent rounded-sm p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        {activeFilters.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear All
          </Button>
        )}
      </div>
    </div>
  );
};


export default FilterBar;
