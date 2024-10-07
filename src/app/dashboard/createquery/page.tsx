import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import React from "react";

const CreateQuery = () => {
  return (
    <>
      <div>
        <h1>Create Query</h1>
        <div>
          <Label>Name</Label>
          <Input placeholder="Enter Query" />
        </div>
      </div>
    </>
  );
};

export default CreateQuery;
