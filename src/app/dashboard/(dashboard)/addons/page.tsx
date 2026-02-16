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
import BrokerModal from "@/app/dashboard/brokers/broker-modal";
import RoleModal, { RoleRow } from "@/app/dashboard/roles/role-modal";
import TargetModal from "../../target/target_model";
import { TargetEditModal } from "../../target/target-edit-model";
import { AreaModel } from "../../target/area-model";
import { DisplayLists } from "@/components/displaylists/lists";
import { useAuthStore } from "@/AuthStore";

interface AgentIntrerface {
  _id: string;
  agentName: string;
  agentPhone: string;
}

interface BrokerInterface {
  _id: string;
  name: string;
  email?: string;
  phone: string;
}

interface RoleInterface {
  _id: string;
  role: string;
  department: string;
  isActive: boolean;
  origin?: string;
}

type Area = { name: string; metrolane?: string; zone?: string };

interface TargetInterface {
  _id: string;
  country: string;
  city: string;
  state: string;
  sales: number;
  visits: number;
  leads: number;
  area: Area[];
}

const Addons = () => {
  const [agents, setAgents] = useState<AgentIntrerface[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [agentModal, setAgentModal] = useState(false);
  const [brokers, setBrokers] = useState<BrokerInterface[]>([]);
  const [isBrokerLoading, setIsBrokerLoading] = useState(false);
  const [brokerModal, setBrokerModal] = useState(false);
  const [roles, setRoles] = useState<RoleInterface[]>([]);
  const [isRoleLoading, setIsRoleLoading] = useState(false);
  const [roleModal, setRoleModal] = useState(false);
  const [editRole, setEditRole] = useState<RoleRow | null>(null);
  const [targetModal, setTargetModal] = useState(false);
  const [targets, setTargets] = useState<TargetInterface[]>([]);
  const [editTarget, setEditTarget] = useState<TargetInterface | null>(null);
  const [targetId, setTargetId] = useState("");
  const [loading, setLoading] = useState(false);
  const [targetEdit, setTargetEdit] = useState(false);
  const [areaModel, setAreaModel] = useState(false);
  const [areaId, setAreaId] = useState("");
  const [openList, setOpenList] = useState(false);
  const [list, setList] = useState<Area[]>([]);
  const [mounted, setMounted] = useState(false);
  const { token } = useAuthStore();

  // Handle hydration - wait for client-side mount before checking auth
  useEffect(() => {
    setMounted(true);
  }, []);


  const [DeleteDialog, confirmDelete] = useConfirm(
    "Delete Agent",
    "This action can not be undone",
    "destructive"
  );

  const [DeleteBrokerDialog, confirmDeleteBroker] = useConfirm(
    "Delete Broker",
    "This action can not be undone",
    "destructive"
  );

  const [DeleteRoleDialog, confirmDeleteRole] = useConfirm(
    "Delete Role",
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

  const getAllBrokers = async () => {
    try {
      setIsBrokerLoading(true);
      const response = await axios.get("/api/addons/brokers/getAllBrokers");
      setBrokers(response.data.data);
    } catch (err) {
      toast({
        title: "Unable to fetch brokers",
        variant: "destructive",
      });
    } finally {
      setIsBrokerLoading(false);
    }
  };

  const getAllRoles = async () => {
    try {
      setIsRoleLoading(true);
      const response = await axios.get("/api/addons/roles/getAllRoles");
      setRoles(response.data.data ?? []);
    } catch (err) {
      toast({
        title: "Unable to fetch roles",
        variant: "destructive",
      });
    } finally {
      setIsRoleLoading(false);
    }
  };

  const getTargets = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/addons/target/getAllTargets");

      const sortedData = response.data.data.sort(
        (a: any, b: any) => a.country.localeCompare(b.country) // alphabetically by country
      );
      setTargets(sortedData);
      setLoading(false);
    } catch (err) {
      console.log(err);
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

  const deleteBroker = async (id: string) => {
    const ok = await confirmDeleteBroker();
    if (!ok) return;
    try {
      await axios.delete("/api/addons/brokers/deleteBrokerById", {
        data: { brokerId: id },
      });
      toast({
        title: "Broker deleted successfully",
      });
      setBrokers((prev) => prev.filter((broker) => broker._id !== id));
    } catch (err) {
      toast({
        title: "Unable to delete broker",
        variant: "destructive",
      });
    }
  };

  const deleteRole = async (id: string) => {
    const ok = await confirmDeleteRole();
    if (!ok) return;
    try {
      await axios.delete("/api/addons/roles/deleteRoleById", {
        data: { roleId: id },
      });
      toast({ title: "Role deleted successfully" });
      setRoles((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      toast({
        title: "Unable to delete role",
        variant: "destructive",
      });
    }
  };

  const deleteTarget = async (id: string) => {
    const ok = await confirmDelete();
    if (!ok) return;
    try {
      await axios.delete("/api/addons/target/deleteTargetById", {
        data: { targetId: id },
      });
      toast({ title: "Target deleted successfully" });
      setTargets((prev) => prev.filter((target) => target._id !== id));
    } catch (err) {
      toast({ title: "Unable to delete target", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (!targetId) return;
    const getData = async () => {
      try {
        const response = await axios.get(
          `/api/addons/target/getTargetById/${targetId}`
        );
        setEditTarget(response.data.target); // single object, not array
      } catch (error) {
        console.error("Failed to fetch target:", error);
      }
    };

    getData();
  }, [targetId]);

  useEffect(() => {
    getAllAgents();
    getAllBrokers();
    getAllRoles();
    getTargets();
  }, []);

  // Show loading state until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="px-4">
        <h1 className="text-2xl font-semibold">Add Ons</h1>
        <div className="flex items-center justify-center min-h-[200px]">
          <InfinityLoader className="w-16 h-12" />
        </div>
      </div>
    );
  }

  return (
    <div className=" px-4">
      <DeleteDialog />
      <DeleteBrokerDialog />
      <DeleteRoleDialog />
      <h1 className=" text-2xl font-semibold">Add Ons</h1>

      {/*Add Agents and Brokers*/}
      <div className=" flex items-center gap-3">
        {mounted && token?.role === "SuperAdmin" && (
          <>
          <section className=" border rounded-md w-64 min-h-80 h-80 overflow-y-scroll flex flex-col items-center justify-between gap-2 mt-8 p-2">
            {isLoading ? (
              <InfinityLoader className=" w-16 h-12" />
            ) : (
              <div className=" w-full flex flex-col gap-y-2">
                {agents?.map((agent, index) => (
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
                        <DropdownMenuItem
                          onClick={() => deleteAgent(agent._id)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
            <Button className=" w-full" onClick={() => setAgentModal(true)}>
              <span className=" font-semibold text-base ">Add Agent</span>
            </Button>
            <AgentModal open={agentModal} onOpenChange={setAgentModal} />
          </section>

            <section className=" border rounded-md w-64 min-h-80 h-80 overflow-y-scroll flex flex-col items-center justify-between gap-2 mt-8 p-2">
              {isBrokerLoading ? (
                <InfinityLoader className=" w-16 h-12" />
              ) : (
                <div className=" w-full flex flex-col gap-y-2">
                  {brokers?.map((broker, index) => (
                    <div
                      key={index}
                      className=" flex justify-between items-center w-full p-2 border rounded-md"
                    >
                      <p>{broker.name}</p>
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <EllipsisVertical size={22} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuLabel>Broker Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => deleteBroker(broker._id)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
              <Button className=" w-full" onClick={() => setBrokerModal(true)}>
                <span className=" font-semibold text-base ">Add Broker</span>
              </Button>
              <BrokerModal 
                open={brokerModal} 
                onOpenChange={setBrokerModal}
                getAllBrokers={getAllBrokers}
              />
            </section>

            <section className=" border rounded-md w-64 min-h-80 h-80 overflow-y-scroll flex flex-col items-center justify-between gap-2 mt-8 p-2">
              {isRoleLoading ? (
                <InfinityLoader className=" w-16 h-12" />
              ) : (
                <div className=" w-full flex flex-col gap-y-2">
                  {roles?.map((r) => (
                    <div
                      key={r._id}
                      className=" flex justify-between items-center w-full p-2 border rounded-md"
                    >
                      <div className="min-w-0 flex-1 flex items-center gap-2">
                        <span
                          className="shrink-0 w-2 h-2 rounded-full"
                          title={r.isActive === true ? "Active" : "Inactive"}
                          aria-hidden
                          style={{
                            backgroundColor: r.isActive === true ? "var(--chart-2, #22c55e)" : "var(--destructive, #ef4444)",
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{r.role}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {r.department}
                            {r.origin ? ` · ${r.origin}` : ""}
                            {r.isActive !== true && " · Inactive"}
                          </p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <EllipsisVertical size={22} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuLabel>Role Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setEditRole({
                                _id: r._id,
                                role: r.role,
                                department: r.department,
                                isActive: r.isActive,
                                origin: r.origin ?? "",
                              });
                              setRoleModal(true);
                            }}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => deleteRole(r._id)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
              <Button className=" w-full" onClick={() => { setEditRole(null); setRoleModal(true); }}>
                <span className=" font-semibold text-base ">Add Role</span>
              </Button>
              <RoleModal
                open={roleModal}
                onOpenChange={setRoleModal}
                getAllRoles={getAllRoles}
                editRole={editRole}
                setEditRole={setEditRole}
              />
            </section>
          </>
        )}


        <AreaModel
          areaModel={areaModel}
          setAreaModel={setAreaModel}
          areaName="Athens"
          areaId={areaId}

          getAllTargets={getTargets}
        />
        <TargetModal
          open={targetModal}
          onOpenChange={setTargetModal}
          getAllTargets={getTargets}
        />
        {openList && list && (
          <DisplayLists
            heading="Area List"
            data={list}
            setOnClose={setOpenList}
          />
        )}
        {targetEdit && editTarget && (
          <TargetEditModal
            open={targetEdit}
            onOpenChange={setTargetEdit}
            targetData={editTarget}
            getAllTargets={getTargets}
          />
        )}
      </div>
    </div>
  );
};
export default Addons;
