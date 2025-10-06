import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import axios from "axios";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

export function LeadSearch() {
  const router = useRouter();
  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.currentTarget);
      const phoneNo = formData.get("phoneNo") as string;
      const res = await axios.post("/api/leads/globalLeadSearch", { phoneNo });
      const data = res.data;
      if (data.leadStatus === "fresh") {
        router.push("/dashboard/rolebaseLead");
      } else if (data.leadStatus === "active") {
        router.push("/dashboard/goodtogoleads");
      } else if (data.leadStatus === "rejected") {
        router.push("/dashboard/rejectedleads");
      } else if (data.leadStatus === "declined") {
        router.push("/dashboard/declinedleads");
      }
    } catch (error) {
      console.log(error);
    }
  };
  return (
    <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Search />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
      <form onSubmit={handleSearch}>
          <DialogHeader>
            <DialogTitle>Search For Leads</DialogTitle>
            {/* <DialogDescription>
              Make changes to your profile here. Click save when you&apos;re
              done.
            </DialogDescription> */}
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3">
              <Label htmlFor="name-1" className="mt-1">Phone Number</Label>
              <Input
                id="phoneNo"
                name="phoneNo"
                placeholder="Please enter phone number"
              />
            </div>
          </div>
          <DialogFooter className="space-x-2 mt-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit">Search</Button>
          </DialogFooter>
      </form>
        </DialogContent>
    </Dialog>
  );
}
