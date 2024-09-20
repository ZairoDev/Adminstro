import { useState } from "react";
import axios from "axios";

interface UploadResult {
  imageUrls: string[];
  error: string | null;
}

export const useUploadImage = () => {
  const [loading, setLoading] = useState(false);

  const uploadFiles = async (
    files: File | File[],
    folderName: string
  ): Promise<UploadResult> => {
    const fileArray = Array.isArray(files) ? files : [files];

    if (fileArray.length === 0) {
      return { imageUrls: [], error: "No files provided." };
    }

    for (const file of fileArray) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        return {
          imageUrls: [],
          error: "Only PNG, JPEG, and WEBP files are allowed.",
        };
      }
    }

    const storageZoneName = process.env.NEXT_PUBLIC_BUNNY_STORAGE_ZONE!;
    const accessKey = process.env.NEXT_PUBLIC_BUNNY_ACCESS_KEY!;
    const storageUrl = process.env.NEXT_PUBLIC_BUNNY_STORAGE_URL!;

    setLoading(true);
    const imageUrls: string[] = [];

    try {
      await Promise.all(
        fileArray.map(async (file) => {
          const randomString = generateRandomString(7);
          const fileName = `${randomString}-${file.name}`;

          await axios.put(
            `${storageUrl}/${storageZoneName}/${folderName}/${fileName}`,
            file,
            {
              headers: {
                AccessKey: accessKey,
                "Content-Type": file.type,
              },
            }
          );

          imageUrls.push(`https://vacationsaga.b-cdn.net/${folderName}/${fileName}`);
        })
      );

      setLoading(false);
      return { imageUrls, error: null };
    } catch (error) {
      setLoading(false);
      return {
        imageUrls: [],
        error: "Error uploading files. Please try again.",
      };
    }
  };

  return { uploadFiles, loading };
};

const generateRandomString = (length: number): string => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};
