"use client";
import { useBunnyUpload } from "@/hooks/useBunnyUpload";
import { useState } from "react";

const FileUploader: React.FC = () => {
  const { uploadFile, loading } = useBunnyUpload();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [folderName, setFolderName] = useState<string>("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);

 
    const { imageUrl, error } = await uploadFile(file, folderName);

    if (error) {
      alert(error);
    } else if (imageUrl) {
      setImageUrl(imageUrl);
    }
  };

  return (
    <div>
     
      <input type="file" onChange={handleFileChange} />
      {loading && <p>Uploading...</p>}
      {previewImage && <img src={previewImage} alt="Preview" />}
      {imageUrl && <img src={imageUrl} alt="Uploaded" />}
    </div>
  );
};

export default FileUploader;
