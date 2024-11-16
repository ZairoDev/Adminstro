"use client";

import { toast } from "@/hooks/use-toast";
import axios from "axios";

interface UploadImagesToBunnyProps {
  event: any;
  propertyName: string;
  imageUrls: string[];
  setImageUrls: (urls: string[]) => void;
}

const uploadImagesToBunny = async ({
  event,
  propertyName,
  imageUrls,
  setImageUrls,
}: UploadImagesToBunnyProps) => {
  // Set loading to true for the current index
  // setPortionPicturesLoading((prevState) => {
  //   const newLoading = [...prevState];
  //   newLoading[index] = true;
  //   return newLoading;
  // });
  // console.log("event: ", event, propertyName, imageUrls, setImageUrls);

  const files = event?.target.files;
  console.log("uploaded filed: ", files);

  if (!files || files.length === 0) {
    toast({
      variant: "destructive",
      title: "No Files Selected",
      description: "Please select files to upload.",
    });
    // Reset loading state if no files are selected
    // setPortionPicturesLoading((prevState) => {
    //   const newLoading = [...prevState];
    //   newLoading[index] = false;
    //   return newLoading;
    // });
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
      // setPortionPicturesLoading((prevState) => {
      //   const newLoading = [...prevState];
      //   newLoading[index] = false;
      //   return newLoading;
      // });
      return;
    }
  }

  const storageZoneName = process.env.NEXT_PUBLIC_BUNNY_STORAGE_ZONE;
  const accessKey = process.env.NEXT_PUBLIC_BUNNY_ACCESS_KEY;
  const storageUrl = process.env.NEXT_PUBLIC_BUNNY_STORAGE_URL;

  const formData = new FormData();

  const savedUrls: string[] = [...imageUrls];
  // const newImages = [...isPortionPictures];

  for (let i = 0; i < files.length; i++) {
    formData.append("file", files[i]);
    const time = new Date().getTime().toString();
    try {
      const response = await axios.put(
        `${storageUrl}/${storageZoneName}/${propertyName}/${time}-${files[i].name}`,
        files[i],
        {
          headers: {
            AccessKey: accessKey,
            "Content-Type": files[i].type,
          },
        }
      );

      console.log("bunny response: ", response);

      const imageUrl = `https://vacationsaga.b-cdn.net/${propertyName}/${time}-${files[i].name}`;

      // Update portionPictureUrls with new image URLs
      savedUrls[i] = imageUrl;
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

  // newImages[index] = true;
  console.log("saved Images: ", savedUrls);
  setImageUrls(savedUrls);
  // setIsPortionPictures(newImages);

  // Set loading state to false after upload completion
  // setPortionPicturesLoading((prevState) => {
  //   const newLoading = [...prevState];
  //   newLoading[index] = false;
  //   return newLoading;
  // });
};

export default uploadImagesToBunny;
