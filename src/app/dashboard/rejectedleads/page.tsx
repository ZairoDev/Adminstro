"use client";

import LeadTable from "@/components/leadTable/LeadTable";
import { useToast } from "@/hooks/use-toast";
import { IQuery } from "@/util/type";
import axios from "axios";
import { useEffect, useState } from "react";

const RejectedLeads = () => {
  const { toast } = useToast();
  const [rejectedLeads, setRejectedLeads] = useState<IQuery[]>([]);

  const fetchRejectedLeads = async () => {
    try {
      const response = await axios.get("/api/sales/getRejectedLeads");
      console.log("rejected lead response: ", response.data);
      setRejectedLeads(response.data);
    } catch (err: any) {
      toast({
        variant: "destructive",
        description: err.message,
      });
    }
  };

  useEffect(() => {
    fetchRejectedLeads();
  }, []);

  return (
    <div className="mt-2 border rounded-lg min-h-[90vh]">
      {rejectedLeads.length > 0 && <LeadTable queries={rejectedLeads} />}
    </div>
  );
};

export default RejectedLeads;
