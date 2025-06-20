"use client";

import {
  Copy,
  Loader2,
  BookUser,
  ArrowUp01,
  LucideIcon,
  ShieldPlus,
} from "lucide-react";
import axios from "axios";
import { format } from "date-fns";
import { motion } from "framer-motion"
import React, { useEffect, useState } from "react";

import {
  User,
  Flag,
  Home,
  Phone,
  Globe,
  AtSign,
  Calendar,
  Languages,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogTitle,
  AlertDialogHeader,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogFooter,
  AlertDialogContent,
  AlertDialogTrigger,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import Loader from "@/components/loader";
import Heading from "@/components/Heading";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { EmployeeInterface } from "@/util/type";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PageProps {
  params: {
    id: string[];
  };
}

const statusVariants = {
  inactive: { x: 3 },
  active: { x: 48 },
};


export default function EmployeeProfilePage({ params }: PageProps) {

  const userId = params.id[0];
  const { toast } = useToast();
  const [user, setUser] = useState<EmployeeInterface>();
  const [loadinguserDetails, setLoadinguserDetails] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const getUserDetails = async () => {
    try {
      setLoadinguserDetails(true);
      const response = await axios.post("/api/employee/getEmployeeDetails", {
        userId,
      });
      console.log(response.data.data);
      setIsActive(response.data.data.isActive);
      if (response.status == 404) {
        toast({
          variant: "destructive",
          title: "Uh oh! Error",
          description: "Looks like the user doesn't exist.",
        });
        setLoadinguserDetails(false);
      } else {
        setUser(response.data.data);
        console.log(response.data.data);
        setLoadinguserDetails(false);
      }
    } catch (error: any) {
      console.log(error);
      setLoadinguserDetails(false);
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: `Some error occured ${error}`,
      });
    }
  };
  useEffect(() => {
    getUserDetails();
  }, []);

  const [copySuccess, setCopySuccess] = useState("");
  const [generatingPassword, setGeneratingPassword] = useState<boolean>(false);
  const [newpassword, setNewPassword] = useState<string>("");

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(newpassword)
      .then(() => {
        setCopySuccess("Password copied!");
        toast({
          description: "Password copied successfully",
        });
      })
      .catch((err) => {
        setCopySuccess("Failed to copy!");
        toast({
          description: "An error occurred while processing your request.",
        });
        console.error("Error copying text: ", err);
      });
  };

  const passwordGeneration = async () => {
    try {
      setGeneratingPassword(true);
      const resposne = await axios.post("/api/generateNewpassword", {
        employeeId: userId,
      });
      console.log(
        resposne.data.newPassword,
        "Password response will be render here"
      );
      setNewPassword(resposne.data.newPassword);
      setGeneratingPassword(false);
    } catch (error: any) {
      console.log(error, "Password error will be render here");

      setGeneratingPassword(false);
      return error;
    }
  };
  const [open, setOpen] = useState(false);

  const handleConfirm = () => {
    setOpen(false);
    setGeneratingPassword(true);
    passwordGeneration();
  };

  const handleStatusChange = async (active: boolean) => {
    setIsActive(active);
    try {
      const statusResponse = await axios.put("/api/employee/editEmployee",
        { _id: user?._id, isActive: active });
    } catch (error) {
      setIsActive(!active);
      alert("Status cannot be changed");
    }
  }

  return (
    <>
      {loadinguserDetails ? (
        <div className="flex items-center justify-center mt-10">
          <Loader />
        </div>
      ) : (
        <div className="m-auto">
          <div className="mb-1">
            <Heading
              heading="Employee Details"
              subheading="You can generate a new password for the employee"
            />
          </div>
          <Card className=" bg-background ">
            <CardHeader className="flex flex-row items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarImage src={user?.profilePic} alt={user?.name} />
                <AvatarFallback>{user?.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-3xl font-bold line-clamp-1 ">
                  {user?.name}
                </CardTitle>
                <p className="text-muted-foreground line-clamp-1">
                  {user?.email}
                </p>
                <div className="relative w-full">
                  <div>
                    {newpassword && (
                      <>
                        <div className="w-full">
                          <button
                            className="absolute right-2 top-1/2 transform -translate-y-1/2  rounded px-2 py-1 "
                            onClick={copyToClipboard}
                          >
                            <Copy size={12} />
                          </button>
                          <p className="text-xs text-green-700">
                            {newpassword}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="ml-auto flex flex-col gap-y-2">
                <Badge variant="secondary" >
                  {user?.role}
                </Badge>
                <div
                  className=" h-8 w-20 border rounded-3xl flex items-center cursor-pointer relative"
                  onClick={() => handleStatusChange(!isActive)}
                >
                  <motion.div
                    className={`${isActive ? "bg-green-600" : "bg-red-600"} h-7 w-7 rounded-full flex items-center justify-center font-bold text-lg`}
                    variants={statusVariants}
                    initial={isActive ? "active" : "inactive"}
                    animate={isActive ? "active" : "inactive"}
                  >
                    {isActive ? "A" : "I"}
                  </motion.div>
                </div>
              </div>
              {/* <Link className="sm:hidden" href={`/dashboard/edituserdetails/${userId}`}>
          <Button variant="link">Edit </Button>
        </Link> */}
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <InfoItem icon={Flag} label="Name" value={user?.name} />
                <InfoItem icon={User} label="Gender" value={user?.gender} />
                <InfoItem
                  icon={Flag}
                  label="Nationality"
                  value={user?.nationality}
                />
                <InfoItem icon={Flag} label="Country" value={user?.country} />
                <InfoItem icon={Phone} label="Phone" value={user?.phone} />
                <InfoItem icon={Home} label="Address" value={user?.address} />
                <InfoItem
                  icon={Languages}
                  label="Spoken Language"
                  value={user?.spokenLanguage}
                />
                <InfoItem
                  icon={AtSign}
                  label="Account Number"
                  value={user?.accountNo}
                />
                <InfoItem icon={AtSign} label="IFSC Code" value={user?.ifsc} />
                <InfoItem
                  icon={ArrowUp01}
                  label="Experience"
                  value={user?.experience}
                />
                <InfoItem
                  icon={BookUser}
                  label="Adhar Number"
                  value={user?.aadhar}
                />
                <InfoItem
                  icon={ShieldPlus}
                  label="Gender"
                  value={user?.gender}
                />
                <InfoItem
                  icon={Calendar}
                  label="Joining Date"
                  value={
                    user?.createdAt
                      ? format(new Date(user.dateOfJoining), "MM/dd/yyyy")
                      : ""
                  }
                />
                <InfoItem icon={AtSign} label="Alias" value={user?.alias} />
                <InfoItem
                  icon={Globe}
                  label="Verified"
                  value={user?.isVerified ? "Yes" : "No"}
                />
              </div>
            </CardContent>
          </Card>

          <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
              <Button
                // onClick={handleGenerateClick}
                // disabled={generatingPassword}
                className="sm:w-2/6 w-full mt-4"
              >
                {generatingPassword ? (
                  <div className="flex items-center gap-x-1">
                    Generating... <Loader2 className="animate-spin" size={18} />
                  </div>
                ) : (
                  "Generate Password"
                )}
              </Button>
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Password Generation</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to generate a new password?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setOpen(false)}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirm}>
                  Confirm
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </>
  );
}
interface InfoItemProps {
  icon: LucideIcon;
  label: string;
  value: string | number | undefined;
}
function InfoItem({ icon: Icon, label, value }: InfoItemProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-4">
      <div className="h-8 w-8 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex flex-col justify-center">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  );
}
