"use client";
import React, { useState, useEffect } from "react";
import { FaPlus } from "react-icons/fa6";
import axios from "axios";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import "react-phone-number-input/style.css";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PhoneInput from "react-phone-number-input";
import Link from "next/link";
import { ArrowLeft, Loader } from "lucide-react";
import GotoUserPage from "@/components/GotoUserPage";
import Animation from "@/components/animation";
import Heading from "@/components/Heading";

interface PageProps {
  params: {
    id: string[];
  };
}

const AccountPage = ({ params }: PageProps) => {
  const userId = params.id[0];
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [gender, setGender] = useState<string>("");
  const [language, setLanguage] = useState("");
  const [nationality, setNationality] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [bankDetails, setBankDetails] = useState("");

  const [profilePic, setProfilePic] = useState("");
  const [profilePicLoading, setProfilePicLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState("");

  const [loading, setLoading] = useState(false);

  const [user, setUser] = useState<any>();

  const gettheUserdetails = async () => {
    try {
      const response = await axios.post("/api/user/getuserDetails", { userId });
      if (response.status === 404) {
        toast({
          title: "Uh oh! Something went wrong.",
          description: "Looks like the user doesn't exist.",
        });
      } else if (response.status === 200) {
        setUser(response.data.data);
        setName(response.data.data.name || "");
        setGender(response.data.data.gender || "");
        setLanguage(response.data.data.spokenLanguage || "");
        setNationality(response.data.data.nationality || "");
        setEmail(response.data.data.email || "");
        setAddress(response.data.data.address || "");
        setPhone(response.data.data.phone || "");
        setBankDetails(response.data.data.bankDetails || "");
        setProfilePic(response.data.data.profilePic || "");
      }
    } catch (error) {
      toast({
        title: "Uh oh! Something went wrong.",
        description: `Looks like some error occurred: ${error}`,
      });
    }
  };

  useEffect(() => {
    gettheUserdetails();
  }, [userId]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const updateData = {
        _id: userId,
        profilePic,
        name,
        gender,
        spokenLanguage: language,
        address,
        phone,
        nationality,
        bankDetails,
      };
      const response = await axios.put("/api/user/editUserDetails", updateData);
      if (response.data.success) {
        toast({
          title: "Success!",
          description: "Profile updated successfully.",
        });
        setLoading(false);
      } else {
        toast({
          title: "Error",
          description: "Failed to update profile.",
        });
        setLoading(false);
      }
    } catch (error) {
      toast({
        title: "Some error occurred",
        description: `Failed to update profile: ${error}`,
      });
      setLoading(false);
    }
  };

  const randomNumber = (length: any) => {
    const characters = "0123456789";
    let password = "";
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      password += characters.charAt(randomIndex);
    }
    return password;
  };

  const handleProfilePhoto = async (e: any) => {
    setProfilePicLoading(true);
    setPreviewImage(e?.target?.files[0]?.name);
    const file = e?.target?.files[0];

    if (
      !file ||
      !(
        file.type === "image/jpeg" ||
        file.type === "image/png" ||
        file.type === "image/webp"
      )
    ) {
      alert("Error: Only PNG and JPEG files are allowed.");
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e: any) {
      setPreviewImage(e.target.result);
    };
    reader.readAsDataURL(file);

    const storageZoneName = process.env.NEXT_PUBLIC_BUNNY_STORAGE_ZONE;
    const accessKey = process.env.NEXT_PUBLIC_BUNNY_ACCESS_KEY;
    const storageUrl = process.env.NEXT_PUBLIC_BUNNY_STORAGE_URL;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const randomNumberToAddInImageName = randomNumber(7);
      const response = await axios.put(
        `${storageUrl}/${storageZoneName}/ProfilePictures/${randomNumberToAddInImageName}${file.name}`,
        file,
        {
          headers: {
            AccessKey: accessKey,
            "Content-Type": file.type,
          },
        }
      );

      const imageUrl = `https://vacationsaga.b-cdn.net/ProfilePictures/${randomNumberToAddInImageName}${file.name}`;
      setProfilePic(imageUrl);
      setProfilePicLoading(false);
    } catch (error) {
      alert("Error uploading image. Please try again.");
      setProfilePicLoading(false);
    }
  };

  return (
    <>
      <Animation>
        <Heading
          heading="Edit details"
          subheading="You can edit user details from here."
        />

        <div className=" border rounded-lg p-4  ">
          <div className="flex items-center mb-8 justify-center">
            <div className="relative rounded-full overflow-hidden flex">
              <label htmlFor="file-upload">
                <div className="lg:w-36 relative lg:h-36 md:w-28 md:h-28 w-20 h-20 rounded-full border border-gray-500 flex justify-center items-center mx-auto cursor-pointer hover:opacity-60 ">
                  {(!previewImage || !profilePic) && !profilePicLoading && (
                    <span className="absolute flex items-center justify-center w-full h-full">
                      <FaPlus className="opacity-70 text-3xl cursor-pointer" />
                    </span>
                  )}
                  <input
                    type="file"
                    className="sr-only"
                    accept="image/*"
                    id="file-upload"
                    name="file-upload"
                    onChange={handleProfilePhoto}
                  />
                  {profilePic && !profilePicLoading && (
                    <div className="w-full h-full rounded-full overflow-hidden transition-all">
                      <img
                        src={profilePic}
                        className="object-cover h-full w-full transition-all"
                      />
                    </div>
                  )}
                  {profilePicLoading && (
                    <div className="w-full h-full rounded-full overflow-hidden transition-all">
                      <img
                        src={previewImage}
                        className="opacity-70 object-contain h-full w-full transition-all"
                      />
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:flex-row flex-col">
            <div className="w-full">
              <Label>Name</Label>
              <Input
                className="w-full"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="w-full">
              <Label>Gender</Label>
              <Select
                value={gender}
                onValueChange={(value) => setGender(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:flex-row flex-col">
            <div className="w-full">
              <Label>Language</Label>
              <Input
                className="mt-1.5"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              />
            </div>

            <div className="w-full">
              <Label>Nationality</Label>
              <Input
                className="mt-1.5"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 sm:flex-row flex-col">
            <div className="w-full">
              <Label>Email</Label>
              <Input className="mt-1.5" value={email} readOnly />
            </div>

            <div className="w-full">
              <Label>Address</Label>
              <Input
                className="mt-1.5"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:flex-row flex-col">
            <div className="w-full">
              <Label>Phone</Label>
              <div className="flex items-center mt-1.5">
                <PhoneInput
                  country={"us"}
                  value={phone}
                  onChange={(value) => setPhone(value || "")}
                  containerClass="flex-grow"
                  className="flex-1 phone-input"
                />
              </div>
            </div>

            <div className="w-full">
              <Label>Bank Details</Label>
              <Input
                className="mt-1.5"
                value={bankDetails}
                onChange={(e) => setBankDetails(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-start mt-8">
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="sm:w-2/6 w-full"
            >
              {loading ? (
                <>
                  <div className="flex items-center gap-x-1">
                    Updating...
                    <Loader className="animate-spin " size={18} />
                  </div>
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </div>
        </div>
      </Animation>
    </>
  );
};

export default AccountPage;
