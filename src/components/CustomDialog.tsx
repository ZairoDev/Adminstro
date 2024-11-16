"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "./ui/textarea";
import { Image } from "lucide-react";
import uploadImagesToBunny from "@/helper/uploadImagesToBunny";
import { useEffect, useRef, useState } from "react";

interface DialogProps {
  buttonText: string;
}

export function CustomDialog({ buttonText }: DialogProps) {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [propertyName, setPropertyName] = useState("");

  const ownerNameRef = useRef<HTMLInputElement>(null);
  const ownerMobileRef = useRef<HTMLInputElement>(null);
  const propertyAddressRef = useRef<HTMLInputElement>(null);
  const propertyDescriptionRef = useRef<HTMLTextAreaElement>(null);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">{buttonText}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Add Property</DialogTitle>
          <DialogDescription>
            Add a mini Lisitng if the property is not already available in the
            database
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-between items-end">
          <div className="">
            <Label htmlFor="name" className="text-right">
              Owner&apos; Name
            </Label>
            <Input
              id="name"
              placeholder="Enter owner name"
              className="col-span-3"
              ref={ownerNameRef}
            />
          </div>
          <div className="">
            <Label htmlFor="username" className="text-right">
              Owner&apos; Mobile
            </Label>
            <Input
              id="username"
              placeholder="Enter mobile number"
              className="col-span-3"
              ref={ownerMobileRef}
            />
          </div>
          <Button
            disabled={
              !!ownerNameRef.current?.value && !!ownerMobileRef.current?.value
            }
          >
            Verify
          </Button>
        </div>
        <div>
          <Label htmlFor="propertyName">Property Name</Label>
          <Input
            type="text"
            id="propertyName"
            onChange={(e) => setPropertyName(e.target.value)}
          />
        </div>
        <div className="flex gap-x-4 items-start">
          <div>
            <div className=" border border-slate-800 rounded-lg w-32 h-32 text-sm flex flex-col justify-center items-center">
              {" "}
              <Image size={32} />
              <label
                htmlFor="file-upload-2"
                className={`relative cursor-pointer  rounded-md font-medium text-primary-6000 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500 ${
                  propertyName === "" ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <span className=" text-center ">Upload Images</span>
                <input
                  id="file-upload-2"
                  name="file-upload-2"
                  type="file"
                  className="sr-only"
                  multiple
                  accept="image/*"
                  onChange={(e) =>
                    uploadImagesToBunny({
                      event: e,
                      propertyName,
                      imageUrls,
                      setImageUrls,
                    })
                  }
                  disabled={propertyName === ""}
                />
              </label>
            </div>
            <div>
              <Label htmlFor="price" className="text-right">
                Price
              </Label>
              <Input
                type="number"
                id="price"
                placeholder="Enter Price"
                className="col-span-3"
                ref={ownerMobileRef}
              />
            </div>
          </div>
          <div className=" w-full">
            <div>
              <Label htmlFor="desc">Description</Label>
              <Textarea
                id="desc"
                placeholder="Enter the description of Property"
                ref={propertyDescriptionRef}
              />
            </div>
            <div className="">
              <Label htmlFor="Address" className="text-right">
                Address
              </Label>
              <Input
                id="Address"
                placeholder="Enter Property address"
                className="col-span-3"
                ref={propertyAddressRef}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit">Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
