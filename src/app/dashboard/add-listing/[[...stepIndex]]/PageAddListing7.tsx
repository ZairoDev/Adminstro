"use client";
import { useEffect, useState } from "react";
import React, { FC } from "react";
import axios from "axios";
import { MdCancel } from "react-icons/md";
import { FileUpIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ScreenLoader from "@/components/ScreenLoader";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import Heading from "@/components/Heading";
import Loader from "@/components/loader";
import { Progress } from "@/components/ui/progress";

export interface PageAddListing7Props {}

const PageAddListing7: FC<PageAddListing7Props> = () => {
  const params = useSearchParams();

  // const userId = params.get("userId") ?? null;
  const userId = params?.get("userId") ?? null;


  let portions = 0;
  const data = localStorage.getItem("page1") || "";
  if (data) {
    const value = JSON.parse(data)["numberOfPortions"];
    if (value) {
      portions = parseInt(value, 10);
    }
  }
  let checkPortion = portions > 1 ? portions : 0;
  const { toast } = useToast();
  const [myArray, setMyArray] = useState<number[]>(Array(checkPortion).fill(1));

  const booleanArray = Array.from({ length: portions }, () => false);
  const emptyStringArrayGenerator = (size: number) => {
    const emptyStringArray = Array.from({ length: size }, () => "");
    return emptyStringArray;
  };

  const [portionCoverFileUrls, setPortionCoverFileUrls] = useState<string[]>(
    () => {
      const savedUrls = localStorage.getItem("portionCoverFileUrls");
      if (savedUrls) {
        const savedImages = JSON.parse(savedUrls);
        if (savedImages?.length != portions) {
          return emptyStringArrayGenerator(portions);
        }
      }

      return savedUrls
        ? JSON.parse(savedUrls)
        : emptyStringArrayGenerator(portions);
    }
  );

  const [propertyCoverFileUrl, setPropertyCoverFileUrl] = useState<string>(
    () => {
      const savedUrls = localStorage.getItem("propertyCoverFileUrl");
      return savedUrls ? savedUrls : "";
    }
  );

  const [portionPictureUrls, setPortionPictureUrls] = useState<string[][]>(
    () => {
      const savedUrls = localStorage.getItem("portionPictureUrls") || "";
      const arrayOf5 = Array(5).fill("");

      return savedUrls ? JSON.parse(savedUrls) : Array(portions).fill(arrayOf5);
    }
  );

  const [isPortionPictures, setIsPortionPictures] = useState<boolean[]>(() => {
    const savedFlags = localStorage.getItem("isPortionPictures");
    return savedFlags ? JSON.parse(savedFlags) : Array(portions).fill(false);
  });

  const [propertyPictureUrls, setPropertyPictureUrls] = useState<string[]>(
    () => {
      const savedUrls = localStorage.getItem("propertyPictureUrls");
      return savedUrls ? JSON.parse(savedUrls) : Array(5).fill("");
    }
  );

  const [isPropertyPictures, setIsPropertyPictures] = useState<boolean>(() => {
    const savedFlag = localStorage.getItem("isPropertyPictures");
    return savedFlag ? JSON.parse(savedFlag) : false;
  });

  const [isImages, setIsImages] = useState<boolean[]>(() => {
    const savedFlag = localStorage.getItem("isImages");
    return savedFlag ? JSON.parse(savedFlag) : booleanArray;
  });

  useEffect(() => {
    localStorage.setItem("propertyCoverFileUrl", propertyCoverFileUrl);
  }, [propertyCoverFileUrl]);

  useEffect(() => {
    localStorage.setItem(
      "portionPictureUrls",
      JSON.stringify(portionPictureUrls)
    );
  }, [portionPictureUrls]);

  useEffect(() => {
    localStorage.setItem(
      "isPortionPictures",
      JSON.stringify(isPortionPictures)
    );
  }, [isPortionPictures]);

  useEffect(() => {
    localStorage.setItem(
      "propertyPictureUrls",
      JSON.stringify(propertyPictureUrls)
    );
  }, [propertyPictureUrls]);

  useEffect(() => {
    localStorage.setItem(
      "isPropertyPictures",
      JSON.stringify(isPropertyPictures)
    );
  }, [isPropertyPictures]);

  useEffect(() => {
    localStorage.setItem(
      "portionCoverFileUrls",
      JSON.stringify(portionCoverFileUrls)
    );
  }, [portionCoverFileUrls]);

  useEffect(() => {
    localStorage.setItem("isImages", JSON.stringify(isImages));
  }, [isImages]);

  // TODO: File upload to BUNNY
  const [propertyCoverFileLoading, setPropertyCoverFileLoading] =
    useState(false);
  const [propertyPicturesLoading, setPropertyPicturesLoading] = useState(false);
  const [portionCoverFileLoading, setPortionCoverFileLoading] = useState<
    boolean[]
  >(Array.from({ length: checkPortion }, () => false));
  const [portionPicturesLoading, setPortionPicturesLoading] = useState<
    boolean[]
  >(Array.from({ length: checkPortion }, () => false));
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

  // Get placeName safely
  const getPlaceName = () => {
    try {
      const page1Data = localStorage.getItem("page1");
      if (!page1Data) {
        return "default";
      }
      const parsed = JSON.parse(page1Data);
      if (!parsed.placeName) {
        return "default";
      }
      return parsed.placeName.toLowerCase().split(" ").join("_");
    } catch (error) {
      console.error("Error parsing page1 data:", error);
      return "default";
    }
  };

  const uploadFile = async (event: any, index: number) => {
    setPortionCoverFileLoading((prev) => {
      const newArray = [...prev];
      newArray[index] = true;
      return newArray;
    });

    const file = event?.target.files[0];

    if (!file) {
      setPortionCoverFileLoading((prev) => {
        const newArray = [...prev];
        newArray[index] = false;
        return newArray;
      });
      return;
    }

    // Validate file type
    if (
      !(
        file.type === "image/jpeg" ||
        file.type === "image/png" ||
        file.type === "image/webp"
      )
    ) {
      toast({
        variant: "destructive",
        title: "Invalid File Type",
        description:
          "We only accept JPEG, PNG, and WebP formats. Please try again with a supported format.",
      });
      setPortionCoverFileLoading((prev) => {
        const newArray = [...prev];
        newArray[index] = false;
        return newArray;
      });
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        variant: "destructive",
        title: "File Too Large",
        description: `File size must be less than 10MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`,
      });
      setPortionCoverFileLoading((prev) => {
        const newArray = [...prev];
        newArray[index] = false;
        return newArray;
      });
      return;
    }

    const storageZoneName = process.env.NEXT_PUBLIC_BUNNY_STORAGE_ZONE;
    const accessKey = process.env.NEXT_PUBLIC_BUNNY_ACCESS_KEY;
    const storageUrl = process.env.NEXT_PUBLIC_BUNNY_STORAGE_URL;
    const placeName = getPlaceName();

    const fileKey = `portion-cover-${index}`;
    setUploadProgress((prev) => ({ ...prev, [fileKey]: 0 }));

    try {
      const response = await axios.put(
        `${storageUrl}/${storageZoneName}/${placeName}/${file.name}`,
        file,
        {
          headers: {
            AccessKey: accessKey,
            "Content-Type": file.type,
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setUploadProgress((prev) => ({ ...prev, [fileKey]: percentCompleted }));
            }
          },
        }
      );

      const imageUrl = `https://vacationsaga.b-cdn.net/${placeName}/${file.name}`;

      setPortionCoverFileUrls((prevState) => {
        const newUrls = [...prevState];
        newUrls[index] = imageUrl;
        return newUrls;
      });

      setIsImages((prevState) => {
        const newImages = [...prevState];
        newImages[index] = true;
        return newImages;
      });

      setUploadProgress((prev) => {
        const newProgress = { ...prev };
        delete newProgress[fileKey];
        return newProgress;
      });

      toast({
        title: "Upload Successful",
        description: "Cover image uploaded successfully.",
      });
    } catch (error) {
      console.error("Error uploading image to Bunny CDN:", error);
      toast({
        variant: "destructive",
        title: "Upload Error",
        description:
          "An error occurred while uploading the image. Please try again later.",
      });
      setUploadProgress((prev) => {
        const newProgress = { ...prev };
        delete newProgress[fileKey];
        return newProgress;
      });
    }

    setPortionCoverFileLoading((prev) => {
      const newArray = [...prev];
      newArray[index] = false;
      return newArray;
    });
  };

  const uploadPropertyCoverFile = async (event: any) => {
    setPropertyCoverFileLoading(true);
    const file = event?.target.files[0];
    
    if (!file) {
      setPropertyCoverFileLoading(false);
      return;
    }

    // Validate file type
    if (
      !(
        file.type === "image/jpeg" ||
        file.type === "image/png" ||
        file.type === "image/webp"
      )
    ) {
      toast({
        variant: "destructive",
        title: "Invalid File Type",
        description:
          "We only accept JPEG, PNG, and WebP formats. Please try again with a supported format.",
      });
      setPropertyCoverFileLoading(false);
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        variant: "destructive",
        title: "File Too Large",
        description: `File size must be less than 10MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`,
      });
      setPropertyCoverFileLoading(false);
      return;
    }

    const storageZoneName = process.env.NEXT_PUBLIC_BUNNY_STORAGE_ZONE;
    const accessKey = process.env.NEXT_PUBLIC_BUNNY_ACCESS_KEY;
    const storageUrl = process.env.NEXT_PUBLIC_BUNNY_STORAGE_URL;
    const placeName = getPlaceName();

    const fileKey = "property-cover";
    setUploadProgress((prev) => ({ ...prev, [fileKey]: 0 }));

    try {
      const response = await axios.put(
        `${storageUrl}/${storageZoneName}/${placeName}/${file.name}`,
        file,
        {
          headers: {
            AccessKey: accessKey,
            "Content-Type": file.type,
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setUploadProgress((prev) => ({ ...prev, [fileKey]: percentCompleted }));
            }
          },
        }
      );

      const imageUrl = `https://vacationsaga.b-cdn.net/${placeName}/${file.name}`;
      setPropertyCoverFileUrl(imageUrl);
      
      setUploadProgress((prev) => {
        const newProgress = { ...prev };
        delete newProgress[fileKey];
        return newProgress;
      });

      toast({
        title: "Upload Successful",
        description: "Banner image uploaded successfully.",
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        variant: "destructive",
        title: "Upload Error",
        description:
          "An error occurred while uploading the image. Please try again later.",
      });
      setUploadProgress((prev) => {
        const newProgress = { ...prev };
        delete newProgress[fileKey];
        return newProgress;
      });
    }
    setPropertyCoverFileLoading(false);
  };

  const uploadPortionPictures = async (event: any, index: number) => {
    // Set loading to true for the current index
    setPortionPicturesLoading((prevState) => {
      const newLoading = [...prevState];
      newLoading[index] = true;
      return newLoading;
    });

    const files = event?.target.files;

    if (!files || files.length === 0) {
      toast({
        variant: "destructive",
        title: "No Files Selected",
        description: "Please select files to upload.",
      });
      setPortionPicturesLoading((prevState) => {
        const newLoading = [...prevState];
        newLoading[index] = false;
        return newLoading;
      });
      return;
    }

    // Validate file types and sizes
    for (let i = 0; i < files.length; i++) {
      if (
        !(
          files[i].type === "image/png" ||
          files[i].type === "image/jpeg" ||
          files[i].type === "image/webp"
        )
      ) {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description:
            "We only accept JPEG, PNG, and WebP formats. Please try again with supported formats.",
        });
        setPortionPicturesLoading((prevState) => {
          const newLoading = [...prevState];
          newLoading[index] = false;
          return newLoading;
        });
        return;
      }

      if (files[i].size > MAX_FILE_SIZE) {
        toast({
          variant: "destructive",
          title: "File Too Large",
          description: `File "${files[i].name}" is too large. Maximum size is 10MB.`,
        });
        setPortionPicturesLoading((prevState) => {
          const newLoading = [...prevState];
          newLoading[index] = false;
          return newLoading;
        });
        return;
      }
    }

    const storageZoneName = process.env.NEXT_PUBLIC_BUNNY_STORAGE_ZONE;
    const accessKey = process.env.NEXT_PUBLIC_BUNNY_ACCESS_KEY;
    const storageUrl = process.env.NEXT_PUBLIC_BUNNY_STORAGE_URL;
    const placeName = getPlaceName();

    const formData = new FormData();

    const updatedUrls = [...portionPictureUrls];
    const newImages = [...isPortionPictures];
    let uploadedCount = 0;

    for (let i = 0; i < files.length; i++) {
      const fileKey = `portion-picture-${index}-${i}`;
      setUploadProgress((prev) => ({ ...prev, [fileKey]: 0 }));

      try {
        const response = await axios.put(
          `${storageUrl}/${storageZoneName}/${placeName}/${files[i].name}`,
          files[i],
          {
            headers: {
              AccessKey: accessKey,
              "Content-Type": files[i].type,
            },
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const percentCompleted = Math.round(
                  (progressEvent.loaded * 100) / progressEvent.total
                );
                setUploadProgress((prev) => ({ ...prev, [fileKey]: percentCompleted }));
              }
            },
          }
        );

        const imageUrl = `https://vacationsaga.b-cdn.net/${placeName}/${files[i].name}`;

        // Update portionPictureUrls with new image URLs
        updatedUrls[index] = [...updatedUrls[index]];
        updatedUrls[index][i] = imageUrl;
        uploadedCount++;

        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[fileKey];
          return newProgress;
        });
      } catch (error) {
        console.error("Error uploading image to Bunny CDN:", error);
        toast({
          variant: "destructive",
          title: "Upload Error",
          description: `Failed to upload "${files[i].name}". Please try again.`,
        });
        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[fileKey];
          return newProgress;
        });
        break;
      }
    }

    if (uploadedCount > 0) {
      newImages[index] = true;
      setPortionPictureUrls(updatedUrls);
      setIsPortionPictures(newImages);
      toast({
        title: "Upload Successful",
        description: `${uploadedCount} image(s) uploaded successfully.`,
      });
    }

    // Set loading state to false after upload completion
    setPortionPicturesLoading((prevState) => {
      const newLoading = [...prevState];
      newLoading[index] = false;
      return newLoading;
    });
  };

  const uploadPropertyPictures = async (event: any) => {
    setPropertyPicturesLoading(true);
    const files = event?.target.files;

    if (!files || files.length === 0) {
      setPropertyPicturesLoading(false);
      return;
    }

    // Validate file types and sizes
    for (let i = 0; i < files.length; i++) {
      if (
        !(
          files[i].type === "image/png" ||
          files[i].type === "image/jpeg" ||
          files[i].type === "image/webp"
        )
      ) {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description:
            "We only accept JPEG, PNG, and WebP formats. Please try again with supported formats.",
        });
        setPropertyPicturesLoading(false);
        return;
      }

      if (files[i].size > MAX_FILE_SIZE) {
        toast({
          variant: "destructive",
          title: "File Too Large",
          description: `File "${files[i].name}" is too large. Maximum size is 10MB.`,
        });
        setPropertyPicturesLoading(false);
        return;
      }
    }
    const storageZoneName = process.env.NEXT_PUBLIC_BUNNY_STORAGE_ZONE;
    const accessKey = process.env.NEXT_PUBLIC_BUNNY_ACCESS_KEY;
    const storageUrl = process.env.NEXT_PUBLIC_BUNNY_STORAGE_URL;
    const placeName = getPlaceName();

    const formData = new FormData();
    const savedUrls = [...propertyPictureUrls];
    let uploadedCount = 0;

    for (let i = 0; i < files.length; i++) {
      const fileKey = `property-picture-${i}`;
      setUploadProgress((prev) => ({ ...prev, [fileKey]: 0 }));

      try {
        const response = await axios.put(
          `${storageUrl}/${storageZoneName}/${placeName}/${files[i].name}`,
          files[i],
          {
            headers: {
              AccessKey: accessKey,
              "Content-Type": files[i].type,
            },
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const percentCompleted = Math.round(
                  (progressEvent.loaded * 100) / progressEvent.total
                );
                setUploadProgress((prev) => ({ ...prev, [fileKey]: percentCompleted }));
              }
            },
          }
        );

        const imageUrl = `https://vacationsaga.b-cdn.net/${placeName}/${files[i].name}`;
        savedUrls[i] = imageUrl;
        uploadedCount++;

        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[fileKey];
          return newProgress;
        });
      } catch (error) {
        console.error("Error uploading image:", error);
        toast({
          variant: "destructive",
          title: "Upload Error",
          description: `Failed to upload "${files[i].name}". Please try again.`,
        });
        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[fileKey];
          return newProgress;
        });
        break;
      }
    }

    if (uploadedCount > 0) {
      setPropertyPictureUrls(savedUrls);
      setIsPropertyPictures(true);
      toast({
        title: "Upload Successful",
        description: `${uploadedCount} image(s) uploaded successfully.`,
      });
    }

    setPropertyPicturesLoading(false);
  };

  return (
    <>
      <div className="flex flex-col gap-20">
        <div className="space-y-8">
          <Heading
            heading="Banner Image"
            subheading="Add a banner image this will be displayed at the top of the listing"
          />
          <div>
            <div className="mt-5 ">
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md">
                <div className="space-y-1 text-center flex flex-col items-center">
                  {propertyCoverFileLoading ? (
                    <div className="flex flex-col items-center justify-center gap-4 w-full">
                      <Loader />
                      {uploadProgress["property-cover"] !== undefined && (
                        <div className="w-full max-w-xs">
                          <Progress value={uploadProgress["property-cover"]} />
                          <p className="text-xs text-center mt-2 text-muted-foreground">
                            {uploadProgress["property-cover"]}% uploaded
                          </p>
                        </div>
                      )}
                    </div>
                  ) : propertyCoverFileUrl.length < 1 ? (
                    <div className="flex items-center justify-center">
                      <FileUpIcon className="h-10 w-10 flex items-center justify-center" />
                    </div>
                  ) : (
                    <div>
                      <MdCancel
                        className="text-right ml-auto text-xl cursor-pointer"
                        onClick={() => setPropertyCoverFileUrl("")}
                      />
                      <div className="flex flex-wrap gap-2">
                        <img
                          src={propertyCoverFileUrl}
                          alt="Cover Image"
                          className="w-48 h-48 rounded-lg"
                        />
                      </div>
                    </div>
                  )}

                  {!propertyCoverFileLoading && (
                    <div className="flex text-sm ">
                      <label
                        htmlFor={`file-upload`}
                        className="relative cursor-pointer rounded-md font-medium text-primary-6000 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                      >
                        <span className="text-center">Upload a file</span>
                        <input
                          id={`file-upload`}
                          name={`file-upload`}
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={(e) => uploadPropertyCoverFile(e)}
                        />
                      </label>
                    </div>
                  )}
                  <p className="text-xs">PNG, JPG, GIF up to 10MB</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <Heading
              heading="Property Pictures"
              subheading="Upload a image about the property."
            />
            <div className="mt-5 ">
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  {propertyPicturesLoading ? (
                    <div className="flex flex-col items-center justify-center gap-4 w-full">
                      <Loader />
                      {Object.keys(uploadProgress).some(key => key.startsWith("property-picture")) && (
                        <div className="w-full max-w-xs space-y-2">
                          {Object.entries(uploadProgress)
                            .filter(([key]) => key.startsWith("property-picture"))
                            .map(([key, value]) => (
                              <div key={key}>
                                <Progress value={value} />
                                <p className="text-xs text-center mt-1 text-muted-foreground">
                                  {value}% uploaded
                                </p>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  ) : !isPropertyPictures ? (
                    <div className="flex items-center justify-center">
                      <FileUpIcon className="h-10 w-10 flex items-center justify-center" />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <MdCancel
                        className="text-center text-2xl cursor-pointer mb-2"
                        onClick={() => {
                          const emptyArray = emptyStringArrayGenerator(5);
                          setPropertyPictureUrls(emptyArray);
                          setIsPropertyPictures(false);
                        }}
                      />
                      <div className="flex gap-2 w-full">
                        {propertyPictureUrls
                          .filter((url) => url != "")
                          .map((_, i) => (
                            <div className="flex flex-wrap gap-4 mx-2" key={i}>
                              <img
                                src={propertyPictureUrls[i]}
                                alt="Property Pictures"
                                className="w-28 h-28 object-contain rounded-lg border"
                              />
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {!propertyPicturesLoading && (
                    <div className="flex text-sm text-neutral-6000 justify-center">
                      <label
                        htmlFor="file-upload-2"
                        className="relative cursor-pointer rounded-md font-medium text-primary-6000 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                      >
                        <span className="text-center">Upload a file</span>
                        <input
                          id="file-upload-2"
                          name="file-upload-2"
                          type="file"
                          className="sr-only"
                          multiple
                          accept="image/*"
                          onChange={(e) => uploadPropertyPictures(e)}
                        />
                      </label>
                    </div>
                  )}
                  <p className="text-xs">PNG, JPG, GIF up to 10MB</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        {myArray.map((item, index) => (
          <div key={index}>
            <div>
              <h2 className="text-2xl font-semibold">
                <span>Portion {index + 1}</span>
              </h2>
              <span className="block mt-2 ">
                A few beautiful photos will help customers have more sympathy
                for your property.
              </span>
            </div>

            {/* FORM */}

            <div className="space-y-8">
              <div>
                <span className="text-lg font-semibold">Cover image</span>

                <div className="mt-5">
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-neutral-300 dark:border-neutral-6000 border-dashed rounded-md">
                    <div className="space-y-1 text-center flex flex-col items-center">
                      {/* Check if file is uploading (portionCoverFileLoading is true for the index) */}
                      {portionCoverFileLoading[index] ? (
                        <div className="flex flex-col items-center justify-center gap-4 w-full">
                          <Loader />
                          {uploadProgress[`portion-cover-${index}`] !== undefined && (
                            <div className="w-full max-w-xs">
                              <Progress value={uploadProgress[`portion-cover-${index}`]} />
                              <p className="text-xs text-center mt-2 text-muted-foreground">
                                {uploadProgress[`portion-cover-${index}`]}% uploaded
                              </p>
                            </div>
                          )}
                        </div>
                      ) : !isImages[index] ? (
                        <div className="flex items-center justify-center">
                          <FileUpIcon className="h-10 w-10 flex items-center justify-center" />
                        </div>
                      ) : (
                        <div>
                          <MdCancel
                            className="text-right ml-auto text-xl cursor-pointer"
                            onClick={() => {
                              setIsImages((prev) => [
                                ...prev.slice(0, index),
                                false,
                                ...prev.slice(index + 1, prev.length),
                              ]);
                              setPortionCoverFileUrls((prev) => {
                                const newCoverFileUrls = [...prev];
                                newCoverFileUrls[index] = "";
                                return newCoverFileUrls;
                              });
                            }}
                          />
                          <div className="flex flex-wrap gap-2">
                            <img
                              src={portionCoverFileUrls[index]}
                              alt="Portion Cover Image"
                              className="w-48 h-48 object-contain rounded-lg"
                            />
                          </div>
                        </div>
                      )}

                      {/* File upload input */}
                      {!portionCoverFileLoading[index] && (
                        <div className="flex text-sm text-neutral-6000 dark:text-neutral-300">
                          <label
                            htmlFor={`file-upload-${index}`}
                            className="relative cursor-pointer rounded-md font-medium text-primary-6000 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                          >
                            <span className="text-center">Upload a file</span>
                            <input
                              id={`file-upload-${index}`}
                              name={`file-upload-${index}`}
                              type="file"
                              className="sr-only"
                              accept="image/*"
                              onChange={(e) => uploadFile(e, index)}
                            />
                          </label>
                        </div>
                      )}
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        PNG, JPG, GIF up to 10MB
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              {/* ---------------- */}

              <div>
                <span className="text-lg font-semibold">
                  Pictures of the Portions
                </span>
                <div className="mt-5">
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      {portionPicturesLoading[index] ? (
                        // Loader while images are uploading
                        <div className="flex flex-col items-center justify-center gap-4 w-full">
                          <Loader />
                          {Object.keys(uploadProgress).some(key => key.startsWith(`portion-picture-${index}`)) && (
                            <div className="w-full max-w-xs space-y-2">
                              {Object.entries(uploadProgress)
                                .filter(([key]) => key.startsWith(`portion-picture-${index}`))
                                .map(([key, value]) => (
                                  <div key={key}>
                                    <Progress value={value} />
                                    <p className="text-xs text-center mt-1 text-muted-foreground">
                                      {value}% uploaded
                                    </p>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      ) : !isPortionPictures[index] ? (
                        // Show file upload icon when no picture is uploaded
                        <div className="flex items-center justify-center">
                          <FileUpIcon className="h-10 w-10 flex items-center justify-center" />
                        </div>
                      ) : (
                        // Show uploaded pictures with cancel button
                        <div className="flex flex-col items-center">
                          <MdCancel
                            className="text-center text-2xl cursor-pointer mb-2"
                            onClick={() => {
                              setPortionPictureUrls((prev) => {
                                const newPortionPictureUrls = [...prev];
                                newPortionPictureUrls[index] =
                                  emptyStringArrayGenerator(5);
                                return newPortionPictureUrls;
                              });
                              setIsPortionPictures((prev) => {
                                const newPortionArray = [...prev];
                                newPortionArray[index] = false;
                                return newPortionArray;
                              });
                            }}
                          />
                          <div className="flex gap-2 w-full">
                            {/* {Array.from({ length: 5 }, () => "").map((_, i) => ( */}
                            {portionPictureUrls[index]
                              ?.filter((url) => url != "")
                              ?.map((innerIndex, i) => (
                                <div
                                  className="flex flex-wrap gap-4 mx-2"
                                  key={i}
                                >
                                  <img
                                    src={portionPictureUrls[index][i]}
                                    alt="Portion Pictures"
                                    className="w-28 h-28 object-contain rounded-lg border"
                                  />
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                      <div className="flex text-sm text-neutral-6000 justify-center">
                        <label
                          htmlFor={`file-upload-portionPicture-${index}`}
                          className="relative cursor-pointer rounded-md font-medium text-primary-6000 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                        >
                          <span className="text-center">Upload a file</span>
                          <input
                            id={`file-upload-portionPicture-${index}`}
                            name="file-upload-2"
                            type="file"
                            className="sr-only"
                            multiple
                            accept="image/*"
                            onChange={(e) => uploadPortionPictures(e, index)}
                          />
                        </label>
                      </div>
                      <p className="text-xs">PNG, JPG, GIF up to 10MB</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-x-4 ml-2 mb-4">
        <Link
          href={{
            pathname: `/dashboard/add-listing/6`,
            query: { userId: userId },
          }}
        >
          <Button>Go back</Button>
        </Link>
        <Link
          href={{
            pathname: `/dashboard/add-listing/8`,
            query: { userId: userId },
          }}
        >
          <Button>Continue</Button>
        </Link>
      </div>
    </>
  );
};

export default PageAddListing7;
