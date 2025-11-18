"use client";

import axios from "axios";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import React, { useState, useEffect, ChangeEvent } from "react";

import {
  Plus,
  Ratio,
  Trash,
  UploadIcon,
  LoaderCircle,
  CalendarDaysIcon,
} from "lucide-react";
import {
  Select,
  SelectItem,
  SelectValue,
  SelectContent,
  SelectTrigger,
} from "@/components/ui/select";
import Heading from "@/components/Heading";
import { imageInterface } from "@/util/type";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import ImageCard from "@/components/imagecard/ImageCard";

interface GeneralAmenities {
  [key: string]: boolean;
}
interface Otheramenities {
  [key: string]: boolean;
}
interface PageProps {
  params: {
    id: string;
  };
}

const PortionDetailsPage = ({ params }: PageProps) => {
  const { toast } = useToast();

  const [newRule, setNewRule] = useState("");
  const [loading, setLoading] = useState<boolean>(false);
  const [propertyData, setPropertyData] = useState<any[]>([]);
  const [propertyLoading, setPropertyLoading] = useState(false);
  const [loadingProperty, setLoadingproperty] = useState(false);
  const [selectedPortion, setSelectedPortion] = useState<number | null>(null);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const [imageDeleteObject, setImageDeleteObj] =
    useState<Partial<imageInterface>>();
  const [refreshFetchProperty, setRefreshFetchProperty] =
    useState<boolean>(false);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const response = await axios.post("/api/property/gerPropertyByCommonId", {
        commonId: params.id[0],
      });

      setPropertyData(response.data.commonIdProperties);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching properties:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, [refreshFetchProperty]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: string
  ) => {
    if (selectedPortion === null) return;
    const updatedData = [...propertyData];
    updatedData[selectedPortion] = {
      ...updatedData[selectedPortion],
      [field]: e.target.value,
    };
    setPropertyData(updatedData);
  };

  const handleOthersAmentiesChange = (amenity: string, checked: boolean) => {
    if (selectedPortion === null) return;
    const updatedData = [...propertyData];
    updatedData[selectedPortion] = {
      ...updatedData[selectedPortion],
      otherAmenities: {
        ...updatedData[selectedPortion].otherAmenities,
        [amenity]: checked,
      },
    };
    setPropertyData(updatedData);
  };

  const handleGeneraleAmentiesChange = (amenity: string, checked: boolean) => {
    if (selectedPortion === null) return;
    const updatedData = [...propertyData];
    updatedData[selectedPortion] = {
      ...updatedData[selectedPortion],
      generalAmenities: {
        ...updatedData[selectedPortion].generalAmenities,
        [amenity]: checked,
      },
    };
    setPropertyData(updatedData);
  };

  const handleAmenityChange = (amenity: string, checked: boolean) => {
    if (selectedPortion === null) return;

    const updatedData = [...propertyData];
    updatedData[selectedPortion] = {
      ...updatedData[selectedPortion],
      safeAmenities: {
        ...updatedData[selectedPortion].safeAmenities,
        [amenity]: checked,
      },
    };
    setPropertyData(updatedData);
  };

  const handleAddRule = () => {
    if (newRule.trim() === "" || selectedPortion === null) return;

    const updatedData = [...propertyData];
    updatedData[selectedPortion] = {
      ...updatedData[selectedPortion],
      additionalRules: [
        ...updatedData[selectedPortion].additionalRules,
        newRule,
      ],
    };
    setPropertyData(updatedData);
    setNewRule("");
  };

  const handleDeleteRule = (index: number) => {
    if (selectedPortion === null) return;

    const updatedData = [...propertyData];
    updatedData[selectedPortion] = {
      ...updatedData[selectedPortion],
      additionalRules: updatedData[selectedPortion].additionalRules.filter(
        (_: any, i: any) => i !== index
      ),
    };
    setPropertyData(updatedData);
  };

  // ! Edit property api call
  const editproperty = async () => {
    if (selectedPortion === null) return;
    const PropertyId = propertyData[selectedPortion]._id;
    try {
      setPropertyLoading(true);
      console.log(PropertyId, propertyData[selectedPortion]);
      const response = await axios.post("/api/property/editProperty", {
        PropertyId,
        propertyData: propertyData[selectedPortion],
      });
      toast({
        description: "Property updated successfully",
      });
      setPropertyLoading(false);
    } catch (error: any) {
      console.log(error, "This error belongs to edit property");
      setPropertyLoading(false);
    }
  };

  //TODO: Image Upload Part
  const handleImageUpload = async (
    event: ChangeEvent<HTMLInputElement>,
    imageType: string,
    index: number
  ) => {
    const files = event?.target?.files;
    const fileArr = Array.from(files || []);

    // * checking file type
    for (const file of fileArr) {
      if (
        !file ||
        !(
          file.type === "image/jpeg" ||
          file.type === "image/png" ||
          file.type === "image/webp"
        )
      ) {
        toast({
          variant: "destructive",
          title: "Invalid Image Type",
          description:
            "We only accept jpeg , png , webp for now try to upload this format",
        });
        return;
      }
    }
    // * intitalizing Bunny
    const storageZoneName = process.env.NEXT_PUBLIC_BUNNY_STORAGE_ZONE;
    const accessKey = process.env.NEXT_PUBLIC_BUNNY_ACCESS_KEY;
    const storageUrl = process.env.NEXT_PUBLIC_BUNNY_STORAGE_URL;

    const formData = new FormData();
    const savedUrls: string[] = [];

    setLoadingproperty(true);

    for (const file of fileArr) {
      formData.append("file", file);
      try {
        const dt = Date.now();

        const response = await axios.put(
          `${storageUrl}/${storageZoneName}/${
            propertyData[selectedPortion!]?.propertyName
          }/${dt}${file.name}`,
          file,
          {
            headers: {
              AccessKey: accessKey,
              "Content-Type": file.type,
            },
          }
        );

        const imageUrl = `https://vacationsaga.b-cdn.net/${
          propertyData[selectedPortion!]?.propertyName
        }/${dt}${file.name}`;
        savedUrls.push(imageUrl);
      } catch (error) {
        console.error("Error uploading image to Bunny CDN:", error);
        toast({
          variant: "destructive",
          title: "Upload Error",
          description:
            "An error occurred while uploading the image. Please try again later.",
        });
        break;
      }
    }

    if (imageType === "propertyCoverFileUrl") {
      const tempPropertyData = { ...propertyData[selectedPortion!] };
      tempPropertyData["propertyCoverFileUrl"] = savedUrls[0];
      setPropertyData((prev) => {
        prev[selectedPortion!] = tempPropertyData;
        return prev;
      });
    } else if (imageType === "propertyPictureUrls") {
      const tempPropertyData = { ...propertyData[selectedPortion!] };
      // Update both arrays to keep them in sync
      tempPropertyData["propertyPictureUrls"] = [
        ...tempPropertyData["propertyPictureUrls"],
        ...savedUrls,
      ];
      tempPropertyData["propertyImages"] = [
        ...(tempPropertyData["propertyImages"] || []),
        ...savedUrls,
      ];
      setPropertyData((prev) => {
        prev[selectedPortion!] = tempPropertyData;
        return prev;
      });
    }
    setLoadingproperty(false);
  };

  // TODO: Image deletion part
  const handleImageSelect = (
    checked: string | boolean,
    imageType: string,
    imageUrl: string,
    index?: number
  ) => {
    // * adding & deleting the images from the state array
    const newArr = [...imagesToDelete];

    if (newArr.includes(imageUrl)) {
      const indexToRemove = newArr.indexOf(imageUrl);
      newArr.splice(indexToRemove, 1);
    } else {
      newArr.push(imageUrl);
    }
    setImagesToDelete(newArr);

    let newObj = { ...imageDeleteObject };

    // ! for imageType propertyCoverFileUrl, propertyPictureUrls
    if (imageType === "propertyCoverFileUrl") {
      // For cover image, just mark it for deletion
      if (checked) {
        (newObj as any)[imageType] = true;
      } else {
        delete (newObj as any)[imageType];
      }
    } else {
      // For arrays like propertyPictureUrls
      if (checked) {
        const imageTypeArray = [...((newObj as any)[imageType] ?? [])];
        if (index !== undefined && !imageTypeArray.includes(index)) {
          imageTypeArray.push(index);
        }
        (newObj as any)[imageType] = imageTypeArray;
      } else {
        const imageTypeArray = [...((newObj as any)[imageType] ?? [])];
        const indexToRemove = imageTypeArray.indexOf(index);
        if (indexToRemove !== -1) {
          imageTypeArray.splice(indexToRemove, 1);
        }
        (newObj as any)[imageType] =
          imageTypeArray.length > 0 ? imageTypeArray : undefined;
      }
    }

    setImageDeleteObj(newObj);
  };

  const handleCenterChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    coordinate: "lat" | "lng"
  ) => {
    if (selectedPortion === null) return;

    const updatedData = [...propertyData];
    const value = parseFloat(e.target.value);

    updatedData[selectedPortion] = {
      ...updatedData[selectedPortion],
      center: {
        ...updatedData[selectedPortion].center,
        [coordinate]: isNaN(value) ? 0 : value,
      },
    };

    setPropertyData(updatedData);
  };

  const bunnyImageDelete = async (imageUrl: string) => {
    try {
      const storageZoneName = process.env.NEXT_PUBLIC_BUNNY_STORAGE_ZONE;
      const accessKey = process.env.NEXT_PUBLIC_BUNNY_ACCESS_KEY;
      const filePath = imageUrl.split("https://vacationsaga.b-cdn.net/")[1];

      const deleteOptions = {
        method: "DELETE",
        url: `https://storage.bunnycdn.com/${storageZoneName}/${filePath}`,
        headers: { AccessKey: accessKey },
      };
      await axios(deleteOptions);
      console.log(`Successfully deleted: ${imageUrl}`);
    } catch (bunnyError) {
      console.error("Error deleting file from Bunny CDN:", bunnyError);
      throw bunnyError;
    }
  };

  const handleImageDelete = async () => {
    if (!imageDeleteObject || Object.keys(imageDeleteObject).length === 0) {
      toast({
        variant: "destructive",
        title: "No images selected",
        description: "Please select images to delete",
      });
      return;
    }

    try {
      setLoadingproperty(true);

      // First delete from database
      const response = await axios.post(
        "/api/property/editProperty/deleteImages",
        {
          pId: propertyData[selectedPortion!]._id,
          data: imageDeleteObject,
        }
      );

      // Then delete from Bunny CDN
      const deletePromises = imagesToDelete
        .filter((url) => url !== "")
        .map((imageUrl) => bunnyImageDelete(imageUrl));

      await Promise.allSettled(deletePromises);

      toast({
        title: "Success",
        description: "Images deleted successfully",
      });

      // Reset states
      setImagesToDelete([]);
      setImageDeleteObj({});
      setRefreshFetchProperty((prev) => !prev);
    } catch (err: any) {
      console.error("Error deleting images:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.response?.data?.error || "Failed to delete images",
      });
    } finally {
      setLoadingproperty(false);
    }
  };

  return (
    <>
      {loading ? (
        <div className="flex items-center justify-center min-h-[80vh]">
          <LoaderCircle size={32} className="animate-spin" />
        </div>
      ) : (
        <Card className="w-full">
          <CardContent className="p-0">
            <div className="flex flex-col h-[92vh] md:flex-row">
              <div className="w-full md:w-[30%] min-h-40 border-b-2 md:border-b-0 md:border-r-2 p-4 overflow-y-auto">
                <Heading
                  heading="List of portions"
                  subheading="Select a portion to edit its details"
                />
                <div className="mt-4 space-y-2">
                  {propertyData.map((portion: any, index: number) => (
                    <div
                      key={`${portion.VSID}-${index}`}
                      className={
                        selectedPortion === index
                          ? "w-full text-sm justify-start cursor-pointer rounded-lg bg-primary/40 border-l-4 px-3 py-2 border-primary transition-all"
                          : "w-full text-sm justify-start py-2 cursor-pointer px-3 hover:bg-muted/50 rounded-lg transition-all"
                      }
                      onClick={() => setSelectedPortion(index)}
                    >
                      <p className="text-sm flex items-center gap-x-2 font-medium">
                        <Ratio size={14} />
                        Portion {index + 1}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator orientation="vertical" className="hidden md:block" />

              <div className="w-full p-4 overflow-y-scroll">
                <AnimatePresence mode="wait">
                  {selectedPortion !== null && propertyData[selectedPortion] ? (
                    <motion.div
                      key={selectedPortion}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-6"
                    >
                      <Heading
                        heading={`Portion ${selectedPortion + 1}`}
                        subheading={`Edit the details for Portion ${
                          selectedPortion + 1
                        }`}
                      />

                      {/* Cover Image Section */}
                      <div className="space-y-2">
                        <Label className="text-base font-semibold">
                          Cover Image
                        </Label>
                        <div className="relative">
                          {propertyData[selectedPortion]
                            .propertyCoverFileUrl ? (
                            <img
                              src={
                                propertyData[selectedPortion]
                                  .propertyCoverFileUrl
                              }
                              alt={`Portion ${selectedPortion + 1} cover`}
                              className="w-full h-64 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
                              <p className="text-muted-foreground">
                                No cover image
                              </p>
                            </div>
                          )}
                          {propertyData[selectedPortion]
                            .propertyCoverFileUrl && (
                            <Checkbox
                              className="cursor-pointer absolute left-4 top-4 w-5 h-5 bg-background border-primary"
                              onCheckedChange={(checked) =>
                                handleImageSelect(
                                  checked,
                                  "propertyCoverFileUrl",
                                  propertyData[selectedPortion]
                                    .propertyCoverFileUrl,
                                  selectedPortion
                                )
                              }
                            />
                          )}
                          <div className="absolute bottom-4 right-4">
                            <label htmlFor="file-upload-propertyCoverFile">
                              <div className="flex items-center gap-2 bg-background/90 backdrop-blur-sm hover:bg-background border rounded-lg py-2 px-4 cursor-pointer transition-all">
                                {loadingProperty ? (
                                  <LoaderCircle
                                    size={16}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <UploadIcon size={16} />
                                )}
                                <span className="text-sm font-medium">
                                  Upload Cover
                                </span>
                              </div>
                              <input
                                id="file-upload-propertyCoverFile"
                                type="file"
                                className="sr-only"
                                accept="image/*"
                                onChange={(e) =>
                                  handleImageUpload(
                                    e,
                                    "propertyCoverFileUrl",
                                    0
                                  )
                                }
                                disabled={loadingProperty}
                              />
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Gallery Images Section */}
                      <div className="space-y-2">
                        <Label className="text-base font-semibold">
                          Gallery Images
                        </Label>
                        <div className="flex gap-4 overflow-x-auto pb-4">
                          <label htmlFor="file-upload-propertyPictureUrls">
                            <div className="flex-shrink-0 flex items-center justify-center h-40 w-40 border-2 border-dashed rounded-lg hover:bg-muted/50 cursor-pointer transition-all">
                              <div className="flex flex-col items-center gap-2">
                                {loadingProperty ? (
                                  <LoaderCircle
                                    size={24}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <UploadIcon size={24} />
                                )}
                                <p className="text-sm font-medium">Upload</p>
                              </div>
                            </div>
                            <input
                              id="file-upload-propertyPictureUrls"
                              type="file"
                              className="sr-only"
                              multiple
                              accept="image/*"
                              onChange={(e) =>
                                handleImageUpload(e, "propertyPictureUrls", 0)
                              }
                              disabled={loadingProperty}
                            />
                          </label>

                          {propertyData[selectedPortion]?.propertyPictureUrls
                            ?.filter((url: string) => url !== "")
                            ?.map((url: string, index: number) => (
                              <div
                                key={`gallery-${index}`}
                                className="relative flex-shrink-0"
                              >
                                <img
                                  src={url}
                                  alt={`Gallery ${index + 1}`}
                                  className="w-40 h-40 object-cover rounded-lg"
                                />
                                <Checkbox
                                  className="cursor-pointer absolute left-2 top-2 w-5 h-5 bg-background border-primary"
                                  onCheckedChange={(checked) =>
                                    handleImageSelect(
                                      checked,
                                      "propertyPictureUrls",
                                      url,
                                      index
                                    )
                                  }
                                />
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Calendar Management */}
                      <div className="space-y-2">
                        <Label className="text-base font-semibold">
                          Manage Calendar
                        </Label>
                        <Link
                          href={`/dashboard/newproperty/editPortionAvailability/${propertyData[selectedPortion]._id}`}
                        >
                          <div className="flex items-center gap-2 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted/50 cursor-pointer transition-all">
                            <CalendarDaysIcon className="h-4 w-4" />
                            <span>Open portion calendar</span>
                          </div>
                        </Link>
                      </div>

                      {/* Property Details Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {/* Read-only fields */}
                        <div className="opacity-70">
                          <Label>Property VSID</Label>
                          <Input
                            disabled
                            defaultValue={propertyData[selectedPortion].VSID}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Read-only
                          </p>
                        </div>

                        <div className="opacity-70">
                          <Label>Last Updated By</Label>
                          <Input
                            disabled
                            defaultValue={propertyData[
                              selectedPortion
                            ]?.lastUpdatedBy.at(-1)}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Read-only
                          </p>
                        </div>

                        <div className="opacity-70">
                          <Label>Last Updated At</Label>
                          <Input
                            disabled
                            defaultValue={propertyData[
                              selectedPortion
                            ]?.lastUpdates.at(-1)}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Read-only
                          </p>
                        </div>

                        <div className="opacity-70">
                          <Label>Portion Number</Label>
                          <Input
                            disabled
                            defaultValue={
                              propertyData[selectedPortion].portionNo
                            }
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Read-only
                          </p>
                        </div>

                        <div className="opacity-70">
                          <Label>Property Name</Label>
                          <Input
                            disabled
                            defaultValue={
                              propertyData[selectedPortion].propertyName
                            }
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Read-only
                          </p>
                        </div>

                        {/* Editable toggle fields */}
                        <div>
                          <Label>Instant Booking</Label>
                          <div className="flex h-10 w-full rounded-md justify-between items-center border border-input bg-background px-3">
                            <span className="text-sm">Enable</span>
                            <Switch
                              checked={
                                propertyData[selectedPortion]
                                  ?.isInstantBooking || false
                              }
                              onCheckedChange={(checked) => {
                                if (selectedPortion === null) return;
                                const updatedData = [...propertyData];
                                updatedData[selectedPortion] = {
                                  ...updatedData[selectedPortion],
                                  isInstantBooking: checked,
                                };
                                setPropertyData(updatedData);
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <Label>Live Status</Label>
                          <div className="flex h-10 w-full rounded-md justify-between items-center border border-input bg-background px-3">
                            <span className="text-sm">Live</span>
                            <Switch
                              checked={
                                propertyData[selectedPortion]?.isLive || false
                              }
                              onCheckedChange={(checked) => {
                                if (selectedPortion === null) return;
                                const updatedData = [...propertyData];
                                updatedData[selectedPortion] = {
                                  ...updatedData[selectedPortion],
                                  isLive: checked,
                                };
                                setPropertyData(updatedData);
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <Label>Student Suitable</Label>
                          <div className="flex h-10 w-full rounded-md justify-between items-center border border-input bg-background px-3">
                            <span className="text-sm">Allow Students</span>
                            <Switch
                              checked={
                                propertyData[selectedPortion]
                                  ?.isSuitableForStudents || false
                              }
                              onCheckedChange={(checked) => {
                                if (selectedPortion === null) return;
                                const updatedData = [...propertyData];
                                updatedData[selectedPortion] = {
                                  ...updatedData[selectedPortion],
                                  isSuitableForStudents: checked,
                                };
                                setPropertyData(updatedData);
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <Label>Top Floor</Label>
                          <div className="flex h-10 w-full rounded-md justify-between items-center border border-input bg-background px-3">
                            <span className="text-sm">Is Top Floor</span>
                            <Switch
                              checked={
                                propertyData[selectedPortion]?.isTopFloor ||
                                false
                              }
                              onCheckedChange={(checked) => {
                                if (selectedPortion === null) return;
                                const updatedData = [...propertyData];
                                updatedData[selectedPortion] = {
                                  ...updatedData[selectedPortion],
                                  isTopFloor: checked,
                                };
                                setPropertyData(updatedData);
                              }}
                            />
                          </div>
                        </div>

                        {/* Editable text fields */}
                        <div>
                          <Label>Base Price</Label>
                          <Input
                            type="number"
                            onChange={(e) => handleInputChange(e, "basePrice")}
                            defaultValue={
                              propertyData[selectedPortion].basePrice
                            }
                          />
                        </div>

                        <div>
                          <Label>Property Area (sq ft)</Label>
                          <Input
                            type="number"
                            onChange={(e) => handleInputChange(e, "area")}
                            defaultValue={propertyData[selectedPortion].area}
                          />
                        </div>

                        <div>
                          <Label>Long Term Price</Label>
                          <Input
                            type="number"
                            onChange={(e) =>
                              handleInputChange(e, "basePriceLongTerm")
                            }
                            defaultValue={
                              propertyData[selectedPortion].basePriceLongTerm
                            }
                          />
                        </div>

                        <div>
                          <Label>Bathrooms</Label>
                          <Input
                            type="number"
                            onChange={(e) => handleInputChange(e, "bathroom")}
                            defaultValue={
                              propertyData[selectedPortion].bathroom
                            }
                          />
                        </div>

                        <div>
                          <Label>Bedrooms</Label>
                          <Input
                            type="number"
                            onChange={(e) => handleInputChange(e, "bedrooms")}
                            defaultValue={
                              propertyData[selectedPortion].bedrooms
                            }
                          />
                        </div>

                        <div>
                          <Label>Max Guests</Label>
                          <Input
                            type="number"
                            onChange={(e) => handleInputChange(e, "guests")}
                            defaultValue={propertyData[selectedPortion].guests}
                          />
                        </div>

                        <div>
                          <Label>City</Label>
                          <Input
                            onChange={(e) => handleInputChange(e, "city")}
                            defaultValue={propertyData[selectedPortion].city}
                          />
                        </div>

                        <div>
                          <Label>Street</Label>
                          <Input
                            onChange={(e) => handleInputChange(e, "street")}
                            defaultValue={propertyData[selectedPortion].street}
                          />
                        </div>

                        <div>
                          <Label>Postal Code</Label>
                          <Input
                            onChange={(e) => handleInputChange(e, "postalCode")}
                            defaultValue={
                              propertyData[selectedPortion].postalCode
                            }
                          />
                        </div>

                        <div>
                          <Label>Latitude</Label>
                          <Input
                            type="number"
                            step="any"
                            onChange={(e) => handleCenterChange(e, "lat")}
                            value={propertyData[selectedPortion].center.lat}
                          />
                        </div>

                        <div>
                          <Label>Longitude</Label>
                          <Input
                            type="number"
                            step="any"
                            onChange={(e) => handleCenterChange(e, "lng")}
                            value={propertyData[selectedPortion].center.lng}
                          />
                        </div>

                        <div>
                          <Label>Cooking</Label>
                          <Select
                            value={propertyData[selectedPortion]?.cooking || ""}
                            onValueChange={(value) => {
                              if (selectedPortion === null) return;
                              const updatedData = [...propertyData];
                              updatedData[selectedPortion] = {
                                ...updatedData[selectedPortion],
                                cooking: value,
                              };
                              setPropertyData(updatedData);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select option" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Allow">Allow</SelectItem>
                              <SelectItem value="Do not allow">
                                Do not allow
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Parties</Label>
                          <Select
                            value={propertyData[selectedPortion]?.party || ""}
                            onValueChange={(value) => {
                              if (selectedPortion === null) return;
                              const updatedData = [...propertyData];
                              updatedData[selectedPortion] = {
                                ...updatedData[selectedPortion],
                                party: value,
                              };
                              setPropertyData(updatedData);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select option" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Allow">Allow</SelectItem>
                              <SelectItem value="Do not allow">
                                Do not allow
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Pets</Label>
                          <Select
                            value={propertyData[selectedPortion]?.pet || ""}
                            onValueChange={(value) => {
                              if (selectedPortion === null) return;
                              const updatedData = [...propertyData];
                              updatedData[selectedPortion] = {
                                ...updatedData[selectedPortion],
                                pet: value,
                              };
                              setPropertyData(updatedData);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select option" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Allow">Allow</SelectItem>
                              <SelectItem value="Do not allow">
                                Do not allow
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Smoking</Label>
                          <Select
                            value={propertyData[selectedPortion]?.smoking || ""}
                            onValueChange={(value) => {
                              if (selectedPortion === null) return;
                              const updatedData = [...propertyData];
                              updatedData[selectedPortion] = {
                                ...updatedData[selectedPortion],
                                smoking: value,
                              };
                              setPropertyData(updatedData);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select option" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Allow">Allow</SelectItem>
                              <SelectItem value="Do not allow">
                                Do not allow
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Weekly Discount (%)</Label>
                          <Input
                            type="number"
                            onChange={(e) =>
                              handleInputChange(e, "weeklyDiscount")
                            }
                            defaultValue={
                              propertyData[selectedPortion].weeklyDiscount
                            }
                          />
                        </div>

                        <div>
                          <Label>Monthly Discount (%)</Label>
                          <Input
                            type="number"
                            onChange={(e) =>
                              handleInputChange(e, "monthlyDiscount")
                            }
                            defaultValue={
                              propertyData[selectedPortion].monthlyDiscount
                            }
                          />
                        </div>
                      </div>

                      {/* Amenities Sections */}
                      {propertyData[selectedPortion]?.generalAmenities &&
                        Object.keys(
                          propertyData[selectedPortion]?.generalAmenities || {}
                        ).length > 0 && (
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold">
                              General Amenities
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {Object.entries(
                                propertyData[selectedPortion]
                                  ?.generalAmenities || {}
                              ).map(([amenity, value]) => (
                                <div
                                  key={amenity}
                                  className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50"
                                >
                                  <Checkbox
                                    id={`general-${amenity}`}
                                    checked={value as boolean}
                                    onCheckedChange={(checked) =>
                                      handleGeneraleAmentiesChange(
                                        amenity,
                                        checked as boolean
                                      )
                                    }
                                  />
                                  <label
                                    htmlFor={`general-${amenity}`}
                                    className="text-sm cursor-pointer"
                                  >
                                    {amenity}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {propertyData[selectedPortion]?.otherAmenities &&
                        Object.keys(
                          propertyData[selectedPortion]?.otherAmenities || {}
                        ).length > 0 && (
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold">
                              Other Amenities
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {Object.entries(
                                propertyData[selectedPortion]?.otherAmenities ||
                                  {}
                              ).map(([amenity, value]) => (
                                <div
                                  key={amenity}
                                  className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50"
                                >
                                  <Checkbox
                                    id={`other-${amenity}`}
                                    checked={value as boolean}
                                    onCheckedChange={(checked) =>
                                      handleOthersAmentiesChange(
                                        amenity,
                                        checked as boolean
                                      )
                                    }
                                  />
                                  <label
                                    htmlFor={`other-${amenity}`}
                                    className="text-sm cursor-pointer"
                                  >
                                    {amenity}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {propertyData[selectedPortion]?.safeAmenities &&
                        Object.keys(
                          propertyData[selectedPortion]?.safeAmenities || {}
                        ).length > 0 && (
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold">
                              Safety Amenities
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {Object.entries(
                                propertyData[selectedPortion]?.safeAmenities ||
                                  {}
                              ).map(([amenity, value]) => (
                                <div
                                  key={amenity}
                                  className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50"
                                >
                                  <Checkbox
                                    id={`safe-${amenity}`}
                                    checked={value as boolean}
                                    onCheckedChange={(checked) =>
                                      handleAmenityChange(
                                        amenity,
                                        checked as boolean
                                      )
                                    }
                                  />
                                  <label
                                    htmlFor={`safe-${amenity}`}
                                    className="text-sm cursor-pointer"
                                  >
                                    {amenity}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Additional Rules */}
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold">
                          Additional Rules
                        </h3>
                        <div className="space-y-2">
                          {propertyData[selectedPortion]?.additionalRules.map(
                            (rule: string, index: number) => (
                              <div
                                key={`rule-${index}`}
                                className="flex items-center justify-between p-3 border rounded-lg"
                              >
                                <span className="text-sm">{rule}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteRule(index)}
                                >
                                  <Trash
                                    size={16}
                                    className="text-destructive"
                                  />
                                </Button>
                              </div>
                            )
                          )}
                          <div className="flex gap-2">
                            <Input
                              value={newRule}
                              onChange={(e) => setNewRule(e.target.value)}
                              placeholder="Add new rule"
                              onKeyPress={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddRule();
                                }
                              }}
                            />
                            <Button onClick={handleAddRule} size="icon">
                              <Plus size={18} />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Descriptions */}
                      <div className="space-y-4">
                        <div>
                          <Label className="text-base font-semibold">
                            Description
                          </Label>
                          <Textarea
                            onChange={(e: any) =>
                              handleInputChange(e, "reviews")
                            }
                            className="min-h-32 mt-2"
                            defaultValue={propertyData[selectedPortion].reviews}
                          />
                        </div>

                        <div className="opacity-70">
                          <Label className="text-base font-semibold">
                            New Description (Auto-generated)
                          </Label>
                          <Textarea
                            disabled
                            className="min-h-32 mt-2"
                            defaultValue={
                              propertyData[selectedPortion].newReviews
                            }
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Read-only
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                        <Button
                          disabled={propertyLoading || loadingProperty}
                          onClick={editproperty}
                          className="flex-1"
                        >
                          {propertyLoading ? (
                            <>
                              <LoaderCircle
                                size={18}
                                className="animate-spin mr-2"
                              />
                              Updating...
                            </>
                          ) : (
                            "Update Property"
                          )}
                        </Button>
                        <Button
                          variant="destructive"
                          disabled={
                            loadingProperty || imagesToDelete.length === 0
                          }
                          onClick={handleImageDelete}
                          className="flex-1 sm:flex-initial"
                        >
                          {loadingProperty ? (
                            <>
                              <LoaderCircle
                                size={18}
                                className="animate-spin mr-2"
                              />
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash size={18} className="mr-2" />
                              Delete Images ({imagesToDelete.length})
                            </>
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="h-full flex items-center flex-col p-8 justify-center"
                    >
                      <img
                        className="max-w-xs opacity-50"
                        src="https://vacationsaga.b-cdn.net/empty_u3jzi3.png"
                        alt="No selection"
                      />
                      <p className="text-lg font-semibold mt-4 text-muted-foreground">
                        Select a portion to view details
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default PortionDetailsPage;
