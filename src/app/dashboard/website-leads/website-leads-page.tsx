"use client";

import axios from "axios";
import { format } from "date-fns";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  RefreshCw,
  Globe,
  Phone,
  Mail,
  MessageSquare,
  User,
  Calendar,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";

import {
  Pagination,
  PaginationLink,
  PaginationItem,
  PaginationContent,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import Heading from "@/components/Heading";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import HandLoader from "@/components/HandLoader";
import { Toaster } from "@/components/ui/toaster";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface WebsiteLead {
  _id: string;
  firstName: string;
  lastName: string;
  telephone: string;
  VSID: string;
  email?: string;
  message: string;
  createdAt: string;
  updatedAt: string;
}

const WebsiteLeadsPage = () => {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [leads, setLeads] = useState<WebsiteLead[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [totalLeads, setTotalLeads] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [page, setPage] = useState<number>(
    Number.parseInt(searchParams?.get("page") ?? "1")
  );
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchType, setSearchType] = useState<string>("name");

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams ?? undefined);
    params.set("page", newPage.toString());
    router.push(`?${params.toString()}`);
    setPage(newPage);
  };

  const renderPaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    if (startPage > 1) {
      items.push(
        <PaginationItem key="start-ellipsis">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            href="#"
            isActive={page === i}
            onClick={(e) => {
              e.preventDefault();
              handlePageChange(i);
            }}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }
    if (endPage < totalPages) {
      items.push(
        <PaginationItem key="end-ellipsis">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }
    return items;
  };

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
      });

      if (searchTerm) {
        params.append("searchTerm", searchTerm);
        params.append("searchType", searchType);
      }

      const response = await axios.get(`/api/website-leads?${params.toString()}`);
      setLeads(response.data.data);
      setTotalPages(response.data.totalPages);
      setTotalLeads(response.data.totalLeads);
    } catch (err) {
      toast({
        title: "Unable to fetch website leads",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, searchType, toast]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLeads();
  };

  const handleRefresh = () => {
    fetchLeads();
    toast({
      title: "Refreshed!",
      description: "Website leads have been refreshed",
    });
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ title: "Copied!" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    setPage(Number.parseInt(searchParams?.get("page") ?? "1"));
  }, [searchParams]);

  useEffect(() => {
    fetchLeads();
  }, [page]);


  return (
    <div className="w-full min-h-screen">
      <Toaster />

      {/* Header Section */}
      <div className="flex items-center md:flex-row flex-col justify-between w-full gap-4">
        <div className="w-full">
          <Heading
            heading="Website Leads"
            subheading="View and manage leads coming from the website"
          />
        </div>
        <div className="flex gap-2">
          <Badge
            variant="outline"
            className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/30 text-emerald-600 px-4 py-2"
          >
            <Globe className="w-4 h-4 mr-2" />
            {totalLeads} Total Leads
          </Badge>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            className="hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Search Section */}
      <form onSubmit={handleSearch} className="mt-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 bg-background/50 backdrop-blur-sm border-muted-foreground/20 focus:border-emerald-500/50 transition-all"
            />
          </div>
          <Select value={searchType} onValueChange={setSearchType}>
            <SelectTrigger className="w-full md:w-[180px] h-11 bg-background/50 backdrop-blur-sm">
              <SelectValue placeholder="Search by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="telephone">Phone</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="VSID">VSID</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="submit"
            className="h-11 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 transition-all"
          >
            <Search className="w-4 h-4 mr-2" />
            Search
          </Button>
        </div>
      </form>

      {/* Content Section */}
      {loading ? (
        <div className="flex mt-8 min-h-[60vh] items-center justify-center">
          <HandLoader />
        </div>
      ) : (
        <div className="mt-6">
          {leads.length > 0 ? (
            <div className="grid gap-4">
              {leads.map((lead, index) => (
                <Card
                  key={lead._id}
                  className="group overflow-hidden border-muted-foreground/10 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300"
                >
                  <CardHeader className="pb-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-lg shadow-lg shadow-emerald-500/30">
                          {lead.firstName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <User className="w-4 h-4 text-emerald-500" />
                            {lead.firstName} {lead.lastName}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(lead.createdAt), "PPp")}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <a
                                href={`https://www.vacationsaga.com/listing-stay-detail/${lead.VSID}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Badge
                                  variant="secondary"
                                  className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-violet-500/30 text-violet-600 hover:from-violet-500/20 hover:to-purple-500/20 cursor-pointer transition-all"
                                >
                                  <ExternalLink className="w-3 h-3 mr-1" />
                                  {lead.VSID}
                                </Badge>
                              </a>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>View property on VacationSaga</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Badge
                          variant="outline"
                          className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30 text-amber-600"
                        >
                          #{(page - 1) * 50 + index + 1}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid md:grid-cols-3 gap-4">
                      {/* Phone */}
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 group/item hover:bg-emerald-500/5 transition-all">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10">
                          <Phone className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">Phone</p>
                          <p className="font-medium truncate">{lead.telephone}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover/item:opacity-100 transition-opacity"
                          onClick={() => copyToClipboard(lead.telephone, `phone-${lead._id}`)}
                        >
                          {copiedId === `phone-${lead._id}` ? (
                            <Check className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>

                      {/* Email */}
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 group/item hover:bg-blue-500/5 transition-all">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/10">
                          <Mail className="w-4 h-4 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p className="font-medium truncate">
                            {lead.email || "Not provided"}
                          </p>
                        </div>
                        {lead.email && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover/item:opacity-100 transition-opacity"
                            onClick={() => copyToClipboard(lead.email!, `email-${lead._id}`)}
                          >
                            {copiedId === `email-${lead._id}` ? (
                              <Check className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                      </div>

                      {/* VSID */}
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 group/item hover:bg-violet-500/5 transition-all">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-500/10">
                          <Globe className="w-4 h-4 text-violet-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">VS ID</p>
                          <p className="font-medium truncate">{lead.VSID}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover/item:opacity-100 transition-opacity"
                          onClick={() => copyToClipboard(lead.VSID, `vsid-${lead._id}`)}
                        >
                          {copiedId === `vsid-${lead._id}` ? (
                            <Check className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Message */}
                    <div className="mt-4 p-4 rounded-lg bg-gradient-to-br from-muted/50 to-muted/30 border border-muted-foreground/10">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/10 shrink-0 mt-0.5">
                          <MessageSquare className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground mb-1">Message</p>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {lead.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
              <Globe className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">No website leads found</p>
              <p className="text-sm">
                New leads from the website will appear here
              </p>
            </div>
          )}

          {/* Pagination */}
          {leads.length > 0 && (
            <div className="flex items-center justify-between p-4 mt-4 rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} — {totalLeads} total results
              </p>
              <Pagination className="flex justify-end">
                <PaginationContent className="text-sm flex flex-wrap justify-end w-full md:w-auto">
                  {renderPaginationItems()}
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WebsiteLeadsPage;

