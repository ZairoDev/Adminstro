"use client";
import React, { useCallback, useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  X,
} from "lucide-react";
import {
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import { CiMoneyBill } from "react-icons/ci";

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

  const fetchQuery = useCallback(
    debounce(async (searchTerm: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/sales/getquery?page=${page}&limit=${limit}&searchTerm=${searchTerm}&searchType=${searchType}`
        );
        const data: ApiResponse = await response.json();
        console.log(data);
        if (response.ok) {
          setQueries(data.data);
          setTotalPages(data.totalPages);
        } else {
          throw new Error("Failed to fetch properties");
        }
      } catch (err: any) {
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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };
  const handleSubmit = async () => {
    try {
      const response = await fetch("/api/sales/createquery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
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
        console.error("Failed to create query");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

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

  return (
    <div>
      <h1>Sales Dashboard</h1>
      <Heading
        heading="All Leads"
        subheading="You will get the list of leads that created till now"
      />
      <div className="flex lg:mt-0  items-center gap-x-2">
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
        <div className="flex w-full items-center ">
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearchTerm(e.target.value)
            }
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
          <Button className=" xs:hidden" onClick={() => setIsDialogOpen(true)}>
            <Plus />
          </Button>
        </div>
      </div>

      {/* Button to open the alert dialog */}

      {/* Dialog (Alert box) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Query</DialogTitle>
          </DialogHeader>

          {/* Form inside the Dialog */}
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
            <Button onClick={handleSubmit}>Submit Query</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Render the list of queries */}
      <div className="grid gap-4 mb-4 justify-center mt-2 items-center xs:grid-cols-2 grid-cols-1  sm:grid-cols-2 md:grid-cols-3 xxl:grid-cols-4 ">
        {queries.map((query) => (
          <div>
            <div
              key={query._id}
              className="border rounded-lg relative sm:max-w-sm p-2 w-full h-full"
            >
              <div>
                <div className="">
                  <h2 className="line-clamp-1 p-1 text-lg font-semibold gap-x-2 flex items-center border-b">
                    <div className=" bg-muted p-2 rounded-full">
                      <FolderPen size={18} className="text-primary" />
                    </div>
                    {query.name}
                  </h2>
                  <div>
                    <p className="absolute top-4 right-4 ">
                      <AlertDialog>
                        <AlertDialogTrigger>
                          <Expand size={18} />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-muted-foreground text-start">
                              Information about{" "}
                              <span className="text-primary">{query.name}</span>
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-start">
                              <div className="flex flex-col gap-y-1">
                                <div>
                                  <p>
                                    <span className="text-muted-foreground">
                                      ConsumerEmail:
                                    </span>{" "}
                                    {query.email}
                                  </p>
                                </div>
                                <div>
                                  <p>
                                    <span className="text-muted-foreground">
                                      PriceRange:{" "}
                                    </span>
                                    {query.price}
                                  </p>
                                </div>
                                <div>
                                  <p>
                                    <span className="text-muted-foreground">Intrested In:</span> {query.intrest}
                                  </p>
                                </div>
                                <div>
                                  <p><span className="text-muted-foreground">Description:</span> {query.about}</p>
                                </div>
                              </div>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="absolute top-2 p-2 right-2">
                              <p className=" ">
                                <X size={18} />
                              </p>
                            </AlertDialogCancel>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </p>
                  </div>
                </div>

                <div className="line-clamp-1 p-1 text-sm  gap-x-2 flex items-center border-b">
                  <div className=" bg-muted p-2 rounded-full">
                    <Mail size={18} className="text-primary" />
                  </div>
                  <p className="line-clamp-1"> {query.email}</p>
                </div>

                <div className="line-clamp-1 p-1 text-sm gap-x-2 flex items-center border-b">
                  <div className=" bg-muted p-2 rounded-full">
                    <CiMoneyBill size={18} className="text-primary" />
                  </div>
                  <p className="line-clamp-1"> €{query.price}</p>
                </div>
                <div className="line-clamp-1 p-1 text-sm gap-x-2 flex items-center border-b">
                  <div className=" bg-muted p-2 rounded-full">
                    <MessageSquareHeart size={18} className="text-primary" />
                  </div>
                  <p className="line-clamp-1"> {query.intrest}</p>
                </div>
                <p className=" p-1 text-sm gap-x-2 flex items-center ">
                  <div className=" bg-muted p-2 rounded-full">
                    <SearchX size={18} className="text-primary" />
                  </div>
                  <p className="line-clamp-1"> {query.about}</p>
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SalesDashboard;
