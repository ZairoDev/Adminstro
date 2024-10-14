"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FolderPen, LucideIcon, Minus, PackagePlus } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserInterface } from "@/util/type";
import React, { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  AtSign,
  Calendar,
  Flag,
  Globe,
  Home,
  Languages,
  Phone,
  User,
  GitPullRequestCreate,
} from "lucide-react";
import axios from "axios";
import Heading from "@/components/Heading";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface PageProps {
  params: {
    id: string[];
  };
}

export default function UserProfilePage({ params }: PageProps) {
  const userId = params.id[0];
  const { toast } = useToast();
  const [user, setUser] = useState<UserInterface>();

  const getUserDetails = async () => {
    try {
      const response = await axios.post("/api/user/getuserDetails", { userId });
      if (response.status == 404) {
        toast({
          title: "Uh oh! Something went wrong.",
          description: "Looks like the user doesn't exist.",
        });
      } else {
        setUser(response.data.data);
        console.log(response.data.data);
      }
    } catch (error: any) {
      console.log(error);
    }
  };

  useEffect(() => {
    getUserDetails();
  }, []);

  return (
    <div className="">
      <div className="mb-1">
        <Heading
          heading="User Details"
          subheading="You can get all the details about the user"
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
            <p className="text-muted-foreground line-clamp-1">{user?.email}</p>
          </div>
          <Badge variant="secondary" className="ml-auto sm:block hidden">
            {user?.role}
          </Badge>
          <Link className="hidden sm:block" href={`/dashboard/edituserdetails/${userId}`}>
            <Button variant="link">Edit Profile</Button>
          </Link>
          {/* <Link className="sm:hidden" href={`/dashboard/edituserdetails/${userId}`}>
            <Button variant="link">Edit </Button>
          </Link> */}
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <InfoItem icon={FolderPen} label="Gender" value={user?.name} />
            <InfoItem icon={Flag} label="name" value={user?.name} />
            <InfoItem icon={User} label="Gender" value={user?.gender} />
            <InfoItem
              icon={Flag}
              label="Nationality"
              value={user?.nationality}
            />
            <InfoItem icon={Phone} label="Phone" value={user?.phone} />
            <InfoItem icon={Home} label="Address" value={user?.address} />
            <InfoItem
              icon={Languages}
              label="Spoken Language"
              value={user?.spokenLanguage}
            />
            <InfoItem
              icon={AtSign}
              label="Bank Details"
              value={user?.bankDetails}
            />
            <InfoItem
              icon={Calendar}
              label="Member Since"
              value={
                user?.createdAt
                  ? format(new Date(user.createdAt), "MM/dd/yyyy")
                  : ""
              }
            />
            <InfoItem
              icon={Globe}
              label="Verified"
              value={user?.isVerified ? "Yes" : "No"}
            />
            <InfoItem
              icon={GitPullRequestCreate}
              label="Total Request"
              value={user?.myRequests.length}
            />

            <InfoItem
              icon={Minus}
              label="Declined Requests"
              value={user?.declinedRequests.length}
            />
            <InfoItem
              icon={PackagePlus}
              label="Upcomming Requests"
              value={user?.myUpcommingRequests.length}
            />
          </div>
        </CardContent>
      </Card>
    </div>
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
        <p className="text-sm font-medium ">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  );
}
