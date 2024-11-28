import Heading from "@/components/Heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import React from "react";
interface PageProps {
  params: {
    id: string;
  };
}

const CandidateDetails = ({ params }: PageProps) => {

  const id = params.id;
  
  return (
    <>
      <div>
        <Heading
          heading="Candidate Details"
          subheading="Promote this candidate to a full-time
          employee with their assigned  role"
        />
        <div className="border rounded-lg p-4">
          <div className="grid md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-4">
            <div>
              <Label>Name</Label>
              <Input placeholder="Name" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input pattern="^\+?[0-9]{10,15}$" placeholder="Phone" />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                pattern="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
                placeholder="Email"
              />
            </div>
            <div>
              <Label>Alias</Label>
              <Input placeholder="alias" />
            </div>
            <div>
              <Label>Gender</Label>
              <Select>
                <SelectTrigger className="">
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nationality</Label>
              <Input placeholder="Nationality" />
            </div>
            <div>
              <Label>Country</Label>
              <Input placeholder="Country" />
            </div>
            <div>
              <Label>Address</Label>
              <Input placeholder="Address" />
            </div>
            <div>
              <Label>Spoken Language</Label>
              <Input placeholder="Spoken Language" />
            </div>
            <div>
              <Label>Bank Acc Number</Label>
              <Input placeholder="Bank Acc Number" />
            </div>
            <div>
              <Label>IFSC Code</Label>
              <Input placeholder="IFSC Code" />
            </div>
            <div>
              <Label>Experience</Label>
              <Input placeholder="In Months" />
            </div>
            <div>
              <Label>Adhar Number</Label>
              <Input placeholder="Adhar Number" />
            </div>
            <div>
              <Label>Joining Date</Label>
              <Input type="date" placeholder="Date" />
            </div>
          </div>
          <div className="mt-4 flex items-end justify-end w-full">
            <Button>Save Detaiis</Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default CandidateDetails;
