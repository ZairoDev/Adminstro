"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";

interface PropertyItem {
  _id?: string;
  location?: string;
  name?: string;
  phoneNumber?: string;
  interiorStatus?: string;
  referenceLink?: string;
  price?: string;
  propertyType?: string;
  remarks?: string;
  availability?: string;
  petStatus?: string;
  imageUrls?: string[];
  updatedAt?: string;
  [key: string]: any; // allow extra fields from backend
}

interface PropertyGroup {
  _id: string; // area or country name
  count: number;
  properties: PropertyItem[];
}

interface RecommendationResponse {
  success: boolean;
  available: PropertyGroup[];
  unavailable: PropertyGroup[];
  totalAvailable: number;
  totalUnavailable: number;
}

export default function RecommendationPage() {
  const [availableGroups, setAvailableGroups] = useState<PropertyGroup[]>([]);
  const [unavailableGroups, setUnavailableGroups] = useState<PropertyGroup[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);

  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const queryId = params.id as string;

  useEffect(() => {
    if (!queryId) {
      router.push("/dashboard");
      return;
    }

    const fetchRecommendations = async () => {
      try {
        setIsLoading(true);
        const response = await axios.post<RecommendationResponse>(
          "/api/getRecommendations",
          { id: queryId }
        );

        const data = response.data;

        setAvailableGroups(data.available || []);
        setUnavailableGroups(data.unavailable || []);

        toast({
          description: "Recommendations loaded successfully",
        });
      } catch (error) {
        console.error("Error fetching recommendations:", error);
        toast({
          description: "Failed to load recommendations",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, [queryId, router, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading recommendations...</p>
      </div>
    );
  }

  const RecommendationCard = ({
    item,
    isAvailable,
  }: {
    item: PropertyItem;
    isAvailable: boolean;
  }) => (
    <Card className={`relative ${!isAvailable ? "opacity-75" : ""}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">
            {item.name ?? "Unnamed Property"}
          </CardTitle>
          <Badge variant={isAvailable ? "default" : "secondary"}>
            {isAvailable ? (
              <>
                <Check className="w-3 h-3 mr-1" /> Available
              </>
            ) : (
              <>
                <X className="w-3 h-3 mr-1" /> Unavailable
              </>
            )}
          </Badge>
        </div>
        {item.remarks && <CardDescription>{item.remarks}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-2">
        {item.price && (
          <div className="text-2xl font-bold text-primary">{item.price}</div>
        )}
        {item.location && (
          <p className="text-sm text-muted-foreground">
            Location: {item.location}
          </p>
        )}
        {item.phoneNumber && (
          <p className="text-sm text-muted-foreground">
            Phone: {item.phoneNumber}
          </p>
        )}
        {item.referenceLink && (
          <a
            href={item.referenceLink}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-blue-600 underline"
          >
            Reference Link
          </a>
        )}
        {item.link && (
          <a
            href={item.link}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-blue-600 underline ml-6"
          >
            VS Link
          </a>
        )}
        {/* <Button
          className="w-full"
          disabled={!isAvailable}
          variant={isAvailable ? "default" : "outline"}
        >
          {isAvailable ? "Select Property" : "Coming Soon"}
        </Button> */}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Your Recommendations
          </h1>
          <p className="text-muted-foreground">
            Based on your preferences, here are our recommendations organized by
            availability.
          </p>
        </div>

        {/* Available Groups */}
        <section className="mb-12">
          <div className="flex items-center mb-6">
            <h2 className="text-2xl font-semibold text-foreground mr-3">
              Available
            </h2>
            <Badge
              variant="default"
              className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
            >
              {availableGroups.reduce((sum, g) => sum + g.count, 0)} options
            </Badge>
          </div>

          {availableGroups.length > 0 ? (
            availableGroups.map((group) => (
              <div key={group._id} className="mb-8">
                <h3 className="text-lg font-semibold mb-4">
                  {group._id} ({group.count})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {group.properties.map((property) => (
                    <RecommendationCard
                      key={property._id}
                      item={property}
                      isAvailable
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">No available options.</p>
          )}
        </section>

        {/* Unavailable Groups */}
        <section>
          <div className="flex items-center mb-6">
            <h2 className="text-2xl font-semibold text-foreground mr-3">
              Unavailable
            </h2>
            <Badge
              variant="secondary"
              className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
            >
              {unavailableGroups.reduce((sum, g) => sum + g.count, 0)} options
            </Badge>
          </div>

          {unavailableGroups.length > 0 ? (
            unavailableGroups.map((group) => (
              <div key={group._id} className="mb-8">
                <h3 className="text-lg font-semibold mb-4">
                  {group._id} ({group.count})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {group.properties.map((property) => (
                    <RecommendationCard
                      key={property._id}
                      item={property}
                      isAvailable={false}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">No unavailable options.</p>
          )}
        </section>
      </div>
    </div>
  );
}
