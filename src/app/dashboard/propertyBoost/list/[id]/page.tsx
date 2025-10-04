"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Download } from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { useAuthStore } from "@/AuthStore";
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label";
import axios from "axios";
interface Property {
  _id: string;
  title: string;
  url?: string;
  description: string;
  images: string[];
}

export default function PropertyDetails() {
  const { id } = useParams();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [url, setUrl] = useState("");

  const { token } = useAuthStore();

  useEffect(() => {
    async function fetchProperty() {
      try {
        const res = await fetch(`/api/propertyBoost/${id}`);
        if (!res.ok) throw new Error("Failed to fetch property");
        const data = await res.json();
        setProperty(data);
        setUrl(data.url ?? "");
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchProperty();
  }, [id]);

  // 🔥 Download all images as a ZIP
  const handleDownloadAll = async () => {
    if (!property?.images?.length) return;
    setDownloading(true);
    try {
      const zip = new JSZip();
      const imgFolder = zip.folder("property-images");

      for (let i = 0; i < property.images.length; i++) {
        const url = property.images[i];
        const response = await fetch(url);
        const blob = await response.blob();
        imgFolder?.file(`image-${i + 1}.jpg`, blob);
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${property.title.replace(/\s+/g, "_")}_images.zip`);
    } catch (error) {
      console.error("Error downloading images:", error);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-lg text-muted-foreground">Property not found.</p>
      </div>
    );
  }

  const handleSaveUrl = async () => {
    if (!url) return;
    try {
      await axios.post("/api/saveboosterUrl", {
        id: property?._id,
        url,
      });
      setProperty((prev) => (prev ? { ...prev, url } : prev));
    } catch (err) {
      console.error("Error saving URL:", err);
    }
  };

  return (
    <div className="min-h-screen">
     <div className="  flex flex-col justify-end p-8 rounded-b-2xl">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              {property.title}
            </h1>
            <Button
              onClick={handleDownloadAll}
              disabled={downloading}
              className="w-fit flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {downloading ? "Downloading..." : "Download All Photos"}
            </Button>
          </div>

      <div className="max-w-6xl mx-auto p-6 space-y-10">
        {/* Image Gallery */}
        {property.images.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {property.images.map((img, index) => (
              <Card
                key={index}
                className="overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-all duration-300"
              >
                <CardContent className="p-0">
                  <img
                    src={img}
                    alt={`Property ${index + 1}`}
                    className="w-full h-64 object-cover hover:scale-105 transition-transform duration-300"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

       {(token?.role === "SuperAdmin" || token?.role === "LeadGen") && (
          <div className="space-y-2">
            <Label htmlFor="facebookPostUrl">Post URL</Label>
            {property.url ? (
              <a
                href={property.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {property.url}
              </a>
            ) : (
              <div className="flex gap-2">
                <Input
                  id="facebookPostUrl"
                  placeholder="https://facebook.com/..."
                  className="min-h-[50px] whitespace-pre-wrap"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <Button onClick={handleSaveUrl}>Save</Button>
              </div>
            )}
          </div>
        )}

        {/* Description Section */}
        <div className="bg-card rounded-2xl shadow-lg border p-8 space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Property Description</h2>
          <p className="text-lg text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {property.description}
          </p>
        </div>        
      </div>
    </div>
  );
}
