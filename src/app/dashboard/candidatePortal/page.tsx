"use client";
import React, { useState, ChangeEvent, FormEvent } from "react";
import Heading from "@/components/Heading";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface FormData {
  name: string;
  email: string;
  phone: string;
  position: string;
}

const CandidatePortal: React.FC = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    position: "",
  });
  const [loading, setLoading] = useState(false);
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      position: value,
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await axios.post(
        "/api/hrportal/createCandidate",
        formData
      );
      toast({
        description: `Your registration has been successfully completed.
         Your assigned queue number is ${response.data.queueNumber}`,
      });
      setFormData({
        name: "",
        email: "",
        phone: "",
        position: "",
      });
      setLoading(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        description:
          error.response?.data?.error ||
          "Something went wrong. Please try again.",
      });
      setLoading(false);
    }
  };
  return (
    <div className="">
      <Heading
        heading="Candidate Portal"
        subheading="Fill in the candidate details below to register."
      />
      <form
        onSubmit={handleSubmit}
        className="border p-4 rounded-md  shadow-md"
      >
        <div className="gap-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Candidate Name"
              required
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Candidate Email"
              required
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Candidate Phone Number"
              required
            />
          </div>
          <div>
            <Label htmlFor="position">Position</Label>
            <Select
              value={formData.position}
              onValueChange={handleSelectChange}
            >
              <SelectTrigger id="position">
                <SelectValue placeholder="Select Position" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Developer">Developer</SelectItem>
                <SelectItem value="Human Resources">Human Resources</SelectItem>
                <SelectItem value="QA Engineer">QA Engineer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4 flex justify-end ">
          <Button type="submit" disabled={loading}>
            {loading ? (
              <div>
                <p className="flex">
                  Saving...
                  <span className="ml-1">
                    <Loader2 size={18} className="animate-spin" />
                  </span>
                </p>
              </div>
            ) : (
              "Save Details"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CandidatePortal;
