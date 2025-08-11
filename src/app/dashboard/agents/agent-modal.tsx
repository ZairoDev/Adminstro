import axios from "axios";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import "react-phone-number-input/style.css";
import React, { useRef, useState } from "react";
import PhoneInput from "react-phone-number-input";

import {
  Select,
  SelectItem,
  SelectValue,
  SelectTrigger,
  SelectContent,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { InfinityLoader } from "@/components/Loaders";
import { zodResolver } from "@hookform/resolvers/zod";
import { useBunnyUpload } from "@/hooks/useBunnyUpload";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { agentSchema, AgentValidationSchema } from "@/schemas/agent.schema";

interface PageProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AgentModal = ({ open, onOpenChange }: PageProps) => {
  const { toast } = useToast();
  const { uploadFiles } = useBunnyUpload();

  const [profilePic, setProfilepic] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [phone, setPhone] = useState<string | undefined>(undefined);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    toast({
      title: "Processing..",
      description: "Your image is being uploaded.",
    });

    try {
      const { imageUrls, error } = await uploadFiles(
        [file],
        "agentProfilePictures"
      );
      if (error) {
        toast({
          variant: "destructive",
          description:
            "There was an error uploading your image. Please try again.",
        });
      } else {
        setProfilepic(imageUrls[0]);
        toast({
          title: "Upload successful",
          description: "Your image has been uploaded successfully.",
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "An unexpected error occurred",
        description: "Please try again.",
      });
    }
  };

  const handleImageClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    control,
  } = useForm<AgentValidationSchema>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      agentName: "",
      agentEmail: "",
      agentPhone: "",
      profilePicture: "",
      nationality: "",
      gender: undefined,
      location: "",
      address: "",
      socialAccounts: [],
      accountNo: "",
      iban: "",
      note: "",
    },
  });

  const [loading, setLoading] = useState(false);

  const onSubmit = async (data: AgentValidationSchema) => {
    setLoading(true);
    const agentData = {
      ...data,
      profilePicture: profilePic,
    };

    try {
      await axios.post("/api/addons/agents/addAgent", agentData);
      toast({
        description: "Agent created successfully",
      });
      reset();
    } catch (error: any) {
      toast({
        variant: "destructive",
        description: error.response?.data?.error || "An error occurred.",
      });
      setLoading(false);
    } finally {
      setLoading(false);
      setProfilepic("");
    }
    setPhone("");
  };
  const selectedGender = watch("gender");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className=" flex flex-col justify-center items-center">
        <div className="flex items-center  sm:flex-row flex-col justify-center">
          <div
            className="relative w-32 h-32 rounded-full border-2 border-gray-300 flex items-center justify-center cursor-pointer"
            onClick={handleImageClick}
          >
            {previewImage ? (
              <img
                src={previewImage}
                alt="Profile Preview"
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <span className="text-gray-500 text-2xl">
                <Plus />
              </span>
            )}
          </div>
          <Input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            multiple={false}
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-6 flex flex-col gap-y-4"
        >
          <div className="flex sm:flex-row flex-col w-full gap-x-2">
            <div className="w-full">
              <Label htmlFor="name">Name</Label>
              <Input
                {...register("agentName")}
                className="w-full"
                placeholder="Enter Agent's name"
              />
              {errors.agentName && (
                <p className="text-red-500 text-xs">
                  {errors.agentName.message}
                </p>
              )}
            </div>

            <div className="w-full">
              <Label htmlFor="email">Email</Label>
              <Input
                {...register("agentEmail")}
                className="w-full"
                placeholder="Enter Agent's email"
              />
              {errors.agentEmail && (
                <p className="text-red-500 text-xs">
                  {errors.agentEmail.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex w-full sm:flex-row flex-col gap-x-2">
            <div className="w-full">
              <Label htmlFor="gender">Gender</Label>
              <Select
                // {...register("gender")}
                onValueChange={(value) =>
                  setValue("gender", value as "Male" | "Female" | "Other")
                }
                value={selectedGender}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.gender && (
                <p className="text-red-500 text-xs">{errors.gender.message}</p>
              )}
            </div>

            <div className=" w-full">
              <Label htmlFor="nationality">Nationality</Label>
              <Input
                {...register("nationality")}
                className="w-full"
                placeholder="Enter Naitonality"
              />
              {errors.nationality && (
                <p className="text-red-500 text-xs">
                  {errors.nationality.message}
                </p>
              )}
            </div>
          </div>

          <div className=" flex w-full sm:flex-row flex-col gap-x-1 justify-between">
            <div className=" w-full">
              <Label htmlFor="location">Location</Label>
              <Input
                {...register("location")}
                className="w-full"
                placeholder="Enter Location"
              />
              {errors.location && (
                <p className="text-red-500 text-xs">
                  {errors.location.message}
                </p>
              )}
            </div>
            <div className="w-full ">
              <Label htmlFor="phone">Phone Number</Label>
              <PhoneInput
                {...register("agentPhone")}
                className="phone-input border-red-500"
                placeholder="Enter phone number"
                value={phone}
                international
                countryCallingCodeEditable={false}
                error={"Phone number required"}
                onChange={(value) => setPhone(value?.toString())}
              />
              {errors.agentPhone && (
                <p className="text-red-500 text-xs">
                  {errors?.agentPhone?.message}
                </p>
              )}
            </div>
          </div>
              
          <div className=" w-full">
            <Label htmlFor="address">Address</Label>
            <Input
              {...register("address")}
              className="w-full"
              placeholder="Enter Address"
            />
            {errors.address && (
              <p className="text-red-500 text-xs">{errors.address.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="note">Enter Note</Label>
            <Textarea {...register("note")} placeholder="Enter Note..." />
          </div>

          <div className="flex items-end justify-start">
            <Button type="submit" className="w-full ">
              {loading ? (
                <InfinityLoader className=" w-12 h-8 font-medium" />
              ) : (
                "Create Agent"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AgentModal;
