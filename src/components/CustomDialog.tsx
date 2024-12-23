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
import {
  Copy,
  Image,
  LucideLoader2,
  SquareArrowOutUpRight,
} from "lucide-react";
import uploadImagesToBunny from "@/helper/uploadImagesToBunny";
import { useRef, useState } from "react";
import axios from "axios";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "./ui/context-menu";
import Link from "next/link";
import toast from "react-hot-toast";
import { QuickListingInterface } from "@/util/type";

interface DialogProps {
  roomId: string;
  setQuickListingProp: (quickListing: QuickListingInterface) => void;
}

export function CustomDialog({ roomId, setQuickListingProp }: DialogProps) {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [propertyName, setPropertyName] = useState("");
  const ownerNameRef = useRef<HTMLInputElement>(null);
  const [mobile, setMobile] = useState("");
  const propertyAddressRef = useRef<HTMLInputElement>(null);
  const propertyDescriptionRef = useRef<HTMLTextAreaElement>(null);
  const propertyPriceRef = useRef<HTMLInputElement>(null);
  const propertyCityRef = useRef<HTMLInputElement>(null);
  const propertyCountryRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [userProperties, setUserProperties] = useState<
    { propertyId: string; propertyImages: string[] }[]
  >([]);
  const [quickListing, setQuickListing] = useState<QuickListingInterface>();

  const getPropertiesOfUser = async () => {
    if (!ownerNameRef.current?.value || !mobile) return;
    setIsLoading(true);
    try {
      const response = await axios.post("/api/room/getPropertiesOfUser", {
        userName: ownerNameRef.current?.value.trim(),
        userMobile: mobile.trim(),
      });
      setUserProperties(response.data);
    } catch (err: unknown) {
      setUserProperties([]);
    } finally {
      setIsLoading(false);
    }
  };

  const createQuickListing = async () => {
    if (
      !roomId ||
      !ownerNameRef.current?.value ||
      !mobile ||
      !propertyName ||
      !imageUrls ||
      !propertyDescriptionRef.current?.value ||
      !propertyPriceRef.current?.value ||
      !propertyCityRef.current?.value ||
      !propertyCountryRef.current?.value ||
      !propertyAddressRef.current?.value
    )
      return;
    try {
      setIsLoading(true);
      const response = await axios.post("/api/room/createQuickListing", {
        roomId: roomId,
        ownerName: ownerNameRef.current?.value,
        ownerMobile: mobile,
        propertyName: propertyName,
        propertyImages: imageUrls,
        propertyDescription: propertyDescriptionRef.current?.value,
        propertyPrice: propertyPriceRef.current?.value,
        propertyCity: propertyCityRef.current?.value,
        propertyCountry: propertyCountryRef.current?.value,
        propertyAddress: propertyAddressRef.current?.value,
      });
      setQuickListing(response.data);
      setQuickListingProp(response.data);
    } catch (err: unknown) {
      toast.error("Unable to create quick listing");
    } finally {
      setIsLoading(false);
    }
  };

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="outline">Add Property</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[550px]">
				<DialogHeader>
					<DialogTitle>Add Property</DialogTitle>
					<DialogDescription>
						Add a quick Lisitng if the property is not already
						available in the database
					</DialogDescription>
				</DialogHeader>
				<div className="flex gap-x-2 justify-between w-full items-end">
					<div className=" ">
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
					
					<div className="w-full  ">
						<Label htmlFor="phone">Phone Number</Label>
						<div className="flex items-center gap-2">
						<PhoneInput
							className="phone-input w-full border-red-500"
							placeholder="Enter phone number"
							international
							countryCallingCodeEditable={false}
							error={"Phone number required"}
							onChange={(value) => {
								setMobile(value?.toString() || "");
							}}
						/>
						<Button onClick={getPropertiesOfUser}>
						{isLoading
							? "Verifying..."
							: !isLoading && userProperties.length > 0
							? "✔"
							: "Verify"}
					</Button>
						</div>
						
					</div>
					
					
					
				</div>
				{userProperties?.length > 0 && (
					<ScrollArea className="whitespace-nowrap rounded-md border w-full">
						<div className="flex w-max space-x-4 p-4">
							{userProperties?.map((property) => {
								return (
									<figure
										key={property.propertyId}
										className="shrink-0"
									>
										<div className="overflow-hidden rounded-md">
											<ContextMenu>
												<ContextMenuTrigger className=" flex items-center justify-center rounded-md border border-dashed text-sm">
													<img
														src={
															property
																?.propertyImages[0]
														}
														alt={`availableImages`}
														className=" w-28 h-28 cursor-pointer"
													/>
												</ContextMenuTrigger>
												<ContextMenuContent>
													<Link
														href={{
															pathname: `https://www.vacationsaga.com/listing-stay-detail/${property.propertyId}`,
														}}
														target="_blank"
													>
														<ContextMenuItem className=" flex gap-x-2 cursor-pointer">
															View Property
															<ContextMenuShortcut>
																<SquareArrowOutUpRight
																	size={18}
																/>
															</ContextMenuShortcut>
														</ContextMenuItem>
													</Link>
													<ContextMenuItem
														className=" flex gap-x-2 cursor-pointer"
														onClick={() => {
															navigator.clipboard
																.writeText(
																	property.propertyId
																)
																.then(() => {
																	alert(
																		`Property Id is copied: ${property.propertyId}`
																	);
																});
														}}
													>
														Copy Id
														<ContextMenuShortcut>
															<Copy size={18} />
														</ContextMenuShortcut>
													</ContextMenuItem>
												</ContextMenuContent>
											</ContextMenu>
										</div>
									</figure>
								);
							})}
						</div>
						<ScrollBar orientation="horizontal" />
					</ScrollArea>
				)}
				<div>
					<Label htmlFor="propertyName">Property Name</Label>
					<Input
						type="text"
						id="propertyName"
						onChange={(e) => setPropertyName(e.target.value)}
					/>
				</div>
				<div className="flex justify-between">
					<div className=" border border-slate-800 rounded-lg w-32 h-32 text-sm flex flex-col justify-center items-center">
						{" "}
						<Image size={32} className=" absolute" />
						<label
							htmlFor="file-upload-2"
							className={`relative cursor-pointer w-full h-full  rounded-md font-medium text-primary-6000 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500 ${
								propertyName === ""
									? "opacity-50 cursor-not-allowed"
									: ""
							}`}
						>
							<span className=" text-center absolute top-2/3 left-2">
								Upload Images
							</span>
							<input
								id="file-upload-2"
								name="file-upload-2"
								type="file"
								className="sr-only absolute"
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
							<img
								src={imageUrls[0]}
								className=" opacity-50 h-full w-full"
							/>
						</label>
					</div>
					<div className=" w-2/3 h-full">
						<Label htmlFor="desc">Description</Label>
						<Textarea
							id="desc"
							placeholder="Enter the description of Property"
							ref={propertyDescriptionRef}
							className=" h-24"
						/>
					</div>
				</div>
				<div className=" flex w-full justify-between gap-x-2">
					<div>
						<Label htmlFor="price" className="text-right">
							Price
						</Label>
						<Input
							type="number"
							id="price"
							placeholder="Enter Price"
							className="col-span-3"
							ref={propertyPriceRef}
						/>
					</div>
					<div>
						<Label htmlFor="city" className="text-right">
							City
						</Label>
						<Input
							type="text"
							id="city"
							placeholder="Enter city"
							className="col-span-3"
							ref={propertyCityRef}
						/>
					</div>
					<div>
						<Label htmlFor="country" className="text-right">
							Country
						</Label>
						<Input
							type="text"
							id="country"
							placeholder="Enter Country"
							className="col-span-3"
							ref={propertyCountryRef}
						/>
					</div>
				</div>
				<div className=" w-full">
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
				<DialogFooter>
					<Button
						onClick={createQuickListing}
						disabled={!!quickListing}
					>
						{quickListing ? (
							quickListing.QID
						) : isLoading ? (
							<LucideLoader2 className=" animate-spin" />
						) : (
							"Save changes"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
