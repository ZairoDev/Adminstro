"use client";
import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MdAdsClick, MdCancel } from "react-icons/md";
import axios from "axios";
import { HiArrowNarrowLeft } from "react-icons/hi";
import { MdArrowDropDown, MdArrowRight } from "react-icons/md";
import { Property, propertyTypes, rentalTypes } from "@/util/type";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { IoRemoveSharp } from "react-icons/io5";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import Loader from "@/components/loader";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { FileUpIcon, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ScreenLoader from "@/components/ScreenLoader";
import { FaCloudUploadAlt } from "react-icons/fa";

interface PageProps {
  params: {
    id: string;
  };
}

const getCoordinatesFromPincode = async (pincode: any) => {
  const url = `https://nominatim.openstreetmap.org/search?postalcode=${pincode}&format=json&limit=1`;
  try {
    const response = await axios.get(url);
    const data = response.data;

    if (data.length > 0) {
      const { lat, lon } = data[0];
      return { lat: parseFloat(lat), lon: parseFloat(lon) };
    } else {
      throw new Error("No results found");
    }
  } catch (error) {
    console.error("Error fetching coordinates:", error);
    return null;
  }
};

const EditPropertyPage = ({ params }: PageProps) => {
  let portions = 0;
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [numberOfPortions, setNumberOfPortions] = useState<number>(1);

  const [deletingImage, setDeletingImage] = useState<string | undefined>("");
  const { toast } = useToast();

  const [propertyCoverFileUrl, setPropertyCoverFileUrl] = useState<string>("");

  const [propertyPictureUrls, setPropertyPictureUrls] = useState<string[]>(
    () => {
      const savedUrls = localStorage.getItem("propertyPictureUrls");
      return savedUrls ? JSON.parse(savedUrls) : Array(5).fill("");
    }
  );

  const [portionCoverFileUrls, setPortionCoverFileUrls] = useState<string[]>(
    // () => {
    //   const savedUrls = localStorage.getItem("portionCoverFileUrls");
    //   if (savedUrls) {
    //     const savedImages = JSON.parse(savedUrls);
    //     if (savedImages?.length != portions) {
    //       return emptyStringArrayGenerator(portions);
    //     }
    //   }

    //   return savedUrls
    //     ? JSON.parse(savedUrls)
    //     : emptyStringArrayGenerator(portions);
    // }
    []
  );

  const [portionPictureUrls, setPortionPictureUrls] = useState<string[][]>(
    () => {
      const savedUrls = localStorage.getItem("portionPictureUrls");
      const arrayOf5 = Array(5).fill("");

      return savedUrls ? JSON.parse(savedUrls) : Array(portions).fill(arrayOf5);
    }
  );

  // ! FormData
  const [formData, setFormData] = useState<Partial<Property>>({
    VSID: property?.VSID,
    rentalType: property?.rentalType,
    _id: property?._id,
    propertyType: property?.propertyType,
    placeName: property?.placeName,
    rentalForm: property?.rentalForm,
    numberOfPortions: property?.numberOfPortions,

    street: property?.street,
    postalCode: property?.postalCode,
    city: property?.city,
    state: property?.state,
    country: property?.country,

    portionName: property?.portionName,
    portionSize: property?.portionSize,
    guests: property?.guests,
    bedrooms: property?.bedrooms,
    beds: property?.beds,
    bathroom: property?.bathroom,
    kitchen: property?.kitchen,
    childrenAge: property?.childrenAge,

    basePrice: property?.basePrice,
    weekendPrice: property?.weekendPrice,
    monthlyDiscount: property?.monthlyDiscount,

    email: property?.email,
    generalAmenities: property?.generalAmenities,
    otherAmenities: property?.otherAmenities,
    safeAmenities: property?.safeAmenities,

    smoking: property?.smoking,
    pet: property?.pet,
    party: property?.party,
    cooking: property?.cooking,
    additionalRules: property?.additionalRules,

    center: property?.center,

    reviews: property?.reviews,

    propertyCoverFileUrl: property?.propertyCoverFileUrl,
    propertyPictureUrls: property?.propertyPictureUrls,
    portionCoverFileUrls: property?.portionCoverFileUrls,
    portionPictureUrls: property?.portionPictureUrls,

    time: property?.time,
    weeklyDiscount: property?.weeklyDiscount,
    night: property?.night,
    datesPerPortion: property?.datesPerPortion,

    isLive: property?.isLive,
  });

  useEffect(() => {
    if (params.id) {
      const fetchProperty = async () => {
        setLoading(true);
        try {
          const response = await axios.post("/api/singleproperty/getproperty", {
            propertyId: params.id,
          });
          console.log(response.data);
          setProperty(response.data);
          setNumberOfPortions(response.data.basePrice.length);
          setPropertyPictureUrls(response.data.propertyPictureUrls);
          setPropertyCoverFileUrl(response.data.propertyCoverFileUrl);
          setPortionCoverFileUrls(response.data.portionCoverFileUrls);
          setPortionPictureUrls(response.data.portionPictureUrls);
          setLoading(false);
        } catch (error: any) {
          console.error("Error fetching property:", error);
          setLoading(false);
        } finally {
          setLoading(false);
        }
      };

      fetchProperty();
    }
  }, [params.id]);

  useEffect(() => {
    if (property) {
      setFormData({
        VSID: property.VSID,
        rentalType: property.rentalType,

        _id: property._id,
        propertyType: property.propertyType,
        placeName: property.placeName,
        rentalForm: property.rentalForm,
        numberOfPortions: property.numberOfPortions,

        email: property?.email,
        street: property.street,
        postalCode: property.postalCode,
        city: property.city,
        state: property.state,
        country: property.country,

        portionName: property.portionName,
        portionSize: property.portionSize,
        guests: property.guests,
        bedrooms: property.bedrooms,
        beds: property.beds,
        bathroom: property.bathroom,
        kitchen: property.kitchen,
        childrenAge: property.childrenAge,

        center: property.center,
        basePrice: property.basePrice,
        weekendPrice: property.weekendPrice,
        monthlyDiscount: property.monthlyDiscount,

        generalAmenities: property.generalAmenities,
        otherAmenities: property.otherAmenities,
        safeAmenities: property.safeAmenities,

        smoking: property.smoking,
        pet: property.pet,
        party: property.party,
        cooking: property.cooking,
        additionalRules: property.additionalRules,

        propertyCoverFileUrl: property?.propertyCoverFileUrl,
        propertyPictureUrls: property?.propertyPictureUrls,
        portionCoverFileUrls: property?.portionCoverFileUrls,
        portionPictureUrls: property?.portionPictureUrls,

        reviews: property.reviews,

        weeklyDiscount: property.weeklyDiscount,
        night: property.night,
        time: property.time,
        datesPerPortion: property.datesPerPortion,

        isLive: property.isLive,
      });
    }
  }, [property]);

  // TODO Handling property picture starts from here


  const data = localStorage.getItem("page1") || "";
  if (data) {
    const value = JSON.parse(data)["numberOfPortions"];
    if (value) {
      portions = parseInt(value, 10);
    }
  }
  let checkPortion = portions > 1 ? portions : 0;

  const booleanArray = Array.from({ length: portions }, () => false);

  const [isPortionPictures, setIsPortionPictures] = useState<boolean[]>(() => {
    const savedFlags = localStorage.getItem("isPortionPictures");
    return savedFlags ? JSON.parse(savedFlags) : Array(portions).fill(false);
  });

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
      "propertyPictureUrls",
      JSON.stringify(propertyPictureUrls)
    );
  }, [propertyPictureUrls]);

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

  let placeName: string | undefined = formData?.placeName;
  placeName = placeName?.toLowerCase();
  const placeNameSplitArray: string[] | undefined = placeName?.split(" ");
  placeName = placeNameSplitArray?.join("_");

  const uploadFile = async (event: any, index: number) => {
    setPortionCoverFileLoading((prev) => {
      const newArray = [...prev];
      newArray[index] = true;
      return newArray;
    });

    const file = event?.target.files[0];

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
        title: "Type Mismatch",
        description:
          "We only accept jpeg, png, webp for now. Try to upload these formats.",
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

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.put(
        `${storageUrl}/${storageZoneName}/${placeName}/${file.name}`,
        file,
        {
          headers: {
            AccessKey: accessKey,
            "Content-Type": file.type,
          },
        }
      );

      console.log("response: ", response);
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
    } catch (error) {
      console.error("Error uploading image to Bunny CDN:", error);
      toast({
        variant: "destructive",
        title: "Upload Error",
        description:
          "Some error occurred while uploading the image. Please try again later.",
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
        title: "Type Mismatch",
        description:
          "We only accept jpeg , png , webp for now try to upload this format",
      });
      setPropertyCoverFileLoading(false);
      return;
    }

    const storageZoneName = process.env.NEXT_PUBLIC_BUNNY_STORAGE_ZONE;
    const accessKey = process.env.NEXT_PUBLIC_BUNNY_ACCESS_KEY;
    const storageUrl = process.env.NEXT_PUBLIC_BUNNY_STORAGE_URL;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setPropertyCoverFileLoading(true);
      const response = await axios.put(
        `${storageUrl}/${storageZoneName}/${placeName}/${file.name}`,
        file,
        {
          headers: {
            AccessKey: accessKey,
            "Content-Type": file.type,
          },
        }
      );

      console.log("response: ", response);
      const imageUrl = `https://vacationsaga.b-cdn.net/${placeName}/${file.name}`;
      setPropertyCoverFileUrl(imageUrl);
      setPropertyCoverFileLoading(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Type Mismatch",
        description:
          "Some error occurred while uploading the image. Please try again later.",
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
      // Reset loading state if no files are selected
      setPortionPicturesLoading((prevState) => {
        const newLoading = [...prevState];
        newLoading[index] = false;
        return newLoading;
      });
      return;
    }

    // Validate file types
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
          title: "Type Mismatch",
          description:
            "We only accept jpeg, png, webp for now. Try to upload these formats.",
        });
        // Reset loading state if there's a type mismatch
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

    const formData = new FormData();

    const updatedUrls = [...portionPictureUrls];
    const newImages = [...isPortionPictures];

    for (let i = 0; i < files.length; i++) {
      formData.append("file", files[i]);

      try {
        const response = await axios.put(
          `${storageUrl}/${storageZoneName}/${placeName}/${files[i].name}`,
          files[i],
          {
            headers: {
              AccessKey: accessKey,
              "Content-Type": files[i].type,
            },
          }
        );

        console.log("response: ", response);

        const imageUrl = `https://vacationsaga.b-cdn.net/${placeName}/${files[i].name}`;

        // Update portionPictureUrls with new image URLs
        updatedUrls[index] = [...updatedUrls[index]];
        updatedUrls[index][i] = imageUrl;
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

    newImages[index] = true;
    setPortionPictureUrls(updatedUrls);
    setIsPortionPictures(newImages);

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
          title: "Type Mismatch",
          description:
            "We only accept jpeg , png , webp for now try to upload this format",
        });
        setPropertyPicturesLoading(false);
        return;
      }
    }
    const storageZoneName = process.env.NEXT_PUBLIC_BUNNY_STORAGE_ZONE;
    const accessKey = process.env.NEXT_PUBLIC_BUNNY_ACCESS_KEY;
    const storageUrl = process.env.NEXT_PUBLIC_BUNNY_STORAGE_URL;

    const formData = new FormData();
    const savedUrls = [...propertyPictureUrls];

    for (let i = 0; i < files.length; i++) {
      formData.append("file", files[i]);
      try {
        setPropertyPicturesLoading(true);
        const response = await axios.put(
          `${storageUrl}/${storageZoneName}/${placeName}/${files[i].name}`,
          files[i],
          {
            headers: {
              AccessKey: accessKey,
              "Content-Type": files[i].type,
            },
          }
        );

        console.log("response: ", response);
        const imageUrl = `https://vacationsaga.b-cdn.net/${placeName}/${files[i].name}`;
        // savedUrls[i] = imageUrl;
        savedUrls.unshift(imageUrl);
        setPropertyPicturesLoading(false);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Type Mismatch",
          description:
            "Some error occurred while uploading the image. Please try again later.",
        });
      }
      setPropertyPicturesLoading(false);
    }

    setPropertyPictureUrls(savedUrls);
    setIsPropertyPictures(true);
    setPropertyPicturesLoading(false);
  };

  // TODO Handling property picture ends from here

  const handleDelete = async (
    deletedIndex: number,
    typeOfImage: string,
    imageUrl: string | undefined,
    portionIndex?: number
  ) => {
    console.log("Image URL:", imageUrl);
    console.log("Image Type:", typeOfImage);
    console.log("Deleted Index:", deletedIndex);
    console.log("Portion Index:", portionIndex);

    if (!imageUrl) {
      alert("No image URL provided");
      return;
    }
    setDeletingImage(imageUrl);

    try {
      const backendDeleteResponse = await axios.delete(
        "/api/editproperty/deleteimage",
        {
          data: {
            id: params.id[0],
            url: imageUrl,
            index: deletedIndex,
            type: typeOfImage,
            portionIndex: portionIndex,
          },
        }
      );

      try {
        const storageZoneName = process.env.NEXT_PUBLIC_BUNNY_STORAGE_ZONE;
        const accessKey = process.env.NEXT_PUBLIC_BUNNY_ACCESS_KEY;
        const filePath = imageUrl.split("https://vacationsaga.b-cdn.net/")[1];

        const deleteOptions = {
          method: "DELETE",
          url: `https://storage.bunnycdn.com/${storageZoneName}/${filePath}`,
          headers: { AccessKey: accessKey },
        };

        const bunnyDeleteResponse = await axios(deleteOptions);
        console.log("Bunny CDN file deleted:", bunnyDeleteResponse.data);
      } catch (bunnyError) {
        console.error("Error deleting file from Bunny CDN:", bunnyError);
        toast({
          variant: "destructive",
          title: "Bunny CDN Deletion failed",
          description:
            "Some error occurred while deleting the image from Bunny CDN. Please try again later.",
        });
        return;
      }

      let updatedFormData = { ...formData };

      switch (typeOfImage) {
        case "propertyCoverFileUrl":
          updatedFormData.propertyCoverFileUrl = "";
          portionCoverFileUrls.splice(deletedIndex, 1, "");
          break;
        case "propertyPictureUrls":
          updatedFormData.propertyPictureUrls =
            formData?.propertyPictureUrls?.filter(
              (url, index) => index !== deletedIndex
            );
          propertyPictureUrls.splice(deletedIndex, 1);
          break;
        case "portionCoverFileUrls":
          updatedFormData.portionCoverFileUrls =
            formData?.portionCoverFileUrls?.map((url, index) =>
              index === deletedIndex ? "" : url
            );
          break;
        case "portionPictureUrls":
          if (portionIndex !== undefined) {
            updatedFormData.portionPictureUrls =
              formData?.portionPictureUrls?.map((portion, index) =>
                index === portionIndex
                  ? portion.filter((url, idx) => idx !== deletedIndex)
                  : portion
              );
          }
          break;
        default:
          console.error("Invalid image type");
          return;
      }
      setFormData(updatedFormData);
      toast({
        title: "Deletion Successful",
        description:
          "Image was deleted successfully. This action cannot be undone.",
      });
    } catch (error: any) {
      console.error("Error deleting file:", error);
      console.log(error?.response?.data);
      toast({
        variant: "destructive",
        title: "Deletion failed",
        description:
          "Some error occurred while deleting the image. Please try again later.",
      });
    } finally {
      setDeletingImage("");
    }
  };

  const [loadingProperty, setLoadingproperty] = useState(false);
  const handleSubmit = async () => {
    const newFormData = { ...formData };
    newFormData["propertyCoverFileUrl"] = propertyCoverFileUrl;
    newFormData["propertyPictureUrls"] = propertyPictureUrls;
    newFormData["portionCoverFileUrls"] = portionCoverFileUrls;
    newFormData["portionPictureUrls"] = portionPictureUrls;
    setLoadingproperty(true);
    try {
      const response = await axios.post("/api/editproperty/editpropertydata", {
        propertyId: params.id,
        updatedData: newFormData,
      });

      if (response.status === 200) {
        toast({
          title: "Success",
          description: "Property updated successfully!",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to update property. Please try again.",
        });
      }
      setLoadingproperty(false);
    } catch (error) {
      console.error("Error updating property:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while updating the property.",
      });
      setLoadingproperty(false);
    }
  };

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    const trimmedValue = value.trim();
    setFormData((prevState) => ({
      ...prevState,
      [name]: type === "checkbox" ? checked : trimmedValue,
    }));
  };

  // TODO for handling the addition rule
  // Add new rule to additionalRules array
  const handleAddRule = () => {
    setFormData((prevState) => ({
      ...prevState,
      additionalRules: [...(prevState.additionalRules || []), ""],
    }));
  };

  // Update a specific rule
  const handleRuleChange = (index: number, value: string) => {
    const updatedRules = [...(formData.additionalRules || [])];
    updatedRules[index] = value;
    setFormData((prevState) => ({
      ...prevState,
      additionalRules: updatedRules,
    }));
  };

  // Remove a rule from additionalRules array
  const handleRemoveRule = (index: number) => {
    const updatedRules = [...(formData.additionalRules || [])];
    updatedRules.splice(index, 1);
    setFormData((prevState) => ({
      ...prevState,
      additionalRules: updatedRules,
    }));
  };

  const handlePostalCode = async (e: any) => {
    const { name, value } = e.target;

    // If the postal code changes, fetch coordinates
    if (name === "postalCode") {
      setFormData((prevData) => ({
        ...prevData,
        [name]: value,
      }));

      if (value) {
        const coordinates = await getCoordinatesFromPincode(value);
        if (coordinates) {
          setFormData((prevData) => ({
            ...prevData,
            center: {
              lat: coordinates.lat,
              lng: coordinates.lon,
            },
          }));
        }
      }
    } else {
      // Handle other input changes
      setFormData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    }
  };

  const [isPortionOpen, setIsPortionOpen] = useState<boolean[]>(() =>
    Array.from({ length: numberOfPortions }, () => false)
  );

  return (
    <>
      <div className="max-w-6xl p-2 mx-auto ">
        {loading ? (
          <div className="flex items-center justify-center h-screen w-full">
            <Loader />
          </div>
        ) : (
          <form onSubmit={(e) => e.preventDefault()}>
            <Link href="/dashboard/property">
              <Button className="flex gap-x-1" variant="outline">
                <HiArrowNarrowLeft /> Back
              </Button>
            </Link>

            <h1 className="text-3xl mt-2  mb-4"> Edit Property</h1>
            <div className="flex sm:border rounded-lg sm:p-4 flex-col gap-x-2 gap-y-4 mt-4">
              <div>
                <div className="flex  rounded-lg sm:p-2  flex-col gap-x-2 gap-y-4 mt-4">
                  <div className="">
                    <h1>Cover Image</h1>
                    <div className="dark:bg-white/60 bg-black/40 rounded-lg flex items-center justify-center relative ">
                      <div className=" absolute bottom-0 right-0 ">
                        <label
                          htmlFor={`file-upload-propetyCoverFile`}
                          className="relative cursor-pointer rounded-md font-medium text-primary-6000 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                        >
                          <FaCloudUploadAlt className="w-20 h-20 z-10 text-2xl text-slate-800 cursor-pointer" />
                          <input
                            id={`file-upload-propetyCoverFile`}
                            name="file-upload-2"
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            // onChange={(e) => uploadPortionPictures(e, index)}
                            onChange={(e) => uploadPropertyCoverFile(e)}
                          />
                        </label>
                      </div>
                      <img
                        src={
                          propertyCoverFileUrl ||
                          formData?.propertyCoverFileUrl ||
                          "/replacer.jpg"
                        }
                        className="max-w-2xl w-full  rounded-lg px-2 py-2 max-h-[500px] object-contain"
                        alt="coverimage"
                      />
                      {formData?.propertyCoverFileUrl && (
                        <button
                          onClick={() =>
                            handleDelete(
                              0,
                              "propertyCoverFileUrl",
                              formData?.propertyCoverFileUrl ?? ""
                            )
                          }
                          className="absolute top-1 right-1 bg-red-500  w-5 h-5 rounded-full border-red-600  "
                          disabled={
                            deletingImage === formData.propertyCoverFileUrl
                          }
                        >
                          {deletingImage === formData.propertyCoverFileUrl ? (
                            <Loader />
                          ) : (
                            <X className="w-5 h-5" />
                          )}
                        </button>
                      )}
                    </div>

                    <div>
                      <h1 className="mt-1">Property Pictures</h1>
                    </div>
                    <div className="mt-4 space-x-2 overflow-x-auto m-2">
                      <div className="flex space-x-4">
                        <label
                          htmlFor={`file-upload-propertyPicturesUrl`}
                          className="relative cursor-pointer rounded-md font-medium text-primary-6000 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500 border border-neutral-800 p-1 "
                        >
                          <FaCloudUploadAlt className="w-40 h-40 z-10 text-2xl text-slate-800 cursor-pointer" />
                          <input
                            id={`file-upload-propertyPicturesUrl`}
                            name="file-upload-2"
                            type="file"
                            className="sr-only"
                            multiple
                            accept="image/*"
                            // onChange={(e) => uploadPortionPictures(e, index)}
                            onChange={(e) => uploadPropertyPictures(e)}
                          />
                        </label>
                        {propertyPictureUrls
                          ?.filter((url) => url) // filter out falsy values (e.g. empty strings or nulls)
                          ?.map((url, index) => (
                            <div
                              key={index}
                              className="relative flex-shrink-0 m-2"
                            >
                              <img
                                src={
                                  propertyPictureUrls[index] ||
                                  formData?.propertyPictureUrls?.[index]
                                } // Only render valid URLs
                                alt="not found"
                                className="w-40 h-40 object-cover rounded-md"
                              />
                              {/* Delete Button */}
                              <button
                                onClick={() =>
                                  handleDelete(
                                    index,
                                    "propertyPictureUrls",
                                    url
                                  )
                                }
                                className="absolute top-1 right-1 bg-red-500 w-5 h-5 rounded-full border-red-600"
                                disabled={deletingImage === url}
                              >
                                {deletingImage === url ? (
                                  <Loader />
                                ) : (
                                  <X className="w-5 h-5" />
                                )}
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="">
                <label>
                  VSID
                  <Input
                    type="text"
                    name="VSID"
                    value={formData?.VSID || ""}
                    onChange={handleChange}
                    disabled
                  />
                </label>
              </div>

              <div className="flex items-center sm:flex-row flex-col justify-between gap-x-2 w-full ">
                <div className="w-full">
                  <label>
                    <h1 className="">Owner email</h1>
                    <Input
                      type="text"
                      name="email"
                      value={formData?.email || "Not Found"}
                      disabled
                    />
                  </label>
                </div>
                <div className="w-full">
                  <h1 className="">Property Id</h1>
                  <Input
                    type="text"
                    name="_id"
                    value={formData?._id || "Not Found"}
                    onChange={handleChange}
                    disabled
                  />
                </div>
              </div>

              <div className="flex items-center sm:flex-row flex-col justify-between gap-x-2 w-full ">
                <div className="w-full">
                  <label>
                    <h1 className="">Rental Form</h1>
                    <Input
                      type="text"
                      name="rentalType"
                      value={formData?.rentalForm || "Not Found"}
                      onChange={handleChange}
                      disabled
                    />
                  </label>
                </div>
                <div className="w-full">
                  <h1 className="">Rental Type</h1>
                  <Input
                    type="text"
                    name=""
                    value={formData?.rentalType || "Not Found"}
                    onChange={handleChange}
                    disabled
                  />
                </div>
              </div>
              <p className="text-xs">
                Above data it read only no need to change
              </p>
              <div className="flex items-center sm:flex-row flex-col justify-between gap-x-2 w-full ">
                <div className="w-full">
                  <h1 className="">Property Type</h1>
                  <Select
                    name="propertyType"
                    value={formData.propertyType}
                    onValueChange={(value) =>
                      handleChange({ target: { name: "propertyType", value } })
                    }
                  >
                    <SelectTrigger className="text-black dark:text-white">
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                    <SelectContent>
                      {propertyTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full">
                  <label className=" ">
                    Place Name
                    <Input
                      type="text"
                      name="placeName"
                      value={formData?.placeName || ""}
                      onChange={handleChange}
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center sm:flex-row flex-col justify-between gap-x-2 w-full ">
                <div className="w-full">
                  <label>
                    <h1 className="">State</h1>
                    <Input
                      type="text"
                      name="state"
                      value={formData?.state || ""}
                      onChange={handleChange}
                    />
                  </label>
                </div>
                <div className="w-full">
                  <label>
                    Country
                    <Input
                      type="text"
                      name="country"
                      value={formData?.country || ""}
                      onChange={handleChange}
                    />
                  </label>
                </div>
              </div>
              <div className="flex items-center sm:flex-row flex-col justify-between gap-x-2 w-full ">
                <div className="w-full">
                  <label>
                    <h1 className="">Street</h1>
                    <Input
                      type="text"
                      name="street"
                      value={formData?.street || ""}
                      onChange={handleChange}
                    />
                  </label>
                </div>
                <div className="w-full">
                  <label>
                    <h1 className="">Pet Friendly</h1>
                    <Input
                      type="text"
                      name="pet"
                      value={formData?.pet || ""}
                      onChange={handleChange}
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center sm:flex-row flex-col justify-between gap-x-2 w-full ">
                <div className="w-full">
                  <label>
                    <h1 className="">Party Friendly</h1>
                    <Input
                      type="text"
                      name="party"
                      value={formData?.party || ""}
                      onChange={handleChange}
                    />
                  </label>
                </div>
                <div className="w-full">
                  <label>
                    <h1 className="">Cooking</h1>
                    <Input
                      type="text"
                      name="cooking"
                      value={formData?.cooking || ""}
                      onChange={handleChange}
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center sm:flex-row flex-col justify-between gap-x-2 w-full">
                <div className="w-full">
                  <label>
                    <h1>Check-in Time</h1>
                    <Input
                      type="number"
                      name="checkinTime"
                      value={(formData?.time && formData.time[0]) || ""}
                      onChange={(e) => {
                        const newTime = [...(formData?.time || [])];
                        newTime[0] = parseInt(e.target.value, 10);
                        const newObj = { ...formData, time: newTime };
                        setFormData(newObj);
                      }}
                    />
                  </label>
                </div>
                <div className="w-full">
                  <label>
                    <h1>Check-out Time</h1>
                    <Input
                      type="number"
                      name="checkoutTime"
                      value={(formData?.time && formData.time[1]) || ""}
                      onChange={(e) => {
                        const newTime = [...(formData?.time || [])];
                        newTime[1] = parseInt(e.target.value, 10);
                        const newObj = { ...formData, time: newTime };
                        setFormData(newObj);
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className=" flex items-center flex-col gap-x-2 md:flex-row ">
                <label className="text-xs w-full" htmlFor="monthlyDiscount">
                  Min Nights
                  <Input
                    type="number"
                    min={0}
                    name="night"
                    value={formData?.night?.[0] || ""}
                    onChange={(e) => {
                      const updatedNights = [...(formData.night || [])];
                      updatedNights[0] = parseInt(e.target.value);
                      setFormData({
                        ...formData,
                        night: updatedNights,
                      });
                    }}
                  />
                </label>

                <label className="text-xs w-full" htmlFor="monthlyDiscount">
                  Max Nights
                  <Input
                    type="number"
                    min={0}
                    name="monthlyDiscount"
                    value={formData?.night?.[1] || ""}
                    onChange={(e) => {
                      const updatedNights = [...(formData.night || [])];
                      updatedNights[1] = parseInt(e.target.value);
                      setFormData({
                        ...formData,
                        night: updatedNights,
                      });
                    }}
                  />
                </label>
                <div className="w-full">
                  <label>
                    <h1 className="text-xs">City</h1>
                    <Input
                      type="text"
                      name="city"
                      value={formData?.city || ""}
                      onChange={handleChange}
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center sm:flex-row flex-col justify-between gap-x-2 w-full ">
                <div className="w-full">
                  {formData?.center && (
                    <div className="flex items-center sm:flex-row flex-col justify-between gap-x-2 w-full">
                      <label className="w-full">
                        <h1 className="">Postal Code</h1>
                        <Input
                          type="text"
                          name="postalCode"
                          value={formData?.postalCode || ""}
                          onChange={handlePostalCode}
                        />
                      </label>

                      <div className="w-full">
                        <label>Latitude</label>
                        <Input
                          type="text"
                          name="lat"
                          value={formData?.center?.lat || ""}
                          disabled
                          className="cursor-not-allowed"
                        />
                      </div>

                      <div className="w-full ">
                        <label>Longitude</label>
                        <Input
                          type="text"
                          name="lng"
                          value={formData?.center?.lng || ""}
                          disabled
                          className="cursor-not-allowed"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full my-4 pb-4 border-b">
                <h1 className="text-xl mb-2 font-medium dark:text-white">
                  Additional Rules
                </h1>

                {/* Render each additional rule with a remove button */}
                {formData.additionalRules?.map((rule, index) => (
                  <div key={index} className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={rule}
                      onChange={(e) => handleRuleChange(index, e.target.value)}
                      className="w-full p-2 text-base border rounded-lg "
                      placeholder={`Rule ${index + 1}`}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => handleRemoveRule(index)}
                      className=""
                    >
                      <IoRemoveSharp />
                    </Button>
                  </div>
                ))}

                <Button type="button" onClick={handleAddRule} className="">
                  Add section <Plus className="h-5 w-5" />
                </Button>
              </div>

              <AlertDialog>
                <AlertDialogTrigger className="flex px-3 py-2 dark:bg-[#121212] bg-white/40  rounded-lg border items-start">
                  <div className="flex items-center justify-between gap-2">
                    Edit the amenties <MdAdsClick />
                  </div>
                </AlertDialogTrigger>

                <AlertDialogContent className="w-full ">
                  <AlertDialogHeader className="sm:block hidden  ">
                    <h1 className="text-2xl font-semibold mb-4">
                      Edit Amenities
                    </h1>
                  </AlertDialogHeader>
                  <AlertDialogTitle>
                    <p className="text-xs font-thin">
                      You can edit the amenties via a just tap or untap , no
                      need to save
                    </p>
                  </AlertDialogTitle>
                  <ScrollArea className="h-[580px]">
                    <div>
                      {/* General Amenities */}
                      <h1 className="text-2xl font-semibold mb-4 border-b">
                        General Amenities
                      </h1>
                      <div className="grid sm:grid-cols-3 grid-cols-2 text-xs gap-x-2 sm:gap-y-4 gap-y-2">
                        {formData?.generalAmenities &&
                          Object.entries(formData?.generalAmenities)?.map(
                            ([key, value]) => (
                              <div
                                key={key}
                                className="flex items-center gap-x-1"
                              >
                                <h1>{key}</h1>
                                <Checkbox checked={value} />
                              </div>
                            )
                          )}
                      </div>

                      {/* Other Amenities */}
                      <h1 className="text-2xl font-semibold mb-4 border-b mt-6">
                        Other Amenities
                      </h1>
                      <div className="grid sm:grid-cols-3 grid-cols-2 text-xs gap-x-2 sm:gap-y-4 gap-y-2">
                        {formData?.otherAmenities &&
                          Object.entries(formData?.otherAmenities)?.map(
                            ([key, value]) => (
                              <div
                                key={key}
                                className="flex items-center gap-x-1"
                              >
                                <h1>{key}</h1>
                                <Checkbox checked={value} />
                              </div>
                            )
                          )}
                      </div>

                      {/* Safe Amenities */}
                      <h1 className="text-2xl font-semibold mb-4 border-b mt-6">
                        Safe Amenities
                      </h1>
                      <div className="grid sm:grid-cols-3 text-xs grid-cols-2 gap-x-4 sm:gap-y-2 ">
                        {formData?.safeAmenities &&
                          Object.entries(formData?.safeAmenities)?.map(
                            ([key, value]) => (
                              <div
                                key={key}
                                className="flex items-center gap-x-1"
                              >
                                <h1>{key}</h1>
                                <Checkbox checked={value} />
                              </div>
                            )
                          )}
                      </div>
                    </div>
                  </ScrollArea>

                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction>Continue</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <div className="border-t pt-4">
                <label>
                  <h1 className="">Smoking</h1>
                  <Input
                    type="text"
                    name="smoking"
                    value={formData?.smoking || ""}
                    onChange={handleChange}
                  />
                </label>
              </div>

              <div>
                <label className="flex border px-4 py-2 rounded-lg items-center space-x-4">
                  <div className="flex items-center justify-between  w-full">
                    <h1 className="">Tap to live/Hide</h1>
                    <div className="relative hover:cursor-pointer block">
                      <input
                        type="checkbox"
                        name="isLive"
                        checked={formData.isLive || false}
                        onChange={handleChange}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-6 bg-gray-300 rounded-full peer-checked:bg-green-500    transition duration-300 ease-in-out"></div>
                      <div className="w-4 h-4 bg-white rounded-full absolute top-1 left-1 peer-checked:translate-x-full transition-transform duration-300 ease-in-out"></div>
                    </div>
                  </div>
                </label>
              </div>
              {Array.from({
                length: numberOfPortions,
              }).map((item, index) => {
                return (
                  <div className=" flex  flex-col space-y-4 my-4" key={index}>
                    <h1
                      className="  flex items-center transition-transform duration-300 ease-in-out cursor-pointer  border px-4 py-2 rounded-lg "
                      onClick={() =>
                        setIsPortionOpen((prev) => {
                          const newIsPortionOpen = [...prev];
                          newIsPortionOpen[index] = !newIsPortionOpen[index];
                          return newIsPortionOpen;
                        })
                      }
                    >
                      Portion no {index + 1}{" "}
                      {isPortionOpen[index] ? (
                        <MdArrowDropDown className="text-2xl" />
                      ) : (
                        <MdArrowRight className="text-2xl" />
                      )}
                    </h1>
                    {isPortionOpen[index] && (
                      <>
                        <div className=" flex flex-col space-y-4">
                          <h1>Portion Cover Image</h1>
                          <div className="dark:bg-white/40 bg-black/40 rounded-lg flex items-center justify-center relative">
                            <div className=" absolute bottom-0 right-0 ">
                              <label
                                htmlFor={`file-upload-portionCoverFiles-${index}`}
                                className="relative cursor-pointer rounded-md font-medium text-primary-6000 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                              >
                                <FaCloudUploadAlt className="w-20 h-20 z-10 text-2xl text-slate-800 cursor-pointer" />
                                <input
                                  id={`file-upload-portionCoverFiles-${index}`}
                                  name={`file-upload-portionCoverFiles-${index}`}
                                  type="file"
                                  className="sr-only"
                                  accept="image/*"
                                  // onChange={(e) => uploadPortionPictures(e, index)}
                                  onChange={(e) => uploadFile(e, index)}
                                />
                              </label>
                            </div>
                            <img
                              src={
                                portionCoverFileUrls[index] ||
                                formData?.portionCoverFileUrls?.[index] ||
                                "/replacer.jpg"
                              }
                              alt="portionCover"
                              className="max-w-2xl w-full rounded-lg px-2 py-2 h-full object-contain"
                            />
                            {formData?.portionCoverFileUrls?.[index] && (
                              <button
                                onClick={() =>
                                  handleDelete(
                                    index,
                                    "portionCoverFileUrls",
                                    formData?.portionCoverFileUrls?.[index]
                                  )
                                }
                                className="absolute top-1 right-1 bg-red-500 w-5 h-5 rounded-full border-red-600"
                                disabled={
                                  deletingImage ===
                                  formData?.portionCoverFileUrls[index]
                                }
                              >
                                {deletingImage ===
                                formData?.portionCoverFileUrls[index] ? (
                                  <Loader />
                                ) : (
                                  <X className="w-5 h-5" />
                                )}
                              </button>
                            )}
                          </div>
                          {/* Portion Pictures Section */}
                          <h1 className="mt-1">Portion Picture</h1>

                          <div className="mt-4 space-x-2 overflow-x-auto">
                            <div className="flex space-x-4">
                              {formData?.portionPictureUrls?.[index]
                                ?.filter((url) => url)
                                .map((url, imgIndex) => (
                                  <div
                                    key={imgIndex}
                                    className="relative flex-shrink-0"
                                  >
                                    <img
                                      src={url}
                                      alt="not found"
                                      className="w-40 h-40 object-cover rounded-md"
                                    />
                                    <button
                                      onClick={() =>
                                        handleDelete(
                                          imgIndex,
                                          "portionPictureUrls",
                                          url,
                                          index
                                        )
                                      }
                                      className="absolute top-1 right-1 bg-red-500 w-5 h-5 rounded-full border-red-600"
                                      disabled={deletingImage === url}
                                    >
                                      {deletingImage === url ? (
                                        <Loader />
                                      ) : (
                                        <X className="w-5 h-5" />
                                      )}
                                    </button>
                                  </div>
                                ))}
                            </div>
                          </div>

                          <div>
                            <label className="text-xs" htmlFor="portionName">
                              Portion&apos;s Name
                              <Input
                                type="text"
                                name="cooking"
                                value={formData?.portionName?.at(index) || ""}
                                onChange={(e) => {
                                  const newFormData = { ...formData };
                                  newFormData?.portionName?.splice(
                                    index,
                                    1,
                                    e.target.value
                                  );
                                  setFormData(newFormData);
                                }}
                              />
                            </label>
                          </div>
                          <div className=" flex  md:flex-row flex-col  space-x-4">
                            <div>
                              <label className="text-xs" htmlFor="portionSize">
                                Portion&apos;s Size
                                <Input
                                  type="number"
                                  min={0}
                                  name="portionSize"
                                  value={formData?.portionSize?.at(index) || ""}
                                  onChange={(e) => {
                                    const newFormData = { ...formData };
                                    newFormData?.portionSize?.splice(
                                      index,
                                      1,
                                      parseInt(e.target.value)
                                    );
                                    setFormData(newFormData);
                                  }}
                                />
                              </label>
                            </div>

                            <div>
                              <label className="text-xs" htmlFor="guests">
                                Number Of Guests
                                <Input
                                  type="number"
                                  name="guests"
                                  min={0}
                                  value={formData?.guests?.at(index) || ""}
                                  onChange={(e) => {
                                    const newFormData = { ...formData };
                                    newFormData?.guests?.splice(
                                      index,
                                      1,
                                      parseInt(e.target.value)
                                    );
                                    setFormData(newFormData);
                                  }}
                                />
                              </label>
                            </div>

                            <div>
                              <label className="text-xs" htmlFor="bedrooms">
                                Number Of Bedrooms
                                <Input
                                  type="number"
                                  name="bedrooms"
                                  min={0}
                                  value={formData?.bedrooms?.at(index) || ""}
                                  onChange={(e) => {
                                    const newFormData = { ...formData };
                                    newFormData?.bedrooms?.splice(
                                      index,
                                      1,
                                      parseInt(e.target.value)
                                    );
                                    setFormData(newFormData);
                                  }}
                                />
                              </label>
                            </div>

                            <div>
                              <label className="text-xs" htmlFor="beds">
                                Number Of Beds
                                <Input
                                  type="number"
                                  name="beds"
                                  min={0}
                                  value={formData?.beds?.at(index) || ""}
                                  onChange={(e) => {
                                    const newFormData = { ...formData };
                                    newFormData?.beds?.splice(
                                      index,
                                      1,
                                      parseInt(e.target.value)
                                    );
                                    setFormData(newFormData);
                                  }}
                                />
                              </label>
                            </div>

                            <div>
                              <label className="text-xs" htmlFor="bathroom">
                                Number Of Bathrooms
                                <Input
                                  type="number"
                                  name="bathroom"
                                  min={0}
                                  value={formData?.bathroom?.at(index) || ""}
                                  onChange={(e) => {
                                    const newFormData = { ...formData };
                                    newFormData?.bathroom?.splice(
                                      index,
                                      1,
                                      parseInt(e.target.value)
                                    );
                                    setFormData(newFormData);
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                          {/* // TODO here i have to make thing fix  */}
                          <div className=" flex  md:flex-row flex-col  space-x-4">
                            <label
                              className="text-xs mt-2 line-clamp-1"
                              htmlFor="monthlyDiscount"
                            >
                              Weekly Discount Portion {index + 1}
                              <Input
                                type="number"
                                min={0}
                                name="weeklyDiscount"
                                value={
                                  formData?.weeklyDiscount?.at(index) || ""
                                }
                                onChange={(e) => {
                                  const newFormData = { ...formData };
                                  newFormData?.weeklyDiscount?.splice(
                                    index,
                                    1,
                                    parseInt(e.target.value)
                                  );
                                  setFormData(newFormData);
                                }}
                              />
                            </label>

                            <div>
                              <label className="text-xs" htmlFor="kitchen">
                                Number Of Kitchen
                                <Input
                                  type="number"
                                  name="kitchen"
                                  min={0}
                                  value={formData?.kitchen?.at(index) || ""}
                                  onChange={(e) => {
                                    const newFormData = { ...formData };
                                    newFormData?.kitchen?.splice(
                                      index,
                                      1,
                                      parseInt(e.target.value)
                                    );
                                    setFormData(newFormData);
                                  }}
                                />
                              </label>
                            </div>

                            <div>
                              <label className="text-xs" htmlFor="childrenAge">
                                Children&apos;s Age
                                <Input
                                  type="number"
                                  name="childrenAge"
                                  min={0}
                                  value={formData?.childrenAge?.at(index) || ""}
                                  onChange={(e) => {
                                    const newFormData = { ...formData };
                                    newFormData?.childrenAge?.splice(
                                      index,
                                      1,
                                      parseInt(e.target.value)
                                    );
                                    setFormData(newFormData);
                                  }}
                                />
                              </label>
                            </div>

                            <div>
                              <label className="text-xs" htmlFor="basePrice">
                                Base Price Of Portion {index + 1}
                                <Input
                                  type="number"
                                  name="basePrice"
                                  min={0}
                                  value={formData?.basePrice?.at(index) || ""}
                                  onChange={(e) => {
                                    const newFormData = { ...formData };
                                    newFormData?.basePrice?.splice(
                                      index,
                                      1,
                                      parseInt(e.target.value)
                                    );
                                    setFormData(newFormData);
                                  }}
                                />
                              </label>
                            </div>

                            <div>
                              <label className="text-xs" htmlFor="weekendPrice">
                                Weekend Price Of Portion {index + 1}
                                <Input
                                  type="number"
                                  min={0}
                                  name="weekendPrice"
                                  value={
                                    formData?.weekendPrice?.at(index) || ""
                                  }
                                  onChange={(e) => {
                                    const newFormData = { ...formData };
                                    newFormData?.weekendPrice?.splice(
                                      index,
                                      1,
                                      parseInt(e.target.value)
                                    );
                                    setFormData(newFormData);
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                        <div className=" flex  md:flex-row flex-col  space-x-4">
                          <label
                            className="text-xs line-clamp-1"
                            htmlFor="monthlyDiscount"
                          >
                            Monthly Discount For Portion {index + 1}
                            <Input
                              type="number"
                              min={0}
                              name="monthlyDiscount"
                              value={formData?.monthlyDiscount?.at(index) || ""}
                              onChange={(e) => {
                                const newFormData = { ...formData };
                                newFormData?.monthlyDiscount?.splice(
                                  index,
                                  1,
                                  parseInt(e.target.value)
                                );
                                setFormData(newFormData);
                              }}
                            />
                          </label>
                        </div>
                        <div></div>
                        <label className="" htmlFor="monthlyDiscount">
                          Description of Portion {index + 1}
                          <Textarea
                            className="h-32"
                            name="review"
                            value={formData?.reviews?.[index] || ""}
                            onChange={(e) => {
                              const updatedReviews = [
                                ...(formData.reviews || []),
                              ]; // Copy the reviews array
                              updatedReviews[index] = e.target.value; // Update the specific index
                              setFormData({
                                ...formData,
                                reviews: updatedReviews,
                              }); // Update the state immutably
                            }}
                          />
                        </label>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {loadingProperty ? (
              <ScreenLoader />
            ) : (
              <div className=" flex mt-4">
                <Button onClick={handleSubmit} type="submit">
                  Save Changes
                </Button>
              </div>
            )}
          </form>
        )}
      </div>
    </>
  );
};

export default EditPropertyPage;
