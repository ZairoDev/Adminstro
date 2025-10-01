"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowUpRight,
  FolderPen,
  LucideIcon,
  Minus,
  PackagePlus,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Property, UserInterface } from "@/util/type";
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
import CustomTooltip from "@/components/CustomToolTip";
import Loader from "@/components/loader";

interface PageProps {
  params: {
    id: string[];
  };
}

export default function UserProfilePage({ params }: PageProps) {
  const userId = params.id[0];
  const { toast } = useToast();
  const [user, setUser] = useState<UserInterface>();
  const [property, setProperty] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadinguserDetails, setLoadinguserDetails] = useState(false);

  const getUserDetails = async () => {
    try {
      setLoadinguserDetails(true);
      const response = await axios.post("/api/user/getuserDetails", { userId });
      if (response.status == 404) {
        toast({
          variant: "destructive",
          title: "Uh oh! Something went wrong.",
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
  const getProperty = async () => {
    try {
      setLoading(true);
      const response = await axios.post("/api/getpropertybyid", { userId });
      console.log(response.data.properties, "Response will print hereContext");
      setProperty(response.data.properties);
      setLoading(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: `Some error occured ${error}`,
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    getUserDetails();
    getProperty();
  }, []);

  return (
    <>
      {loading || loadinguserDetails ? (
        <div className="flex items-center justify-center mt-10">
          <Loader />
        </div>
      ) : (
        <div className="m-auto">
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
                <p className="text-muted-foreground line-clamp-1">
                  {user?.email}
                </p>
              </div>
              <Badge variant="secondary" className="ml-auto sm:block hidden">
                {user?.role}
              </Badge>
              <Link
                className="hidden sm:block"
                href={`/dashboard/edituserdetails/${userId}`}
              >
                <Button variant="link">Edit Profile</Button>
              </Link>
              {/* <Link className="sm:hidden" href={`/dashboard/edituserdetails/${userId}`}>
          <Button variant="link">Edit </Button>
        </Link> */}
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <InfoItem icon={FolderPen} label="Gender" value={user?.name} />
                <InfoItem icon={Flag} label="Name" value={user?.name} />
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

          <Heading
            heading={`${user?.name} Properties`}
            subheading={`All the property related by ${user?.name} will get here`}
          />

          <div className="grid gap-4 mb-4 justify-center mt-2 items-center xs:grid-cols-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xxl:grid-cols-4">
            {property?.length > 0 ? (
              property.map((property: Property) => (
                <div
                  key={property._id}
                  className="border rounded-lg relative sm:max-w-sm w-full h-full"
                >
                  <Link
                    href={{
                      pathname: `https://www.vacationsaga.com/listing-stay-detail/${property._id}`,
                    }}
                  >
                    <img
                      src={property.propertyCoverFileUrl}
                      alt="PropertyImage"
                      loading="lazy"
                      className="rounded-t-lg h-56 w-full object-cover"
                    />
                  </Link>

                  <div className="flex justify-between">
                    <div className="p-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-thin opacity-80">
                          <CustomTooltip
                            text={`${property.VSID}`}
                            desc="Property VSID"
                          />
                        </p>
                      </div>
                      <div>
                        {property &&
                        property.basePrice &&
                        property.basePrice[0] ? (
                          <p className="text-base">
                            <CustomTooltip
                              text={`€${property.basePrice[0]}`}
                              desc="Property price per night"
                            />
                          </p>
                        ) : (
                          <p className="text-base">NAN</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <Link href={`/dashboard/property/edit/${property._id}`}>
                        <Button variant="link" className="w-full">
                          Edit
                          <ArrowUpRight size={18} />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="flex items-center justify-center text-muted-foreground">
                No Properties found
              </p>
            )}
          </div>
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
