"use client";

import axios from "axios";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import {
  Bed,
  Building,
  Calendar,
  Copy,
  Euro,
  Flag,
  Home,
  House,
  KeyRound,
  Loader2,
  MapPin,
  User,
  Users,
} from "lucide-react";

import { IQuery } from "@/util/type";
import { useAuthStore } from "@/AuthStore";
import Heading from "@/components/Heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PageProps {
  params: {
    id: string;
  };
}

const QueryDetails = ({ params }: PageProps) => {
  const id = params.id;
  const { token } = useAuthStore();

  const [apiData, setApiData] = useState<IQuery>();
  const [loading, setLoading] = useState(false);
  const [retrieveLeadLoading, setRetrieveLeadLoading] = useState(false);
  const [leadQuality, setLeadQuality] = useState<string>("");
  const [saveLoading, setSaveLoading] = useState(false);

  const handleSave = async () => {
    try {
      setSaveLoading(true);
      await axios.post("/api/sales/reviewLeadQuality", {
        id,
        leadQuality,
      });
      alert("Lead quality updated successfully.");
    } catch (err) {
      alert("Failed to update lead quality. Please try again.");
    } finally {
      setSaveLoading(false);
    }
  };

  const response = async () => {
    try {
      setLoading(true);
      const data = await axios.post("/api/sales/getQuerybyId", { id });
      setApiData(data.data.data);
      setLoading(false);
    } catch (error: any) {
      console.log(error);
      setLoading(false);
    }
  };
  useEffect(() => {
    response();
  }, []);

  const retrieveLead = async (leadId: string) => {
    setRetrieveLeadLoading(true);
    try {
      const response = await axios.post("/api/sales/retrieveLead", { leadId });
      console.log("response: ", response);
    } catch (err: any) {
      console.log("err: ", err);
    } finally {
      setRetrieveLeadLoading(false);
      if (apiData) {
        setApiData((prev: any) => {
          const newData = { ...prev };
          newData.rejectionReason = null;
          return newData;
        });
      }
    }
  };

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
      <div className=" relative">
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
                    <div className=" flex flex-col">
                      <Badge
                        variant={
                          apiData?.priority === "Medium Priority"
                            ? "secondary"
                            : "destructive"
                        }
                        className=" w-16 mx-auto flex justify-center"
                      >
                        {apiData?.priority}
                      </Badge>
                      <div className="text-muted-foreground text-sm mt-2">
                        {new Date(apiData?.createdAt ?? "")?.toLocaleString("en-GB")}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoItem icon={MapPin} label="Area" value={apiData?.area ?? ""} />
                    <InfoItem icon={Users} label="Guests" value={apiData?.guest ?? " "} />
                    <InfoItem icon={Euro} label="Budget" value={`€${apiData?.budget}`} />
                    <InfoItem icon={Bed} label="Beds" value={apiData?.noOfBeds ?? " "} />
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
                    <InfoItem icon={Flag} label="Zone" value={apiData?.zone ?? " "} />
                    <InfoItem
                      icon={Home}
                      label="Property Type"
                      value={apiData?.propertyType ?? " "}
                    />
                    <InfoItem
                      icon={Building}
                      label="Building Type"
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
                    {(token?.role === "Sales" || token?.role === "SuperAdmin") && (
                      <div className=" flex items-center justify-between border rounded-lg">
                        <InfoItem
                          icon={House}
                          label="Room Id"
                          value={apiData?.roomDetails?.roomId ?? " "}
                        />
                        <p>
                          <Copy
                            onClick={() =>
                              navigator.clipboard.writeText(
                                apiData?.roomDetails?.roomId ?? ""
                              )
                            }
                            className=" cursor-pointer mr-4"
                          />
                        </p>
                      </div>
                    )}
                    {(token?.role === "Sales" || token?.role === "SuperAdmin") && (
                      <div className=" flex items-center justify-between border rounded-lg">
                        <InfoItem
                          icon={KeyRound}
                          label="Room Password"
                          value={apiData?.roomDetails?.roomPassword ?? " "}
                        />
                        <p>
                          <Copy
                            onClick={() =>
                              navigator.clipboard.writeText(
                                apiData?.roomDetails?.roomPassword ?? " "
                              )
                            }
                            className=" cursor-pointer mr-4"
                          />
                        </p>
                      </div>
                    )}
                    {token?.email == "harshit2003gtm@gmail.com" && (
                      <div className=" text-gray-500 text-sm">
                        Created By : {apiData?.createdBy}
                      </div>
                    )}
                    <div className=" flex gap-x-4 items-center">
                      {apiData?.rejectionReason && (
                        <p>
                          Reason for Rejection: &nbsp;&nbsp; {apiData?.rejectionReason}
                        </p>
                      )}
                      {apiData?.rejectionReason && (
                        <Button onClick={() => retrieveLead(apiData?._id!)}>
                          {retrieveLeadLoading ? "Retreiving..." : "Retreive Lead"}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
                <Separator />
              </Card>
            </div>
          </div>
        )}
        {apiData?.rejectionReason && (
          <div>
            <p className=" text-red-500 opacity-30 text-7xl font-bold rotate-315 absolute top-1/2 left-1/3">
              REJECTED
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default QueryDetails;
