// "use client";
// import { ColumnDef } from "@tanstack/react-table";
// import { ArrowUpDown, MoreHorizontal } from "lucide-react";
// import { Button } from "@/components/ui/button";

// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
//   AlertDialogTrigger,
// } from "@/components/ui/alert-dialog";

// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import Link from "next/link";
// import { UserInterface } from "@/util/type";

// const renderCell = (value: any) => {
//   return value ? value : "NA";
// };

// export const columns: ColumnDef<UserInterface>[] = [
//   {
//     accessorKey: "name",
//     header: "Name",
//     cell: ({ getValue }) => renderCell(getValue()),
//   },
//   {
//     accessorKey: "phone",
//     header: "Contact",
//     cell: ({ getValue }) => renderCell(getValue()),
//   },
//   {
//     accessorKey: "email",
//     header: ({ column }) => (
//       <Button
//         variant="ghost"
//         onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
//       >
//         Email
//         <ArrowUpDown className="ml-2 h-4 w-4" />
//       </Button>
//     ),
//     cell: ({ getValue }) => renderCell(getValue()),
//   },
//   {
//     accessorKey: "nationality",
//     header: "Nationality",
//     cell: ({ getValue }) => renderCell(getValue()),
//   },
//   {
//     accessorKey: "role",
//     header: "Role",
//     cell: ({ getValue }) => renderCell(getValue()),
//   },
//   {
//     id: "actions",
//     header: "Actions",
//     cell: ({ row }) => {
//       const user = row.original;
//       return (
//         <DropdownMenu>
//           <DropdownMenuTrigger asChild>
//             <Button variant="ghost" className="h-8 w-8 p-0">
//               <span className="sr-only">Open menu</span>
//               <MoreHorizontal className="h-4 w-4" />
//             </Button>
//           </DropdownMenuTrigger>
//           <DropdownMenuContent align="end">
//             <DropdownMenuLabel>Actions</DropdownMenuLabel>
//             <DropdownMenuItem
//               onClick={() => navigator.clipboard.writeText(user._id)}
//             >
//               Copy Id
//             </DropdownMenuItem>
//             <DropdownMenuSeparator />
//             <DropdownMenuItem>
//               <Link href={`/dashboard/edituserdetails/${user._id}`}>
//                 Edit Profile
//               </Link>
//             </DropdownMenuItem>

//             <DropdownMenuItem>
//               <Link href="/">Delete Employee</Link>
//             </DropdownMenuItem>
//             <DropdownMenuItem>
//               <Link href="/">Banned Employee</Link>
//             </DropdownMenuItem>
//           </DropdownMenuContent>
//         </DropdownMenu>
//       );
//     },
//   },
// ];

// "use client";

// import { ColumnDef } from "@tanstack/react-table";
// import { ArrowUpDown, MoreHorizontal } from "lucide-react";
// import { useState } from "react";
// import Link from "next/link";
// import axios from "axios";

// import { Button } from "@/components/ui/button";
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
// } from "@/components/ui/alert-dialog";
// import { useToast } from "@/hooks/use-toast";

// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";

// import { UserInterface } from "@/util/type";

// const renderCell = (value: any) => {
//   return value ? value : "NA";
// };

// export const columns: ColumnDef<UserInterface>[] = [
//   {
//     accessorKey: "name",
//     header: "Name",
//     cell: ({ getValue }) => renderCell(getValue()),
//   },
//   {
//     accessorKey: "phone",
//     header: "Contact",
//     cell: ({ getValue }) => renderCell(getValue()),
//   },
//   {
//     accessorKey: "email",
//     header: ({ column }) => (
//       <Button
//         variant="ghost"
//         onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
//       >
//         Email
//         <ArrowUpDown className="ml-2 h-4 w-4" />
//       </Button>
//     ),
//     cell: ({ getValue }) => renderCell(getValue()),
//   },
//   {
//     accessorKey: "nationality",
//     header: "Nationality",
//     cell: ({ getValue }) => renderCell(getValue()),
//   },
//   {
//     accessorKey: "role",
//     header: "Role",
//     cell: ({ getValue }) => renderCell(getValue()),
//   },
//   {
//     id: "actions",
//     header: "Actions",
//     cell: ({ row }) => {
//       const user = row.original;
//       const [showDeleteAlert, setShowDeleteAlert] = useState(false);
//       const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

//       const { toast } = useToast();
//       const handleDelete = async (_id: string) => {
//         try {
//           const response = await axios.post(`/api/employee/deleteEmploye`, {
//             _id,
//           });
//           toast({
//             title: "Sucess !",
//             description:
//               "You have successfully deleted employee refresh the page to get the lates data",
//           });
//           window.location.reload();
//         } catch (error: any) {
//           console.log("Error deleting employee:", error);
//           toast({
//             variant: "destructive",
//             title: "Error!",
//             description: error.response?.data?.error || "An error occurred.",
//           });
//         }
//       };

//       return (
//         <>
//           <DropdownMenu>
//             <DropdownMenuTrigger asChild>
//               <Button variant="ghost" className="h-8 w-8 p-0">
//                 <span className="sr-only">Open menu</span>
//                 <MoreHorizontal className="h-4 w-4" />
//               </Button>
//             </DropdownMenuTrigger>
//             <DropdownMenuContent align="end">
//               <DropdownMenuLabel>Actions</DropdownMenuLabel>
//               <DropdownMenuItem
//                 onClick={() => navigator.clipboard.writeText(user._id)}
//               >
//                 Copy Id
//               </DropdownMenuItem>
//               <DropdownMenuSeparator />
//               <DropdownMenuItem>
//                 <Link href={`/dashboard/edituserdetails/${user._id}`}>
//                   Edit Profile
//                 </Link>
//               </DropdownMenuItem>
//               <DropdownMenuItem
//                 onClick={() => {
//                   setSelectedUserId(user._id);
//                   setShowDeleteAlert(true);
//                 }}
//               >
//                 Delete Employee
//               </DropdownMenuItem>
//             </DropdownMenuContent>
//           </DropdownMenu>

//           {/* Alert Dialog for Delete Confirmation */}
//           {showDeleteAlert && (
//             <AlertDialog
//               open={showDeleteAlert}
//               onOpenChange={setShowDeleteAlert}
//             >
//               <AlertDialogContent>
//                 <AlertDialogHeader>
//                   <AlertDialogTitle>Are you sure?</AlertDialogTitle>
//                   <AlertDialogDescription>
//                     This action cannot be undone. This will permanently delete
//                     the employee.
//                   </AlertDialogDescription>
//                 </AlertDialogHeader>
//                 <AlertDialogFooter>
//                   <AlertDialogCancel onClick={() => setShowDeleteAlert(false)}>
//                     Cancel
//                   </AlertDialogCancel>
//                   <AlertDialogAction
//                     onClick={() => {
//                       handleDelete(selectedUserId!);
//                       setShowDeleteAlert(false);
//                     }}
//                   >
//                     Delete
//                   </AlertDialogAction>
//                 </AlertDialogFooter>
//               </AlertDialogContent>
//             </AlertDialog>
//           )}
//         </>
//       );
//     },
//   },
// ];

"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import axios from "axios";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { UserInterface } from "@/util/type";
import { Input } from "@/components/ui/input";

const renderCell = (value: any) => {
  return value ? value : "NA";
};

export const columns: ColumnDef<UserInterface>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ getValue }) => renderCell(getValue()),
  },
  {
    accessorKey: "phone",
    header: "Contact",
    cell: ({ getValue }) => renderCell(getValue()),
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Email
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ getValue }) => renderCell(getValue()),
  },
  {
    accessorKey: "nationality",
    header: "Nationality",
    cell: ({ getValue }) => renderCell(getValue()),
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ getValue }) => renderCell(getValue()),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const user = row.original;
      const [showDeleteAlert, setShowDeleteAlert] = useState(false);
      const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
      const [confirmationText, setConfirmationText] = useState("");

      const { toast } = useToast();

      const handleDelete = async (_id: string) => {
        try {
          const response = await axios.post(`/api/employee/deleteEmploye`, {
            _id,
          });
          toast({
            title: "Sucess !",
            description:
              "You have successfully deleted employee refresh the page to get the lates data",
          });
          window.location.reload();
        } catch (error: any) {
          console.log("Error deleting employee:", error);
          toast({
            variant: "destructive",
            title: "Error!",
            description: error.response?.data?.error || "An error occurred.",
          });
        }
      };

      return (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(user._id)}
              >
                Copy Id
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Link href={`/dashboard/edituserdetails/${user._id}`}>
                  Edit Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedUserId(user._id);
                  setShowDeleteAlert(true);
                  setConfirmationText(""); // Reset the confirmation text
                }}
              >
                Delete Employee
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Alert Dialog for Delete Confirmation */}
          {showDeleteAlert && (
            <AlertDialog
              open={showDeleteAlert}
              onOpenChange={setShowDeleteAlert}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    the employee.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                {/* Input for confirmation text */}
                <p className="text-xs">
                  write this <span className="text-primary text-base">"Yes i want to delete"</span> to active
                  delete button
                </p>
                <div className="mt-4">
                  <Input
                    type="text"
                    placeholder="Confirmation text"
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    className="w-full p-2 border rounded"
                  />
                </div>

                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setShowDeleteAlert(false)}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      if (confirmationText === "Yes i want to delete") {
                        handleDelete(selectedUserId!);
                        setShowDeleteAlert(false);
                      } else {
                        toast({
                          variant: "destructive",
                          title: "Error!",
                          description:
                            "You must type 'yes I want to delete' to proceed.",
                        });
                      }
                    }}
                    disabled={confirmationText !== "Yes i want to delete"}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </>
      );
    },
  },
];
