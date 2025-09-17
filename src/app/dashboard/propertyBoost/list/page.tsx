"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Property {
  _id: string;
  title: string;
  description: string;
  images: string[];
  BoostID: string;
  createdAt: string;
  createdBy: string;    
}

export default function BoostPropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const res = await axios.get("/api/propertyBoost");
        setProperties(res.data);
      } catch (err) {
        console.error("Failed to fetch properties", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  const filteredProperties = properties.filter((property) =>
    property.BoostID.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center space-y-4">
        <p className="text-2xl font-semibold text-muted-foreground">No boosted properties yet.</p>
        <p className="text-muted-foreground">Check back later for new listings!</p>
      </div>
    );
  }

  return (
    <div className="max-w-full  p-6 space-y-8">
      {/* Search */}
      <div className="max-w-md mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            placeholder="Search by Boost ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12 text-center border-2 focus:border-primary/50 transition-colors"
          />
        </div>
        {searchTerm && (
          <p className="text-sm text-muted-foreground text-center mt-2">
            {filteredProperties.length} result{filteredProperties.length !== 1 ? "s" : ""} found for "{searchTerm}"
          </p>
        )}
      </div>

      {/* Property List */}
      {filteredProperties.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No properties found. Try searching with a different Boost ID.
        </div>
      ) : (
        <div className="space-y-6">
          {filteredProperties.map((prop) => (
            <Link
              key={prop._id}
              href={`list/${prop._id}`}
              className="block border border-border rounded-xl hover:shadow-md hover:border-primary/30 transition-all duration-300"
            >
              <div className="flex flex-col md:flex-row gap-4 p-4">
                {/* Thumbnail */}
                <div className="w-full md:w-48 h-48 flex-shrink-0 overflow-hidden rounded-lg">
                  <img
                    src={prop.images[0] || "/placeholder.svg"}
                    alt={prop.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-foreground">{prop.title}</h2>
                    <span className="text-sm font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
                      {prop.BoostID}
                    </span>
                  </div>
                  <p className="text-muted-foreground line-clamp-3">{prop.description}</p>
                  <p>Created By : {prop.createdBy}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Created:{" "}
                    {new Date(prop.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>

                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
