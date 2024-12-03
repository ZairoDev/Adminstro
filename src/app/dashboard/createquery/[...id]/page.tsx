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
  Copy,
  DollarSign,
  Euro,
  Flag,
  Home,
  House,
  IdCard,
  KeyRound,
  Loader2,
  MapPin,
  User,
  Users,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/context/UserRoleContext";

interface PageProps {
  params: {
    id: string;
  };
}

const QueryDetails = ({ params }: PageProps) => {
  const id = params.id;
  const { userRole } = useUserRole();
  const [apiData, setApiData] = useState<IQuery>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
                      variant={
                        apiData?.priority === "Medium Priority"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {apiData?.priority}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoItem
                      icon={MapPin}
                      label="Area"
                      value={apiData?.area ?? ""}
                    />
                    <InfoItem
                      icon={Users}
                      label="Guests"
                      value={apiData?.guest ?? " "}
                    />
                    <InfoItem
                      icon={Euro}
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
                    {(userRole === "Sales" || userRole === "SuperAdmin") && (
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
                    {(userRole === "Sales" || userRole === "SuperAdmin") && (
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
                  </div>
                </CardContent>
                <Separator />
                {(userRole === "Sales" || userRole === "SuperAdmin") && (
                  <div className="p-4">
                    <p>Choose the quality of the lead</p>
                    <div className="flex items-center sm:flex-row gap-x-2 flex-col justify-between">
                      <div className="w-full sm:w-1/2 md:w-1/3">
                        <Select
                          value={leadQuality}
                          onValueChange={setLeadQuality}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Lead Quality" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Good">Good</SelectItem>
                            <SelectItem value="Bad">Bad</SelectItem>
                            <SelectItem value="Average">Average</SelectItem>
                            <SelectItem value="Below Average">
                              Below Average
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-full flex items-center justify-end sm:mt-0 mt-2">
                        <Button
                          className="w-full sm:w-auto"
                          onClick={handleSave}
                          disabled={saveLoading}
                        >
                          {saveLoading ? (
                            <Loader2 className="animate-spin w-4 h-4" />
                          ) : (
                            "Save"
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default QueryDetails;
