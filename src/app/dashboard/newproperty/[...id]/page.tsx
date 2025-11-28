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
  Copy,
  Save,
  Image as ImageIcon,
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
import { Badge } from "@/components/ui/badge";

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
  const [syncImages, setSyncImages] = useState<boolean>(true);
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
      const response = await axios.post("/api/property/editProperty", {
        PropertyId,
        propertyData: propertyData[selectedPortion],
        syncImages,
      });
      toast({
        description: "Property updated successfully",
      });
      setPropertyLoading(false);
    } catch (error: any) {
      console.log(error, "This error belongs to edit property");
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.response?.data?.error || "Failed to update property",
      });
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

    // * File type validation
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
          description: "We only accept jpeg , png , webp for now",
        });
        return;
      }
    }

    const storageZoneName = process.env.NEXT_PUBLIC_BUNNY_STORAGE_ZONE;
    const accessKey = process.env.NEXT_PUBLIC_BUNNY_ACCESS_KEY;
    const storageUrl = process.env.NEXT_PUBLIC_BUNNY_STORAGE_URL;
    const savedUrls: string[] = [];

    setLoadingproperty(true);

    for (const file of fileArr) {
      try {
        const dt = Date.now();
        await axios.put(
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
        savedUrls.push(
          `https://vacationsaga.b-cdn.net/${
            propertyData[selectedPortion!]?.propertyName
          }/${dt}${file.name}`
        );
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Upload Error",
          description: "Error occurred while uploading image",
        });
        break;
      }
    }

    const updated = { ...propertyData[selectedPortion!] };

    if (imageType === "propertyCoverFileUrl") {
      updated.propertyCoverFileUrl = savedUrls[0];
    }

    if (imageType === "propertyPictureUrls") {
      updated.propertyPictureUrls = [
        ...updated.propertyPictureUrls,
        ...savedUrls,
      ];

      if (syncImages) {
        updated.propertyImages = [
          ...(updated.propertyImages || []),
          ...savedUrls,
        ];
      }
    }

    if (imageType === "propertyImages") {
      updated.propertyImages = [
        ...(updated.propertyImages || []),
        ...savedUrls,
      ];

      if (syncImages) {
        updated.propertyPictureUrls = [
          ...updated.propertyPictureUrls,
          ...savedUrls,
        ];
      }
    }

    setPropertyData((prev) => {
      prev[selectedPortion!] = updated;
      return [...prev];
    });

    setLoadingproperty(false);
  };

  // TODO: Image deletion part
  const handleImageSelect = (
    checked: string | boolean,
    imageType: string,
    imageUrl: string,
    index?: number
  ) => {
    const newArr = [...imagesToDelete];

    if (newArr.includes(imageUrl)) {
      const indexToRemove = newArr.indexOf(imageUrl);
      newArr.splice(indexToRemove, 1);
    } else {
      newArr.push(imageUrl);
    }
    setImagesToDelete(newArr);

    let newObj = { ...imageDeleteObject };

    if (imageType === "propertyCoverFileUrl") {
      if (checked) {
        (newObj as any)[imageType] = true;
      } else {
        delete (newObj as any)[imageType];
      }
    } else {
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

      await axios.post("/api/property/editProperty/deleteImages", {
        pId: propertyData[selectedPortion!]._id,
        data: imageDeleteObject,
        syncImages,
      });

      const deletePromises = imagesToDelete
        .filter((url) => url !== "")
        .map((imageUrl) => bunnyImageDelete(imageUrl));

      await Promise.allSettled(deletePromises);

      toast({
        title: "Success",
        description: syncImages
          ? "Images deleted from both arrays"
          : "Images deleted successfully",
      });

      setImagesToDelete([]);
      setImageDeleteObj({});
      setRefreshFetchProperty((prev) => !prev);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.response?.data?.error || "Failed to delete images",
      });
    } finally {
      setLoadingproperty(false);
    }
  };

  // Copy images between arrays
  const handleCopyImages = (from: string, to: string) => {
    if (selectedPortion === null) return;

    const updatedData = [...propertyData];
    const sourceImages = updatedData[selectedPortion][from] || [];

    updatedData[selectedPortion] = {
      ...updatedData[selectedPortion],
      [to]: [...sourceImages],
    };

    setPropertyData(updatedData);
    toast({
      description: `Images copied from ${from} to ${to}`,
    });
  };

  return (
    <>
      {loading ? (
        <div className="flex items-center justify-center min-h-[80vh]">
          <LoaderCircle size={32} className="animate-spin" />
        </div>
      ) : (
        <Card className="w-full shadow-lg ">
          <CardContent className="p-0 h-full">
            <div className="flex flex-col h-[100vh] md:flex-row">
              {/* Sidebar */}
              <div className="w-full md:w-[28%] lg:w-[24%] min-h-40 border-b-2 md:border-b-0 md:border-r-2 p-6 overflow-y-auto bg-muted/30">
                <Heading
                  heading="Property Portions"
                  subheading="Select a portion to edit its details"
                />
                <div className="mt-6 space-y-2">
                  {propertyData.map((portion: any, index: number) => (
                    <div
                      key={`${portion.VSID}-${index}`}
                      className={
                        selectedPortion === index
                          ? "w-full text-sm justify-start cursor-pointer rounded-xl bg-primary text-primary-foreground border-l-4 px-4 py-3 border-primary shadow-md transition-all transform scale-[1.02]"
                          : "w-full text-sm justify-start py-3 cursor-pointer px-4 hover:bg-muted rounded-xl transition-all"
                      }
                      onClick={() => setSelectedPortion(index)}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm flex items-center gap-x-2 font-semibold">
                          <Ratio size={16} />
                          Portion {index + 1}
                        </p>
                        {portion.isLive ? (
                          <Badge variant="default" className="text-xs">
                            Live
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Draft
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs mt-1 opacity-70">
                        {portion.propertyType || "N/A"} •{" "}
                        {portion.bedrooms || 0} bed
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator orientation="vertical" className="hidden md:block" />

              {/* Main Content */}
              <div className="w-full p-6 overflow-y-scroll bg-background">
                <AnimatePresence mode="wait">
                  {selectedPortion !== null && propertyData[selectedPortion] ? (
                    <motion.div
                      key={selectedPortion}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-8 max-w-7xl mx-auto"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between pb-4 border-b">
                        <div>
                          <h2 className="text-2xl font-bold">
                            Portion {selectedPortion + 1}
                          </h2>
                          <p className="text-sm text-muted-foreground mt-1">
                            Edit details for{" "}
                            {propertyData[selectedPortion].propertyName ||
                              "this portion"}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-sm">
                          VSID: {propertyData[selectedPortion].VSID}
                        </Badge>
                      </div>

                      {/* Image Sync Toggle */}
                      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-primary/10 rounded-lg">
                                <ImageIcon className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <Label className="text-base font-semibold">
                                  Sync Image Arrays
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                  Keep images identical between both arrays
                                </p>
                              </div>
                            </div>
                            <Switch
                              checked={syncImages}
                              onCheckedChange={setSyncImages}
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Images Section */}
                      <Card>
                        <CardContent className="p-6 space-y-6">
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <ImageIcon className="h-5 w-5" />
                            Property Images
                          </h3>

                          {/* Cover Image */}
                          <div className="space-y-3">
                            <Label className="text-base font-semibold">
                              Cover Image
                            </Label>
                            <div className="relative group">
                              {propertyData[selectedPortion]
                                .propertyCoverFileUrl ? (
                                <img
                                  src={
                                    propertyData[selectedPortion]
                                      .propertyCoverFileUrl
                                  }
                                  alt={`Portion ${selectedPortion + 1} cover`}
                                  className="w-full h-72 object-cover rounded-xl shadow-md"
                                />
                              ) : (
                                <div className="w-full h-72 bg-muted rounded-xl flex items-center justify-center border-2 border-dashed">
                                  <div className="text-center">
                                    <ImageIcon className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                                    <p className="text-muted-foreground">
                                      No cover image
                                    </p>
                                  </div>
                                </div>
                              )}
                              {propertyData[selectedPortion]
                                .propertyCoverFileUrl && (
                                <Checkbox
                                  className="cursor-pointer absolute left-4 top-4 w-6 h-6 bg-background border-primary shadow-lg"
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
                                  <div className="flex items-center gap-2 bg-background/95 backdrop-blur-sm hover:bg-background border-2 shadow-lg rounded-xl py-2.5 px-5 cursor-pointer transition-all hover:scale-105">
                                    {loadingProperty ? (
                                      <LoaderCircle
                                        size={18}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <UploadIcon size={18} />
                                    )}
                                    <span className="text-sm font-semibold">
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

                          <Separator />

                          {/* Property Picture URLs */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-base font-semibold">
                                Property Picture URLs{" "}
                                <span className="text-xs text-muted-foreground font-normal">
                                  (Gallery Section)
                                </span>
                              </Label>
                              {(!propertyData[selectedPortion]
                                ?.propertyPictureUrls ||
                                propertyData[
                                  selectedPortion
                                ]?.propertyPictureUrls.filter(
                                  (url: string) => url !== ""
                                ).length === 0) &&
                                propertyData[
                                  selectedPortion
                                ]?.propertyImages?.filter(
                                  (url: string) => url !== ""
                                ).length > 0 && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handleCopyImages(
                                        "propertyImages",
                                        "propertyPictureUrls"
                                      )
                                    }
                                  >
                                    <Copy size={14} className="mr-2" />
                                    Copy from Property Images
                                  </Button>
                                )}
                            </div>
                            <div className="flex gap-4 overflow-x-auto pb-4">
                              <label htmlFor="file-upload-propertyPictureUrls">
                                <div className="flex-shrink-0 flex items-center justify-center h-48 w-48 border-2 border-dashed rounded-xl hover:bg-muted/50 hover:border-primary cursor-pointer transition-all">
                                  <div className="flex flex-col items-center gap-2">
                                    {loadingProperty ? (
                                      <LoaderCircle
                                        size={28}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <UploadIcon size={28} />
                                    )}
                                    <p className="text-sm font-semibold">
                                      Upload Images
                                    </p>
                                  </div>
                                </div>
                                <input
                                  id="file-upload-propertyPictureUrls"
                                  type="file"
                                  className="sr-only"
                                  multiple
                                  accept="image/*"
                                  onChange={(e) =>
                                    handleImageUpload(
                                      e,
                                      "propertyPictureUrls",
                                      0
                                    )
                                  }
                                  disabled={loadingProperty}
                                />
                              </label>

                              {propertyData[
                                selectedPortion
                              ]?.propertyPictureUrls
                                ?.filter((url: string) => url !== "")
                                ?.map((url: string, index: number) => (
                                  <div
                                    key={`picture-url-${index}`}
                                    className="relative flex-shrink-0 group"
                                  >
                                    <img
                                      src={url}
                                      alt={`Picture URL ${index + 1}`}
                                      className="w-48 h-48 object-cover rounded-xl shadow-md group-hover:shadow-lg transition-all"
                                    />
                                    <Checkbox
                                      className="cursor-pointer absolute left-3 top-3 w-6 h-6 bg-background border-primary shadow-lg"
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

                          <Separator />

                          {/* Property Images */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-base font-semibold">
                                Property Images{" "}
                                <span className="text-xs text-muted-foreground font-normal">
                                  (Alternative Gallery)
                                </span>
                              </Label>
                              {(!propertyData[selectedPortion]
                                ?.propertyImages ||
                                propertyData[
                                  selectedPortion
                                ]?.propertyImages.filter(
                                  (url: string) => url !== ""
                                ).length === 0) &&
                                propertyData[
                                  selectedPortion
                                ]?.propertyPictureUrls?.filter(
                                  (url: string) => url !== ""
                                ).length > 0 && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handleCopyImages(
                                        "propertyPictureUrls",
                                        "propertyImages"
                                      )
                                    }
                                  >
                                    <Copy size={14} className="mr-2" />
                                    Copy from Property Picture URLs
                                  </Button>
                                )}
                            </div>
                            <div className="flex gap-4 overflow-x-auto pb-4">
                              <label htmlFor="file-upload-propertyImages">
                                <div className="flex-shrink-0 flex items-center justify-center h-48 w-48 border-2 border-dashed rounded-xl hover:bg-muted/50 hover:border-primary cursor-pointer transition-all">
                                  <div className="flex flex-col items-center gap-2">
                                    {loadingProperty ? (
                                      <LoaderCircle
                                        size={28}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <UploadIcon size={28} />
                                    )}
                                    <p className="text-sm font-semibold">
                                      Upload Images
                                    </p>
                                  </div>
                                </div>
                                <input
                                  id="file-upload-propertyImages"
                                  type="file"
                                  className="sr-only"
                                  multiple
                                  accept="image/*"
                                  onChange={(e) =>
                                    handleImageUpload(e, "propertyImages", 0)
                                  }
                                  disabled={loadingProperty}
                                />
                              </label>

                              {propertyData[selectedPortion]?.propertyImages
                                ?.filter((url: string) => url !== "")
                                ?.map((url: string, index: number) => (
                                  <div
                                    key={`property-image-${index}`}
                                    className="relative flex-shrink-0 group"
                                  >
                                    <img
                                      src={url}
                                      alt={`Property Image ${index + 1}`}
                                      className="w-48 h-48 object-cover rounded-xl shadow-md group-hover:shadow-lg transition-all"
                                    />
                                    <Checkbox
                                      className="cursor-pointer absolute left-3 top-3 w-6 h-6 bg-background border-primary shadow-lg"
                                      onCheckedChange={(checked) =>
                                        handleImageSelect(
                                          checked,
                                          "propertyImages",
                                          url,
                                          index
                                        )
                                      }
                                    />
                                  </div>
                                ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Basic Information */}
                      <Card>
                        <CardContent className="p-6 space-y-6">
                          <h3 className="text-lg font-semibold">
                            Basic Information
                          </h3>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {/* Property Type */}
                            <div>
                              <Label>Property Type</Label>
                              <Select
                                value={
                                  propertyData[selectedPortion]?.propertyType ||
                                  ""
                                }
                                onValueChange={(value) => {
                                  if (selectedPortion === null) return;
                                  const updatedData = [...propertyData];
                                  updatedData[selectedPortion] = {
                                    ...updatedData[selectedPortion],
                                    propertyType: value,
                                  };
                                  setPropertyData(updatedData);
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select property type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Apartment">
                                    Apartment
                                  </SelectItem>
                                  <SelectItem value="House">House</SelectItem>
                                  <SelectItem value="Villa">Villa</SelectItem>
                                  <SelectItem value="Studio">Studio</SelectItem>
                                  <SelectItem value="Condo">Condo</SelectItem>
                                  <SelectItem value="Townhouse">
                                    Townhouse
                                  </SelectItem>
                                  <SelectItem value="Loft">Loft</SelectItem>
                                  <SelectItem value="Penthouse">
                                    Penthouse
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Place Name */}
                            <div>
                              <Label>Place Name</Label>
                              <Input
                                onChange={(e) =>
                                  handleInputChange(e, "placeName")
                                }
                                defaultValue={
                                  propertyData[selectedPortion].placeName
                                }
                                placeholder="Enter place name"
                              />
                            </div>

                            {/* Size */}
                            <div>
                              <Label>Property Size (sq ft)</Label>
                              <Input
                                type="number"
                                onChange={(e) => handleInputChange(e, "size")}
                                defaultValue={
                                  propertyData[selectedPortion].size
                                }
                                placeholder="Enter size"
                              />
                            </div>

                            {/* Floor */}
                            <div>
                              <Label>Floor</Label>
                              <Input
                                onChange={(e) => handleInputChange(e, "floor")}
                                defaultValue={
                                  propertyData[selectedPortion].floor
                                }
                                placeholder="e.g., 3rd Floor"
                              />
                            </div>

                            {/* Neighbourhood */}
                            <div>
                              <Label>Neighbourhood</Label>
                              <Input
                                onChange={(e) =>
                                  handleInputChange(e, "neighbourhood")
                                }
                                defaultValue={
                                  propertyData[selectedPortion].neighbourhood
                                }
                                placeholder="Enter neighbourhood"
                              />
                            </div>

                            {/* Subarea */}
                            <div>
                              <Label>Subarea</Label>
                              <Input
                                onChange={(e) =>
                                  handleInputChange(e, "subarea")
                                }
                                defaultValue={
                                  propertyData[selectedPortion].subarea
                                }
                                placeholder="Enter subarea"
                              />
                            </div>

                            {/* Max Guests */}
                            <div>
                              <Label>Max Guests</Label>
                              <Input
                                type="number"
                                onChange={(e) => handleInputChange(e, "guests")}
                                defaultValue={
                                  propertyData[selectedPortion].guests
                                }
                                placeholder="Enter max guests"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Calendar Management */}
                      <Card>
                        <CardContent className="p-6">
                          <Label className="text-base font-semibold mb-3 block">
                            Manage Calendar
                          </Label>
                          <Link
                            href={`/dashboard/newproperty/editPortionAvailability/${propertyData[selectedPortion]._id}`}
                          >
                            <div className="flex items-center gap-3 h-12 w-full rounded-xl border-2 border-input bg-background px-4 py-2 text-sm hover:bg-muted/50 hover:border-primary cursor-pointer transition-all">
                              <CalendarDaysIcon className="h-5 w-5 text-primary" />
                              <span className="font-medium">
                                Open portion calendar
                              </span>
                            </div>
                          </Link>
                        </CardContent>
                      </Card>

                      {/* Property Details Grid */}
                      <Card>
                        <CardContent className="p-6 space-y-6">
                          <h3 className="text-lg font-semibold">
                            Property Details
                          </h3>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {/* Read-only fields */}
                            <div className="opacity-60">
                              <Label>Property VSID</Label>
                              <Input
                                disabled
                                defaultValue={
                                  propertyData[selectedPortion].VSID
                                }
                                className="bg-muted"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Read-only
                              </p>
                            </div>

                            <div className="opacity-60">
                              <Label>Last Updated By</Label>
                              <Input
                                disabled
                                defaultValue={propertyData[
                                  selectedPortion
                                ]?.lastUpdatedBy.at(-1)}
                                className="bg-muted"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Read-only
                              </p>
                            </div>

                            <div className="opacity-60">
                              <Label>Last Updated At</Label>
                              <Input
                                disabled
                                defaultValue={propertyData[
                                  selectedPortion
                                ]?.lastUpdates.at(-1)}
                                className="bg-muted"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Read-only
                              </p>
                            </div>

                            <div className="opacity-60">
                              <Label>Portion Number</Label>
                              <Input
                                disabled
                                defaultValue={
                                  propertyData[selectedPortion].portionNo
                                }
                                className="bg-muted"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Read-only
                              </p>
                            </div>

                            <div className="opacity-60">
                              <Label>Property Name</Label>
                              <Input
                                disabled
                                defaultValue={
                                  propertyData[selectedPortion].propertyName
                                }
                                className="bg-muted"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Read-only
                              </p>
                            </div>

                            {/* Editable toggle fields */}
                            <div>
                              <Label>Instant Booking</Label>
                              <div className="flex h-11 w-full rounded-xl justify-between items-center border-2 border-input bg-background px-4">
                                <span className="text-sm font-medium">
                                  Enable
                                </span>
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
                              <div className="flex h-11 w-full rounded-xl justify-between items-center border-2 border-input bg-background px-4">
                                <span className="text-sm font-medium">
                                  Live
                                </span>
                                <Switch
                                  checked={
                                    propertyData[selectedPortion]?.isLive ||
                                    false
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
                              <div className="flex h-11 w-full rounded-xl justify-between items-center border-2 border-input bg-background px-4">
                                <span className="text-sm font-medium">
                                  Allow Students
                                </span>
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
                              <div className="flex h-11 w-full rounded-xl justify-between items-center border-2 border-input bg-background px-4">
                                <span className="text-sm font-medium">
                                  Is Top Floor
                                </span>
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
                                onChange={(e) =>
                                  handleInputChange(e, "basePrice")
                                }
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
                                defaultValue={
                                  propertyData[selectedPortion].area
                                }
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
                                  propertyData[selectedPortion]
                                    .basePriceLongTerm
                                }
                              />
                            </div>

                            <div>
                              <Label>Bathrooms</Label>
                              <Input
                                type="number"
                                onChange={(e) =>
                                  handleInputChange(e, "bathroom")
                                }
                                defaultValue={
                                  propertyData[selectedPortion].bathroom
                                }
                              />
                            </div>

                            <div>
                              <Label>Bedrooms</Label>
                              <Input
                                type="number"
                                onChange={(e) =>
                                  handleInputChange(e, "bedrooms")
                                }
                                defaultValue={
                                  propertyData[selectedPortion].bedrooms
                                }
                              />
                            </div>

                            <div>
                              <Label>City</Label>
                              <Input
                                onChange={(e) => handleInputChange(e, "city")}
                                defaultValue={
                                  propertyData[selectedPortion].city
                                }
                              />
                            </div>

                            <div>
                              <Label>Street</Label>
                              <Input
                                onChange={(e) => handleInputChange(e, "street")}
                                defaultValue={
                                  propertyData[selectedPortion].street
                                }
                              />
                            </div>

                            <div>
                              <Label>Postal Code</Label>
                              <Input
                                onChange={(e) =>
                                  handleInputChange(e, "postalCode")
                                }
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
                                value={
                                  propertyData[selectedPortion]?.cooking || ""
                                }
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
                                value={
                                  propertyData[selectedPortion]?.party || ""
                                }
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
                                value={
                                  propertyData[selectedPortion]?.smoking || ""
                                }
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
                        </CardContent>
                      </Card>

                      {/* Amenities Sections */}
                      {propertyData[selectedPortion]?.generalAmenities &&
                        Object.keys(
                          propertyData[selectedPortion]?.generalAmenities || {}
                        ).length > 0 && (
                          <Card>
                            <CardContent className="p-6 space-y-4">
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
                                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 border border-transparent hover:border-primary/20 transition-all"
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
                                      className="text-sm cursor-pointer flex-1"
                                    >
                                      {amenity}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                      {propertyData[selectedPortion]?.otherAmenities &&
                        Object.keys(
                          propertyData[selectedPortion]?.otherAmenities || {}
                        ).length > 0 && (
                          <Card>
                            <CardContent className="p-6 space-y-4">
                              <h3 className="text-lg font-semibold">
                                Other Amenities
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {Object.entries(
                                  propertyData[selectedPortion]
                                    ?.otherAmenities || {}
                                ).map(([amenity, value]) => (
                                  <div
                                    key={amenity}
                                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 border border-transparent hover:border-primary/20 transition-all"
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
                                      className="text-sm cursor-pointer flex-1"
                                    >
                                      {amenity}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                      {propertyData[selectedPortion]?.safeAmenities &&
                        Object.keys(
                          propertyData[selectedPortion]?.safeAmenities || {}
                        ).length > 0 && (
                          <Card>
                            <CardContent className="p-6 space-y-4">
                              <h3 className="text-lg font-semibold">
                                Safety Amenities
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {Object.entries(
                                  propertyData[selectedPortion]
                                    ?.safeAmenities || {}
                                ).map(([amenity, value]) => (
                                  <div
                                    key={amenity}
                                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 border border-transparent hover:border-primary/20 transition-all"
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
                                      className="text-sm cursor-pointer flex-1"
                                    >
                                      {amenity}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                      {/* Additional Rules */}
                      <Card>
                        <CardContent className="p-6 space-y-4">
                          <h3 className="text-lg font-semibold">
                            Additional Rules
                          </h3>
                          <div className="space-y-3">
                            {propertyData[selectedPortion]?.additionalRules.map(
                              (rule: string, index: number) => (
                                <div
                                  key={`rule-${index}`}
                                  className="flex items-center justify-between p-4 border-2 rounded-xl hover:border-primary/50 transition-all"
                                >
                                  <span className="text-sm flex-1">{rule}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteRule(index)}
                                    className="hover:bg-destructive/10"
                                  >
                                    <Trash
                                      size={16}
                                      className="text-destructive"
                                    />
                                  </Button>
                                </div>
                              )
                            )}
                            <div className="flex gap-3">
                              <Input
                                value={newRule}
                                onChange={(e) => setNewRule(e.target.value)}
                                placeholder="Add new rule"
                                className="flex-1"
                                onKeyPress={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleAddRule();
                                  }
                                }}
                              />
                              <Button
                                onClick={handleAddRule}
                                size="icon"
                                className="h-11 w-11"
                              >
                                <Plus size={20} />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Descriptions */}
                      <Card>
                        <CardContent className="p-6 space-y-5">
                          <h3 className="text-lg font-semibold">
                            Descriptions
                          </h3>

                          <div>
                            <Label className="text-base font-semibold">
                              Description
                            </Label>
                            <Textarea
                              onChange={(e: any) =>
                                handleInputChange(e, "reviews")
                              }
                              className="min-h-36 mt-2"
                              defaultValue={
                                propertyData[selectedPortion].reviews
                              }
                            />
                          </div>

                          <div className="opacity-60">
                            <Label className="text-base font-semibold">
                              New Description (Auto-generated)
                            </Label>
                            <Textarea
                              disabled
                              className="min-h-36 mt-2 bg-muted"
                              defaultValue={
                                propertyData[selectedPortion].newReviews
                              }
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Read-only
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Action Buttons */}
                      <Card className="sticky bottom-0 z-10 shadow-lg">
                        <CardContent className="p-5">
                          <div className="flex flex-col sm:flex-row gap-3">
                            <Button
                              disabled={propertyLoading || loadingProperty}
                              onClick={editproperty}
                              className="flex-1 h-12 text-base font-semibold"
                              size="lg"
                            >
                              {propertyLoading ? (
                                <>
                                  <LoaderCircle
                                    size={20}
                                    className="animate-spin mr-2"
                                  />
                                  Updating...
                                </>
                              ) : (
                                <>
                                  <Save size={20} className="mr-2" />
                                  Update Property
                                </>
                              )}
                            </Button>
                            <Button
                              variant="destructive"
                              disabled={
                                loadingProperty || imagesToDelete.length === 0
                              }
                              onClick={handleImageDelete}
                              className="flex-1 sm:flex-initial h-12 text-base font-semibold"
                              size="lg"
                            >
                              {loadingProperty ? (
                                <>
                                  <LoaderCircle
                                    size={20}
                                    className="animate-spin mr-2"
                                  />
                                  Deleting...
                                </>
                              ) : (
                                <>
                                  <Trash size={20} className="mr-2" />
                                  Delete Images ({imagesToDelete.length})
                                </>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
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
                      <p className="text-xl font-semibold mt-6 text-muted-foreground">
                        Select a portion to view details
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Choose a portion from the sidebar to start editing
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
