import { createImageUpload } from "novel/plugins";
import { toast } from "sonner";

const onUpload = (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const promise = fetch(
    `https://storage.bunnycdn.com/vacationsaga/blogs/${file.name}`,
    {
      method: "PUT",
      headers: {
        AccessKey: process.env.NEXT_PUBLIC_BUNNY_ACCESS_KEY || "",
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
    }
  );
  return new Promise((resolve, reject) => {
    toast.promise(
      promise.then(async (res) => {
        if (res.status === 201) {
          const url = `https://vacationsaga.b-cdn.net/${file.name}`;
          console.log(url);
          const image = new Image();
          image.src = url;
          image.onload = () => {
            resolve(url);
          };
          console.log(url);
        } else if (res.status === 401) {
          resolve(file);
          throw new Error("Bunny CDN AccessKey is incorrect.");
        } else {
          throw new Error("Error uploading image. Please try again.");
        }
      }),
      {
        loading: "Uploading image...",
        success: "Image uploaded successfully.",
        error: (e) => {
          reject(e);
          return e.message;
        },
      }
    );
  });
};
export const uploadFn = createImageUpload({
  onUpload,
  validateFn: (file) => {
    if (!file.type.includes("image/")) {
      toast.error("File type not supported.");
      return false;
    }
    if (file.size / 1024 / 1024 > 20) {
      toast.error("File size too big (max 20MB).");
      return false;
    }
    return true;
  },
});
