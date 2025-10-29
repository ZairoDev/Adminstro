"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Rocket, CheckCircle2, Sparkles, Info } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/AuthStore";
import axios from "axios";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Property {
  _id: string;
  title: string;
  description: string;
  images: string[];
  BoostID: string;
  vsid: string;
  createdAt: string;
  createdBy: string;
  lastReboostedAt?: string;
}

interface Token {
  role: string;
}

export default function BoostPropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
   const [searchFilter, setSearchFilter] = useState<"boostid" | "vsid">("boostid");
  const [reboostingIds, setReboostingIds] = useState<Set<string>>(new Set());
  const [reboostedIds, setReboostedIds] = useState<Set<string>>(new Set());
  
  const {token} = useAuthStore();

  // Helper function to check if property was reboosted within last 24 hours
  const isRecentlyReboosted = (lastReboostedAt?: string) => {
    if (!lastReboostedAt) return false;
    const oneDayAgo = new Date().getTime() - (24 * 60 * 60 * 1000);
    const reboostedTime = new Date(lastReboostedAt).getTime();
    return reboostedTime > oneDayAgo;
  };

  // Helper function to sort properties by most recent activity
  const sortPropertiesByActivity = (props: Property[]) => {
    return props.sort((a, b) => {
      // Get the most recent date for each property (either lastReboostedAt or createdAt)
      const aDate = a.lastReboostedAt 
        ? new Date(a.lastReboostedAt).getTime() 
        : new Date(a.createdAt).getTime();
      
      const bDate = b.lastReboostedAt 
        ? new Date(b.lastReboostedAt).getTime() 
        : new Date(b.createdAt).getTime();
      
      return bDate - aDate; // Sort descending (most recent first)
    });
  };

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const res = await fetch("/api/propertyBoost");
        const data = await res.json();
        const sorted = sortPropertiesByActivity(data);
        setProperties(sorted);
      } catch (err) {
        console.error("Failed to fetch properties", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  const handleReboost = async (e: React.MouseEvent, propertyId: string) => {
    e.preventDefault();
    e.stopPropagation();

    setReboostingIds((prev) => new Set(prev).add(propertyId));

    try {
      const response = await axios.post(`/api/propertyBoost/${propertyId}/reboost`);

      // Update the property with new lastReboostedAt timestamp and re-sort
      setProperties((prev) => {
        const updatedProps = prev.map((prop) =>
          prop._id === propertyId
            ? { ...prop, lastReboostedAt: response.data.lastReboostedAt || new Date().toISOString() }
            : prop
        );
        return sortPropertiesByActivity(updatedProps);
      });

      setTimeout(() => {
        setReboostingIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(propertyId);
          return newSet;
        });

        setReboostedIds((prev) => new Set(prev).add(propertyId));

        // setTimeout(() => {
        //   setReboostedIds((prev) => {
        //     const newSet = new Set(prev);
        //     newSet.delete(propertyId);
        //     return newSet;
        //   });
        // }, 3000);
      }, 1000);
    } catch (error) {
      console.error("Failed to reboost property:", error);
      setReboostingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(propertyId);
        return newSet;
      });
    }
  };

 const filteredProperties = properties.filter((property) => {
    const searchValue = searchTerm.toLowerCase();
    if (searchFilter === "boostid") {
      return property.BoostID.toLowerCase().includes(searchValue);
    } else {
      return property?.vsid?.toLowerCase().includes(searchValue);
    }
  });

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground animate-pulse">Loading boosted properties...</p>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="text-center space-y-6 p-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
            <Rocket className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-3xl font-bold text-foreground">No Boosted Properties Yet</h2>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Check back later for new listings that will appear here!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-4 pt-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Featured Properties</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Boosted Properties
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Discover premium properties with enhanced visibility
          </p>
        </div>

        {/* Search Section */}
        <div className="max-w-2xl mx-auto">
          <div className="flex gap-3">
            {/* Search Filter Select */}
            <Select value={searchFilter} onValueChange={(value: "boostid" | "vsid") => setSearchFilter(value)}>
              <SelectTrigger className="w-[180px] h-14 text-lg border-2 rounded-xl shadow-sm hover:shadow-md transition-all">
                <SelectValue placeholder="Search by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="boostid">Boost ID</SelectItem>
                <SelectItem value="vsid">VSID</SelectItem>
              </SelectContent>
            </Select>

            {/* Search Input */}
            <div className="relative group flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5 group-focus-within:text-primary transition-colors" />
              <Input
                type="text"
                placeholder={`Search by ${searchFilter === "boostid" ? "Boost ID" : "VSID"}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-14 text-lg border-2 rounded-xl focus:border-primary/50 transition-all shadow-sm hover:shadow-md"
              />
            </div>
          </div>
          
          {searchTerm && (
            <div className="text-center mt-3">
              <span className="inline-flex items-center gap-2 text-sm font-medium bg-primary/10 text-primary px-4 py-2 rounded-full">
                {filteredProperties.length} result
                {filteredProperties.length !== 1 ? "s" : ""} found
              </span>
            </div>
          )}
        </div>

        {/* Property Table */}
        {filteredProperties.length === 0 ? (
          <div className="text-center py-20 ">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-xl text-muted-foreground">
              No properties found for &quot;{searchTerm}&quot;
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Try searching with a different {searchFilter === "boostid" ? "Boost ID" : "VSID"}
            </p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
            <div className="space-y-0">
              {filteredProperties.map((prop) => {
                const isReboosting = reboostingIds.has(prop._id);
                const isReboosted = reboostedIds.has(prop._id);
                const wasRecentlyReboosted = isRecentlyReboosted(prop.lastReboostedAt);
                const showBoostedState = isReboosted || wasRecentlyReboosted;

                return (
                  <div
                    key={prop._id}
                    className={cn(
                      "group relative border-b border-border last:border-b-0  transition-all duration-300",
                      showBoostedState && "bg-green-50 dark:bg-green-950/20 border-green-500/50",
                      isReboosting && "bg-primary/5",
                      !showBoostedState && !isReboosting && "hover:bg-muted/50"
                    )}
                  >
                    <Link href={`list/${prop._id}`} className="block">
                      <div className="flex items-center gap-6 p-4">
                        {/* Thumbnail */}
                        <div className="relative w-32 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                          <img
                            src={prop.images[0] || "/placeholder.svg"}
                            alt={prop.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>

                        {/* Boost ID */}
                        <div className="flex-shrink-0 w-28">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                            <Rocket className="h-3 w-3" />
                            {prop.BoostID}
                          </span>
                        </div>

                        {/* Property VSID */}
                        <div className="flex-shrink-0 w-28">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                            <Info className="h-3 w-3" />
                            {prop.vsid}
                          </span>
                        </div>



                        {/* Property Details */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                            {prop.title}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {prop.description}
                          </p>
                        </div>

                        {/* Created By */}
                        <div className="flex-shrink-0 w-36 text-sm">
                          <p className="text-xs text-muted-foreground">Created by</p>
                          <p className="font-medium text-foreground truncate">{prop.createdBy}</p>
                        </div>

                        {/* Date - Show last activity date */}
                        <div className="flex-shrink-0 w-28 text-sm">
                          <p className="text-xs text-muted-foreground">
                            {prop.lastReboostedAt ? "Reboosted" : "Posted"}
                          </p>
                          <p className="font-medium text-foreground">
                            {new Date(prop.lastReboostedAt || prop.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>

                        {/* Reboost Button */}
                        {(token?.role === "SuperAdmin" || token?.role === "Sales") && (
                          <div className="flex-shrink-0">
                            <Button
                              variant={showBoostedState ? "default" : "outline"}
                              size="sm"
                              onClick={(e) => handleReboost(e, prop._id)}
                              disabled={isReboosting || wasRecentlyReboosted}
                              className={cn(
                                "shrink-0 transition-all duration-300 min-w-[100px]",
                                showBoostedState && "bg-green-500 hover:bg-green-600 border-green-500",
                                isReboosting && "opacity-70"
                              )}
                            >
                              {isReboosting ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  Boosting
                                </>
                              ) : showBoostedState ? (
                                <>
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Boosted!
                                </>
                              ) : (
                                <>
                                  <Rocket className="h-4 w-4 mr-2" />
                                  Reboost
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}