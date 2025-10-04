"use client";

import {
  Bed,
  Euro,
  Users,
  Pencil,
  MapPin,
  Loader2,
  FileText,
  CalendarIcon,
  Rocket,
} from "lucide-react";
import axios from "axios";
import Link from "next/link";
import React, { useEffect, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IQuery } from "@/util/type";
import { toast } from "@/hooks/use-toast";
import { useAuthStore } from "@/AuthStore";
import Heading from "@/components/Heading";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DatePicker from "@/components/DatePicker";
import { Toaster } from "@/components/ui/toaster";

interface PageProps {
  params: {
    id: string;
  };
}
interface PropertyBooster {
  _id: string;
  BoostID?: string;
  title: string;
  description: string;
  url: string;
  images: string[];
  createdBy: string;
  createdAt: string;
}


const QueryDetails = ({ params }: PageProps) => {
  const id = params.id;
  const { token } = useAuthStore();

  const [apiData, setApiData] = useState<IQuery>();
  const [leadsOfSameCustomer, setLeadsOfSameCustomer] = useState<IQuery[]>([]);
  const [loading, setLoading] = useState(false);
  const [retrieveLeadLoading, setRetrieveLeadLoading] = useState(false);
  // const [leadQuality, setLeadQuality] = useState<string>("");
  // const [saveLoading, setSaveLoading] = useState(false);
  const [editDisabled, setEditDisabled] = useState(true);
  const [budgetTo, setBudgetTo] = useState(0);
  const [budgetFrom, setBudgetFrom] = useState(0);
  const [createdByEmail, setCreatedByEmail] = useState<string>("");
  const [booster, setBooster] = useState<PropertyBooster | null>(null);

  // const handleSave = async () => {
  //   try {
  //     setSaveLoading(true);
  //     await axios.post("/api/sales/reviewLeadQuality", {
  //       id,
  //       leadQuality,
  //     });
  //     alert("Lead quality updated successfully.");
  //   } catch (err) {
  //     alert("Failed to update lead quality. Please try again.");
  //   } finally {
  //     setSaveLoading(false);
  //   }
  // };

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

  const getQueryByPhoneNumber = async () => {
    if (!apiData?.phoneNo) return;
    try {
      const response = await axios.post("/api/sales/getQueryByPhoneNumber", {
        phoneNo: apiData?.phoneNo,
      });
      const filteredLeads = response.data.data.filter(
        (lead: IQuery) => lead._id != apiData._id
      );
      setLeadsOfSameCustomer(filteredLeads);
    } catch (err: any) {
      console.log("err: ", err);
    }
  };

  useEffect(() => {
    setBudgetFrom(Number(apiData?.budget?.split(" to ")[0] ?? 0));
    setBudgetTo(Number(apiData?.budget?.split(" to ")[1] ?? 0));
    getQueryByPhoneNumber();
    fetchEmployeeDetails();
  }, [apiData]);

  const retrieveLead = async (leadId: string) => {
    if (!leadId) return;
    setRetrieveLeadLoading(true);
    try {
      const response = await axios.post("/api/sales/retrieveLead", { leadId });
      // console.log("response: ", response);
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

  const handleUpdate = async () => {
    const newData = { ...apiData };
    newData.budget = `${budgetFrom} to ${budgetTo}`;
    try {
      setEditDisabled(true);
      await axios.post("/api/sales/editquery", newData);
      toast({
        title: "Success",
        description: "Lead updated successfully",
      });
    } catch (err: any) {
      console.log("error in updating lead: ", err);
    }
  };

  const fetchEmployeeDetails = async () => {
    if (!apiData?.createdBy) return;
    try {
      const response = await axios.post("/api/employee/getEmployeeByEmail", {
        email: apiData.createdBy,
      });
      setCreatedByEmail(response.data.data.name);
    } catch (err: any) {
      console.log("error in fetching employee details: ", err);
    }
  };

   useEffect(() => {
    const getBooster = async () => {
      try {
        if (apiData?.BoostID) {
          const res = await axios.post<PropertyBooster>("/api/getPropertyBoosterId", {
  BoostID: apiData.BoostID,
});
setBooster(res.data);


        }
      } catch (error) {
        console.error("Error fetching booster by BoostID:", error);
      }
    };

    getBooster();
  }, [apiData?.BoostID]);

  return (
    <>
      <Toaster />
      <Heading
        heading="Lead Details"
        subheading="Details about the leads , please rate it according to your experience"
      />
      <div className=" relative ">
        {loading ? (
          <div className="flex items-center justify-center">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : (
          <div>
            <Card className="p-6 space-y-4">
              <div className="flex items-center space-x-3">
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
                <div className=" w-full flex justify-between">
                  <div>
                    <h2 className="text-xl font-bold">{apiData?.name}</h2>
                    {/* <p className="text-gray-400">{apiData?.phoneNo}</p> */}
                    <Input
                      value={apiData?.phoneNo}
                      onChange={(e) =>
                        setApiData(
                          (prev) =>
                          ({
                            ...prev,
                            phoneNo: Number(e.target.value),
                          } as IQuery)
                        )
                      }
                      disabled={editDisabled}
                    />
                  </div>
                  <div className=" flex items-center gap-x-16">
                    {(token?.role === "SuperAdmin" || token?.role === "Advert") && (
                      <div>
                        <Pencil
                          className={`p-2 border rounded-md cursor-pointer ${editDisabled ? " text-gray-700" : "text-white"
                            }`}
                          size={44}
                          onClick={() => setEditDisabled((prev) => !prev)}
                        />
                      </div>
                    )}
                    <div>
                      <Badge
                        variant={
                          apiData?.priority === "Medium Priority"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {apiData?.priority}
                      </Badge>
                      <div className="text-muted-foreground text-sm mt-2">
                        {new Date(apiData?.createdAt ?? "")?.toLocaleString("en-GB")}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <MapPin size={20} />
                  <Label>Area:</Label>
                  <Input
                    disabled={editDisabled}
                    value={apiData?.area ?? ""}
                    className="w-full"
                    onChange={(e) =>
                      setApiData(
                        (prev) =>
                        ({
                          ...prev,
                          area: e.target.value,
                        } as IQuery)
                      )
                    }
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Users size={20} />
                  <Label>Guests:</Label>
                  <Input
                    disabled={editDisabled}
                    type="number"
                    value={apiData?.guest ?? 0}
                    className="w-full"
                    onChange={(e) =>
                      setApiData(
                        (prev) =>
                        ({
                          ...prev,
                          guest: Number(e.target.value),
                        } as IQuery)
                      )
                    }
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Euro size={20} />
                  <Label>Budget:</Label>
                  <div>
                    <Label>Budget (From)</Label>
                    <Input
                      name="budgetFrom"
                      type="number"
                      // value={apiData?.budget?.split(" to ")[0] || ""}
                      // value={apiData?.budgetFrom || 0}
                      value={budgetFrom}
                      onChange={(e) => setBudgetFrom(Number(e.target.value))}
                      placeholder="Enter minimum budget"
                      disabled={editDisabled}
                    />
                  </div>
                  <div>
                    <Label>Budget (To)</Label>
                    <Input
                      name="budgetTo"
                      type="number"
                      // value={apiData?.budget?.split(" to ")[1] || ""}
                      // value={apiData?.budgetTo || 0}
                      value={budgetTo}
                      onChange={(e) => setBudgetTo(Number(e.target.value))}
                      placeholder="Enter maximum budget"
                      disabled={editDisabled}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Bed size={20} />
                  <Label>Beds:</Label>
                  <Input
                    disabled={editDisabled}
                    type="number"
                    value={apiData?.noOfBeds ?? 0}
                    className="w-full"
                    onChange={(e) =>
                      setApiData(
                        (prev) =>
                        ({
                          ...prev,
                          noOfBeds: Number(e.target.value),
                        } as IQuery)
                      )
                    }
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin size={20} />
                  <Label>Location:</Label>
                  <Input
                    disabled={editDisabled}
                    value={apiData?.location ?? ""}
                    className="w-full"
                    onChange={(e) =>
                      setApiData(
                        (prev) =>
                        ({
                          ...prev,
                          location: e.target.value,
                        } as IQuery)
                      )
                    }
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <FileText size={20} />
                  <Label>Property Type:</Label>
                  <Select
                    onValueChange={(value) =>
                      setApiData(
                        (prev) =>
                        ({
                          ...prev,
                          propertyType: value,
                        } as IQuery)
                      )
                    }
                  >
                    <SelectTrigger disabled={editDisabled}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Furnished">Furnished</SelectItem>
                      <SelectItem defaultChecked value="Un - furnished">
                        Un- furnished
                      </SelectItem>
                      <SelectItem value="Semi-furnished">Semi-furnished</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <FileText size={20} />
                  <Label>Bill Status:</Label>
                  <Select
                    onValueChange={(value) =>
                      setApiData(
                        (prev) =>
                        ({
                          ...prev,
                          billStatus: value,
                        } as IQuery)
                      )
                    }
                  >
                    <SelectTrigger disabled={editDisabled}>
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="With Bill">With Bill*</SelectItem>
                      <SelectItem value="Without Bill">Without Bill</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <CalendarIcon size={20} />
                  <Label>Start Date:</Label>
                  <DatePicker
                    date={new Date(apiData?.startDate ?? "")}
                    setDate={(date) =>
                      setApiData(
                        (prev) =>
                        ({
                          ...prev,
                          startDate: date.toLocaleString(),
                        } as IQuery)
                      )
                    }
                    disabled={editDisabled}
                  />
                </div>
                <div className="flex items-center space-x-2 ">
                  <CalendarIcon size={20} />
                  <Label>End Date:</Label>
                  <DatePicker
                    date={new Date(apiData?.endDate ?? "")}
                    setDate={(date) =>
                      setApiData(
                        (prev) =>
                        ({
                          ...prev,
                          endDate: date.toLocaleString(),
                        } as IQuery)
                      )
                    }
                    disabled={editDisabled}
                  />
                </div>

                {apiData?.BoostID && booster && (
        <div className="flex items-center gap-x-2 text-neutral-500">
          <p className="font-medium text-lg">Boost ID:</p>
          <Link
            href={`/dashboard/propertyBoost/list/${booster?._id}`}
            className="text-blue-600 hover:underline"
          >
            {apiData.BoostID}
          </Link>
        </div>
      )}


                {apiData?.leadStatus === "rejected" &&
                  (
                    <div>
                      <div className=" flex items-center gap-x-2 text-neutral-500">
                        <p className=" font-medium text-lg">Rejection Reason:</p>
                        <p>{apiData.rejectionReason}</p>
                      </div>
                      <Button onClick={() => retrieveLead(apiData?._id ?? "")}>
                        Remove Lead from Rejected
                      </Button>
                    </div>
                  )}
                {!editDisabled && (
                  <div className=" flex justify-end">
                    <Button className=" px-8" onClick={handleUpdate}>
                      Save
                    </Button>
                  </div>
                )}
              </div>
              {(token?.email === "vikas@vacationsaga.com" ||
                token?.role === "SuperAdmin") && (
                  <p className=" text-gray-500">Created By: {createdByEmail}</p>
                )}
            </Card>
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

      {/* Other Leads */}
      {leadsOfSameCustomer.length > 0 && (
        <p className=" text-2xl font-semibold my-2">Other Leads of Same Customer</p>
      )}
      {leadsOfSameCustomer.length > 0 &&
        leadsOfSameCustomer.map((lead: IQuery, index: number) => (
          <div key={index}>
            <div className=" flex justify-between text-sm items-center p-2 border border-neutral-600 rounded-md">
              <p>Name: {lead.name} </p>
              <p>Area: {lead.area} </p>
              <p>Budget: {lead.budget} </p>
              <p>
                CreatedAt: {new Date(lead?.createdAt ?? "")?.toLocaleDateString("en-GB")}{" "}
              </p>
              {/* <p onClick={() => router.push(`/dashboard/lead/${lead._id}`)}>Go to Lead</p> */}
              <Link
                href={`/dashboard/createquery/${lead._id}`}
                className=" p-1 bg-neutral-500 rounded-md text-black font-semibold"
              >
                Go to Lead
              </Link>
            </div>
          </div>
        ))}
    </>
  );
};

export default QueryDetails;
