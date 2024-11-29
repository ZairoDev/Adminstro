"use client";
import Heading from "@/components/Heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { IQuery } from "@/util/type";
import axios from "axios";
import {
  Bed,
  Building,
  Calendar,
  DollarSign,
  Flag,
  Home,
  Loader2,
  Mail,
  MapPin,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";

interface PageProps {
  params: {
    id: string;
  };
}

const QueryDetails = ({ params }: PageProps) => {
  const id = params.id;
  const [apiData, setApiData] = useState<IQuery>();
  const [loading, setLoading] = useState(false);

  const response = async () => {
    try {
      setLoading(true);
      const data = await axios.post("/api/sales/getQuerybyId", { id });
      setApiData(data.data.data);
      console.log(data.data.data);
      console.log(data.data.data.area);
      setLoading(false);
    } catch (error: any) {
      console.log(error);
      setLoading(false);
    }
  };
  useEffect(() => {
    response();
  }, []);

  const InfoItem = ({
    icon: Icon,
    label,
    value,
  }: {
    icon: React.ElementType;
    label: string;
    value: string | number;
  }) => (
    <div className="flex border text-lg p-4 rounded-lg items-center space-x-2">
      <Icon className="w-5 h-5 text-gray-400" />
      <span className="text-sm text-gray-600 dark:text-gray-300">{label}:</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );

  return (
    <>
      <Heading
        heading="Lead Details"
        subheading="Details about the leads , please rate it according to your experience"
      />
      <div>
        {loading ? (
          <div className="flex items-center justify-center">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : (
          <div>
            <div className="">
              <Card className="">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-4">
                      <Link
                        className=""
                        href={`https://wa.me/${apiData?.phoneNo}?text=Hi%20${apiData?.name}%2C%20my%20name%20is%20Myself%2C%20and%20how%20are%20you%20doing%3F`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          src="https://vacationsaga.b-cdn.net/assets/wsp.png"
                          alt="icon image"
                          className="h-12 w-12"
                        />
                      </Link>

                      <div>
                        <CardTitle className="text-xl font-bold">
                          {apiData?.name}
                        </CardTitle>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {apiData?.phoneNo}
                        </p>
                      </div>
                    </div>
                    <Badge
                      className={`${
                        apiData?.priority === "High"
                          ? "bg-green-500 hover:bg-green-500 text-white"
                          : apiData?.priority === "Medium"
                          ? "bg-yellow-500 text-black hover:bg-yellow-500"
                          : "bg-red-500 text-white hover:bg-red-500"
                      }`}
                    >
                      {apiData?.priority} Priority
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoItem
                      icon={Mail}
                      label="Email"
                      value={apiData?.email ?? " "}
                    />
                    <InfoItem
                      icon={MapPin}
                      label="Area"
                      value={apiData?.area ?? ""}
                    />
                    <InfoItem
                      icon={MapPin}
                      label="Duration"
                      value={
                        apiData?.duration
                          ? `${apiData.duration} ${
                              apiData.bookingTerm === "Short Term"
                                ? "days"
                                : "months"
                            }`
                          : ""
                      }
                    />

                    <InfoItem
                      icon={Users}
                      label="Guests"
                      value={apiData?.guest ?? " "}
                    />
                    <InfoItem
                      icon={DollarSign}
                      label="Budget"
                      value={`€${apiData?.budget}`}
                    />
                    <InfoItem
                      icon={Bed}
                      label="Beds"
                      value={apiData?.noOfBeds ?? " "}
                    />
                    <InfoItem
                      icon={Calendar}
                      label="Term"
                      value={apiData?.bookingTerm ?? " "}
                    />
                    <InfoItem
                      icon={MapPin}
                      label="Location"
                      value={apiData?.location ?? " "}
                    />
                    <InfoItem
                      icon={Flag}
                      label="Zone"
                      value={apiData?.zone ?? " "}
                    />
                    <InfoItem
                      icon={Home}
                      label="Property Type"
                      value={apiData?.propertyType ?? " "}
                    />
                    <InfoItem
                      icon={Building}
                      label="Type of Property"
                      value={apiData?.typeOfProperty ?? " "}
                    />
                    <InfoItem
                      icon={User}
                      label="Bill Status"
                      value={apiData?.billStatus ?? " "}
                    />
                    <InfoItem
                      icon={Calendar}
                      label="Start Date"
                      value={apiData?.startDate ?? " "}
                    />
                    <InfoItem
                      icon={Calendar}
                      label="End Date"
                      value={apiData?.endDate ?? " "}
                    />
                    <InfoItem
                      icon={Mail}
                      label="Creator Rating"
                      value={apiData?.leadQualityByCreator ?? " "}
                    />
                    <InfoItem
                      icon={Mail}
                      label="Reviewer Rating"
                      value={apiData?.leadQualityByReviwer ?? " "}
                    />
                  </div>
                </CardContent>
                <Separator />
              </Card>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default QueryDetails;
