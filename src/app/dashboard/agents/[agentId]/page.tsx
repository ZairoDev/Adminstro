"use client";

import {
  Mail,
  Home,
  User,
  Globe,
  Phone,
  MapPin,
  FileText,
  CreditCard,
  CalendarDays,
} from "lucide-react";
import axios from "axios";
import { useEffect, useState } from "react";

import { toast } from "@/hooks/use-toast";
import { AgentInterface } from "@/util/type";
import { Badge } from "@/components/ui/badge";
import HandLoader from "@/components/HandLoader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PageProps {
  params: {
    agentId: string;
  };
}

const Agent = ({ params }: PageProps) => {
  const [agent, setAgent] = useState<AgentInterface | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAgent = async () => {
    try {
      setIsLoading(true);
      const agent = await axios.post("/api/addons/agents/getAgentById", {
        agentId: params.agentId,
      });
      setAgent(agent.data.data);
    } catch {
      toast({
        title: "Unable to fetch agent",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const formatPhoneNumber = (phone: number) => {
    const phoneStr = phone.toString();
    return phoneStr.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  useEffect(() => {
    fetchAgent();
  }, []);

  if (isLoading)
    return (
      <div className=" w-full h-screen flex justify-center items-center">
        <HandLoader />
      </div>
    );

  if (!agent)
    return (
      <div className=" w-full h-screen flex justify-center items-center">
        <p className=" text-xl font-semibold">Agent not found!</p>
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header Section */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24">
              {agent.profilePicture && (
                <AvatarImage
                  src={agent.profilePicture || "/placeholder.svg"}
                  alt={agent.agentName}
                />
              )}
              <AvatarFallback className="text-lg">
                {getInitials(agent.agentName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <CardTitle className="text-2xl">{agent.agentName}</CardTitle>
                <Badge variant={agent.isActive ? "default" : "secondary"}>
                  {agent.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="space-y-2 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>{agent.agentEmail}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>{formatPhoneNumber(agent.agentPhone)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{agent.location}</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Agent ID
                </label>
                <p className="font-mono text-sm">{agent._id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Gender
                </label>
                <p>{agent.gender}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Nationality
              </label>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span>{agent.nationality}</span>
              </div>
            </div>
            {agent.address && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Address
                </label>
                <div className="flex items-start gap-2">
                  <Home className="h-4 w-4 mt-0.5" />
                  <span>{agent.address}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {agent.accountNo && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Account Number
                </label>
                <p className="font-mono text-sm">{agent.accountNo}</p>
              </div>
            )}
            {agent.iban && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  IBAN
                </label>
                <p className="font-mono text-sm">{agent.iban}</p>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Created
                </label>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  {/* <span className="text-sm">{formatDate(agent.createdAt)}</span> */}
                  <span className="text-sm">
                    {agent.createdAt.toLocaleString()}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Last Updated
                </label>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  {/* <span className="text-sm">{formatDate(agent.updatedAt)}</span> */}
                  <span className="text-sm">
                    {agent.createdAt.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Social Accounts */}
      {agent.socialAccounts && agent.socialAccounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Social Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agent.socialAccounts.map((account: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <Globe className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">{account.platform}</p>
                    <a
                      href={account.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {account.url}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {agent.note && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              {agent.note}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
export default Agent;
