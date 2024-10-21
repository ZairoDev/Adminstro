"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import debounce from "lodash.debounce";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Heading from "@/components/Heading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Expand,
  FolderPen,
  Mail,
  MessageSquareHeart,
  Plus,
  SearchX,
} from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import { CiMoneyBill } from "react-icons/ci";
import Loader from "@/components/loader";
import { DialogTrigger } from "@radix-ui/react-dialog";
import { useToast } from "@/hooks/use-toast";

interface ApiResponse {
  data: IQuery[];
  totalPages: number;
}

interface IQuery {
  _id: string;
  name: string;
  email: string;
  price: string;
  intrest: string;
  about: string;
}
const SalesDashboard = () => {
  const [queries, setQueries] = useState<IQuery[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitQuery, setSubmitQuery] = useState<boolean>(false);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchType, setSearchType] = useState<string>("email");
  const [page, setPage] = useState<number>(1);
  const [formData, setFormData] = useState<IQuery>({
    _id: "",
    name: "",
    email: "",
    price: "",
    intrest: "",
    about: "",
  });
  const limit: number = 12;
  const { toast } = useToast();
  const handleSubmit = async () => {
    try {
      setSubmitQuery(true);
      const response = await fetch("/api/sales/createquery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        const result = await response.json();
        const newQuery = result.data;
        setQueries((prevQueries) => [newQuery, ...prevQueries]);
        setIsDialogOpen(false);
        setFormData({
          _id: "",
          name: "",
          email: "",
          price: "",
          intrest: "",
          about: "",
        });
      } else {
        toast({
          description: `Failed to create query ${response.status}`,
        });
        console.error("Failed to create query");
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setSubmitQuery(false);
    }
  };

  const handleInputchecks = (): boolean => {
    if (
      formData.name.length > 0 &&
      formData.email.length > 0 &&
      formData.price.length > 0 &&
      formData.intrest.length > 0 &&
      formData.about.length > 0
    ) {
      return true;
    } else {
      return false;
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };
  const fetchQuery = useCallback(
    debounce(async (searchTerm: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/sales/getquery?page=${page}&limit=${limit}&searchTerm=${searchTerm}&searchType=${searchType}`
        );
        const data: ApiResponse = await response.json();
        if (response.ok) {
          setQueries(data.data);
          setTotalPages(data.totalPages);
        } else {
          throw new Error("Failed to fetch properties");
        }
      } catch (err: any) {
        setLoading(false);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }, 500),
    [page, searchType, limit]
  );

  useEffect(() => {
    fetchQuery(searchTerm);
  }, [fetchQuery, searchTerm]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const renderPaginationItems = () => {
    let items = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
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
  const searchInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === "j") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div>
      <Heading
        heading="All Leads"
        subheading="You will get the list of leads that created till now"
      />
      <div className="flex lg:mt-0 items-center gap-x-2">
        <div className="sm:max-w-[180px] max-w-[100px] w-full">
          <Select
            onValueChange={(value: string) => setSearchType(value)}
            value={searchType}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-full items-center">
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearchTerm(e.target.value)
            }
            ref={searchInputRef}
            className="max-w-xl"
          />
        </div>
        <div>
          <Button
            className="xs:block hidden"
            onClick={() => setIsDialogOpen(true)}
          >
            Create Query
          </Button>
          <Button className="xs:hidden" onClick={() => setIsDialogOpen(true)}>
            <Plus />
          </Button>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Query</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter name"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter email"
              />
            </div>
            <div>
              <Label>Price</Label>
              <Input
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                placeholder="Enter price"
              />
            </div>
            <div>
              <Label>Interest</Label>
              <Input
                name="intrest"
                value={formData.intrest}
                onChange={handleInputChange}
                placeholder="Enter interest"
              />
            </div>
            <div>
              <Label>About</Label>
              <Textarea
                name="about"
                value={formData.about}
                onChange={handleInputChange}
                placeholder="Enter details"
              />
            </div>
          </div>

          <DialogFooter>
            <Button disabled={submitQuery} onClick={handleSubmit}>
              Submit Query
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="flex mt-2 items-center justify-center">
          <Loader />
        </div>
      ) : (
        <div className="grid gap-4 mb-4 justify-center mt-2 items-center xs:grid-cols-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xxl:grid-cols-4 ">
          {queries.map((query) => (
            <div key={query._id}>
              <div className="border rounded-lg relative sm:max-w-sm p-2 w-full h-full">
                <div>
                  <div>
                    <h2 className="line-clamp-1 p-1 text-lg font-semibold gap-x-2 flex items-center border-b">
                      <div className="bg-muted p-2 rounded-full">
                        <FolderPen size={18} className="text-primary" />
                      </div>
                      {query.name}
                    </h2>
                    <div className="absolute top-4 right-4">
                      <Dialog>
                        <DialogTrigger>
                          <Expand size={18} />
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle className="text-start text-lg">
                              Information
                            </DialogTitle>
                            <div>
                              <h1 className="  flex items-center gap-x-2">
                                <span className="text-muted-foreground">
                                  Name
                                </span>{" "}
                                <p className="text-sm">{query.name} </p>
                              </h1>
                            </div>
                            <div>
                              <h1 className="  flex items-center gap-x-2">
                                <span className="text-muted-foreground">
                                  Email:
                                </span>{" "}
                                <p className="text-sm">{query.email} </p>
                              </h1>
                            </div>
                            <div>
                              <h1 className="  flex items-center gap-x-2">
                                <span className="text-muted-foreground">
                                  Price:
                                </span>{" "}
                                <p className="text-sm">{query.price} </p>
                              </h1>
                            </div>
                            <div>
                              <h1 className="  flex items-center gap-x-2">
                                <span className="text-muted-foreground">
                                  Intrest:
                                </span>
                                <p className="text-sm">{query.intrest} </p>
                              </h1>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                About:
                              </span>
                              <h1 className="  flex  gap-x-2">
                                <p className="text-sm">{query.about} </p>
                              </h1>
                            </div>
                          </DialogHeader>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  <div className="line-clamp-1 p-1 text-sm gap-x-2 flex items-center border-b">
                    <div className="bg-muted p-2 rounded-full">
                      <Mail size={18} className="text-primary" />
                    </div>
                    <p className="line-clamp-1">{query.email}</p>
                  </div>
                  <div className="line-clamp-1 p-1 text-sm gap-x-2 flex items-center border-b">
                    <div className="bg-muted p-2 rounded-full">
                      <CiMoneyBill size={18} className="text-primary" />
                    </div>
                    <p className="line-clamp-1"> €{query.price}</p>
                  </div>
                  <div className="line-clamp-1 p-1 text-sm gap-x-2 flex items-center border-b">
                    <div className="bg-muted p-2 rounded-full">
                      <MessageSquareHeart size={18} className="text-primary" />
                    </div>
                    <p className="line-clamp-1">{query.intrest}</p>
                  </div>
                  <p className="p-1 text-sm gap-x-2 flex items-center">
                    <div className="bg-muted p-2 rounded-full">
                      <SearchX size={18} className="text-primary" />
                    </div>
                    <p className="line-clamp-1">{query.about}</p>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {queries.length > 12 && (
        <div className="text-xs w-full">
          <Pagination className="flex flex-wrap items-center w-full">
            <PaginationContent className="text-xs flex flex-wrap justify-center w-full md:w-auto">
              {renderPaginationItems()}
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
};
export default SalesDashboard;
