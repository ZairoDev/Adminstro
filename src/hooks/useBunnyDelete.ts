import { useState } from "react";
import axios from "axios";

interface DeleteResult {
  success: boolean;
  error: string | null;
}

export const useBunnyDelete = () => {
  const [load, setLoad] = useState(false);

  const deleteFile = async (filePath: string): Promise<DeleteResult> => {
    const storageZoneName = process.env.NEXT_PUBLIC_BUNNY_STORAGE_ZONE!;
    const accessKey = process.env.NEXT_PUBLIC_BUNNY_ACCESS_KEY!;
    const storageUrl = process.env.NEXT_PUBLIC_BUNNY_STORAGE_URL!;

    if (!filePath) {
      return { success: false, error: "File path is required." };
    }

    setLoad(true);

    try {
      await axios.delete(`${storageUrl}/${storageZoneName}/${filePath}`, {
        headers: {
          AccessKey: accessKey,
        },
      });
      
      setLoad(false);
      return { success: true, error: null };
    } catch (error) {
      console.error("Error deleting file:", error);
      setLoad(false);
      return {
        success: false,
        error: "Error deleting file. Please try again.",
      };
    }
  };

  return { deleteFile, load };
};
