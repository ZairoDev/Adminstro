"use client";

import axios from "axios";
import Link from "next/link";
import { useEffect, useState } from "react";
import { EllipsisVertical } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/hooks/use-confirm";
import { InfinityLoader } from "@/components/Loaders";
import AgentModal from "@/app/dashboard/agents/agent-modal";

interface AgentIntrerface {
  _id: string;
  agentName: string;
  agentPhone: string;
}

const Addons = () => {
  const [agents, setAgents] = useState<AgentIntrerface[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [agentModal, setAgentModal] = useState(false);

  const [DeleteDialog, confirmDelete] = useConfirm(
    "Delete Agent",
    "This action can not be undone",
    "destructive"
  );

  const getAllAgents = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get("/api/addons/agents/getAllAgents");
      setAgents(response.data.data);
    } catch (err) {
      toast({
        title: "Unable to fetch agents",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAgent = async (id: string) => {
    const ok = await confirmDelete();
    if (!ok) return;
    try {
      await axios.delete("/api/addons/agents/deleteAgentById", {
        data: { agentId: id },
      });
      toast({
        title: "Agent deleted successfully",
      });
      setAgents((prev) => prev.filter((agent) => agent._id !== id));
    } catch (err) {
      toast({
        title: "Unable to delete agent",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    getAllAgents();
  }, []);

  return (
    <div className=" px-4">
      <DeleteDialog />
      <h1 className=" text-2xl font-semibold">Add Ons</h1>

      {/*Add Agents*/}
      <section className=" border rounded-md w-64 min-h-80 h-80 overflow-y-scroll flex flex-col items-center justify-between gap-2 mt-8 p-2">
        {isLoading ? (
          <InfinityLoader className=" w-16 h-12" />
        ) : (
          <div className=" w-full flex flex-col gap-y-2">
            {agents.map((agent, index) => (
              <div
                key={index}
                className=" flex justify-between items-center w-full p-2 border rounded-md"
              >
                <p>{agent.agentName}</p>
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <EllipsisVertical size={22} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Agent Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Link
                        href={`/dashboard/agents/${agent._id}`}
                        target="_blank"
                      >
                        View Detail
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => deleteAgent(agent._id)}>
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
        <Button className=" w-full" onClick={() => setAgentModal(true)}>
          <span className=" font-semibold text-base">Add Agent</span>
        </Button>
        <AgentModal open={agentModal} onOpenChange={setAgentModal} />
      </section>
    </div>
  );
};
export default Addons;
