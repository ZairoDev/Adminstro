"use client";

import type React from "react";
import { useRef, useState } from "react";
import { Dialog } from "@headlessui/react";
import { FileUp, PlusCircle, Trash2 } from "lucide-react";
import { useBunnyUpload } from "@/hooks/useBunnyUpload";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import type { InvoiceData, ComputedTotals } from "@/app/dashboard/invoice/page";
import { generateInvoicePdf, generateBookingPdf } from "./invoice-pdf";

export type Owner = {
  name: string;
  email: string;
  phoneNo: string;
  idNumber: string;
  documents: string[];
};

interface UploadCellProps {
  onUploadComplete?: (urls: string[]) => void;
  existingUrls?: string[];
}

export type BookingPdfData = {
  amount: number;
  finalPrice?: number;
  description?: string;
  bookingId?: string;
  booking_Id?: string;
  numberOfPeople?: number;
  propertyOwner?: string;
  address?: string;
  checkIn?: string;
  checkOut?: string;
  name?: string;
  email?: string;
  phone?: string;
  existingGuests?: Owner[];
  existingRentPayable?: number;
  existingDepositPaid?: number;
};

export default function InvoicePdfButton({
  value,
  computed,
  bookingData,
  mode = "invoice",
}: {
  value?: InvoiceData;
  computed?: ComputedTotals;
  bookingData?: BookingPdfData;
  mode?: "invoice" | "booking";
}) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [rentPayable, setRentPayable] = useState<number>(bookingData?.existingRentPayable ?? 0);
  const [depositPaid, setDepositPaid] = useState<number>(bookingData?.existingDepositPaid ?? 0);
  const [email, setEmail] = useState(bookingData?.email || "");
  const [address, setAddress] = useState(bookingData?.address || "");
  const [nationality, setNationality] = useState("");
  const [existingInvoiceNumber, setExistingInvoiceNumber] = useState<string | null>(null);
  const [owners, setOwners] = useState<Owner[]>(
    bookingData?.existingGuests && bookingData.existingGuests.length > 0
      ? bookingData.existingGuests
      : [{ 
          name: bookingData?.name || "", 
          email: bookingData?.email || "", 
          phoneNo: bookingData?.phone || "", 
          idNumber: "", 
          documents: [] 
        }]
  );

  const { toast } = useToast();

  const handleAddOwner = () => {
    setOwners((prev) => [
      ...prev,
      { name: "", email: "", phoneNo: "", idNumber: "", documents: [] },
    ]);
  };

  const handleRemoveOwner = (index: number) => {
    setOwners((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOwnerChange = (
    index: number,
    field: keyof Owner,
    value: string
  ) => {
    setOwners((prev) => {
      const next = [...prev];
      (next[index][field] as string) = value;
      return next;
    });
  };

  const handleDocumentsChange = (index: number, urls: string[]) => {
    setOwners((prev) => {
      const next = [...prev];
      next[index].documents = urls;
      return next;
    });
  };

  const handleDownload = async () => {
    if (mode === "booking") {
      // Check for existing invoice before opening dialog
      if (!existingInvoiceNumber && bookingData?.bookingId) {
        try {
          const checkResponse = await fetch(
            `/api/invoice/check?bookingId=${bookingData.bookingId}`
          );
          if (checkResponse.ok) {
            const checkResult = await checkResponse.json();
            if (checkResult.exists && checkResult.invoiceNumber) {
              setExistingInvoiceNumber(checkResult.invoiceNumber);
            }
          }
        } catch (error) {
          console.error("Error checking for existing invoice:", error);
        }
      }
      setOpen(true);
    } else if (value && computed) {
      generateInvoicePdf(value, computed);
    }
  };

  const handleGeneratePdfs = async () => {
    if (!bookingData) return;
    
    setLoading(true);
    try {
      let generatedInvoiceNumber = existingInvoiceNumber;

      // Only create invoice in database if it doesn't exist yet
      if (!existingInvoiceNumber) {
        // Prepare invoice data for database
        const invoicePayload = {
          name: owners[0]?.name || bookingData.name || "",
          email: owners[0]?.email || bookingData.email || "",
          phoneNumber: owners[0]?.phoneNo || bookingData.phone || "",
          address: address || "",
          nationality: nationality || "Not specified",
          amount: bookingData.amount,
          sgst: 0,
          igst: 0,
          cgst: 0,
          totalAmount: bookingData.amount,
          status: (bookingData.finalPrice ?? 0) >= bookingData.amount ? "paid" : "unpaid",
          date: new Date(),
          checkIn: bookingData.checkIn ? new Date(bookingData.checkIn) : null,
          checkOut: bookingData.checkOut ? new Date(bookingData.checkOut) : null,
          bookingType: "Booking Commission",
          companyAddress: "117/N/70, 3rd Floor Kakadeo, Kanpur - 208025, UP, India",
          sacCode: 9985,
          description: bookingData.description || "",
          bookingId: bookingData.bookingId || bookingData.booking_Id,
        };

        // Create invoice in database to get auto-incremented invoice number
        const invoiceResponse = await fetch("/api/invoice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(invoicePayload),
        });

        if (!invoiceResponse.ok) {
          throw new Error("Failed to create invoice in database");
        }

        const invoiceResult = await invoiceResponse.json();
        
        if (!invoiceResult.success) {
          throw new Error(invoiceResult.error || "Failed to create invoice");
        }

        generatedInvoiceNumber = invoiceResult.invoiceNumber;
        setExistingInvoiceNumber(generatedInvoiceNumber);

        // Show message if invoice already existed
        if (invoiceResult.alreadyExists) {
          toast({
            title: "Invoice Already Exists",
            description: `Using existing invoice: ${generatedInvoiceNumber}`,
          });
        }
      }

      // Generate Booking Confirmation PDF
      await generateBookingPdf({
        amount: bookingData.amount,
        finalPrice: bookingData.finalPrice,
        description: bookingData.description,
        bookingId: bookingData.bookingId,
        booking_Id: bookingData.booking_Id,
        numberOfPeople: bookingData.numberOfPeople,
        propertyOwner: bookingData.propertyOwner,
        address,
        checkIn: bookingData.checkIn,
        checkOut: bookingData.checkOut,
        guests: owners.map((o) => ({
          name: o.name,
          email: o.email,
          phone: o.phoneNo,
          phoneNo: o.phoneNo,
          idNumber: o.idNumber,
        })),
        rentPayable,
        depositPaid,
      });

      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate Invoice PDF with the invoice number from database
      const invoiceData: InvoiceData = {
        name: owners[0]?.name || bookingData.name || "",
        email: owners[0]?.email || bookingData.email || "",
        phoneNumber: owners[0]?.phoneNo || bookingData.phone || "",
        address: address || "",
        amount: bookingData.amount,
        sgst: 0,
        igst: 0,
        cgst: 0,
        totalAmount: bookingData.amount,
        status: (bookingData.finalPrice ?? 0) >= bookingData.amount ? "paid" : "unpaid",
        date: new Date().toISOString().split("T")[0],
        nationality: nationality || "Not specified",
        checkIn: bookingData.checkIn || "",
        checkOut: bookingData.checkOut || "",
        bookingType: "Booking Commission",
        companyAddress: "117/N/70, 3rd Floor Kakadeo, Kanpur - 208025, UP, India",
        invoiceNumber: generatedInvoiceNumber || "N/A",
        sacCode: 9985,
        description: bookingData.description || "",
      };

      const computedTotals: ComputedTotals = {
        subTotal: bookingData.amount,
        total: bookingData.amount,
        taxes: {
          sgst: 0,
          igst: 0,
          cgst: 0,
        },
      };

      generateInvoicePdf(invoiceData, computedTotals);

      if (!existingInvoiceNumber) {
        toast({
          title: "Success",
          description: `PDFs generated successfully. New invoice created: ${generatedInvoiceNumber}`,
        });
      } else {
        toast({
          title: "Success",
          description: `PDFs downloaded successfully. Invoice: ${generatedInvoiceNumber}`,
        });
      }

      setOpen(false);
    } catch (error: any) {
      console.error("Error generating PDFs:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to generate PDFs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  function UploadCell({ onUploadComplete, existingUrls = [] }: UploadCellProps) {
    const { uploadFiles, loading } = useBunnyUpload();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploaded, setUploaded] = useState(existingUrls.length > 0);

    const handleFileChange = async (
      event: React.ChangeEvent<HTMLInputElement>
    ) => {
      const input = event.target;
      const files = input.files;
      if (!files || files.length === 0) return;

      const fileArray = Array.from(files);

      const { imageUrls, error } = await uploadFiles(
        fileArray,
        "GuestDocuments"
      );

      if (error) {
        toast({
          title: "Upload failed",
          description: error,
          variant: "destructive",
        });
        return;
      }

      const allUrls = [...existingUrls, ...imageUrls];
      setUploaded(true);

      if (onUploadComplete) onUploadComplete(allUrls);

      toast({
        title: "Files uploaded successfully",
        description: `${imageUrls.length} file(s) uploaded.`,
      });

      input.value = "";
    };

    return (
      <>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
          onChange={handleFileChange}
        />
        <Button
          variant="ghost"
          size="icon"
          className="p-0"
          disabled={loading}
          onClick={() => fileInputRef.current?.click()}
        >
          <FileUp
            className={`h-5 w-5 ${
              uploaded ? "text-green-500" : "text-gray-500"
            }`}
          />
          <span className="sr-only">Upload documents</span>
        </Button>
      </>
    );
  }

  return (
    <>
      <Button size="sm" onClick={handleDownload} disabled={loading}>
        {loading ? "Processing..." : "Download PDF"}
      </Button>

      {mode === "booking" && (
        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          className="relative z-50"
        >
          <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-lg rounded-2xl bg-stone-900 p-6 shadow-lg max-h-[90vh] overflow-y-auto">
              <Dialog.Title className="text-xl font-semibold mb-4">
                Download Booking PDFs
              </Dialog.Title>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Customer Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Property Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter property address"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Nationality
                </label>
                <input
                  type="text"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  placeholder="Enter nationality (e.g., Indian, American)"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">
                    Rent Payable (€)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={rentPayable}
                    onChange={(e) =>
                      setRentPayable(Math.max(0, Number(e.target.value) || 0))
                    }
                    placeholder="Enter rent payable amount"
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">
                    Deposit Paid (€)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={depositPaid}
                    onChange={(e) =>
                      setDepositPaid(Math.max(0, Number(e.target.value) || 0))
                    }
                    placeholder="Enter deposit paid amount"
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="text-sm font-medium mb-2 flex items-center justify-between">
                  Guest(s) Details
                  <button
                    type="button"
                    onClick={handleAddOwner}
                    className="text-blue-500 hover:text-blue-600 flex items-center gap-1 text-sm"
                  >
                    <PlusCircle size={16} /> Add Guest
                  </button>
                </label>

                <div className="flex flex-col gap-3">
                  {owners.map((owner, index) => (
                    <div
                      key={index}
                      className="p-3 border rounded-md bg-stone-800 relative"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                        <input
                          type="text"
                          value={owner.name}
                          onChange={(e) =>
                            handleOwnerChange(index, "name", e.target.value)
                          }
                          placeholder="Guest name"
                          className="rounded-md border px-3 py-2 text-sm"
                        />
                        <input
                          type="email"
                          value={owner.email}
                          onChange={(e) =>
                            handleOwnerChange(index, "email", e.target.value)
                          }
                          placeholder="Guest email"
                          className="rounded-md border px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={owner.phoneNo}
                          onChange={(e) =>
                            handleOwnerChange(index, "phoneNo", e.target.value)
                          }
                          placeholder="Phone number"
                          className="rounded-md border px-3 py-2 text-sm"
                        />
                        <input
                          type="text"
                          value={owner.idNumber}
                          onChange={(e) =>
                            handleOwnerChange(index, "idNumber", e.target.value)
                          }
                          placeholder="ID Number"
                          className="rounded-md border px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <UploadCell
                          existingUrls={owner.documents}
                          onUploadComplete={(urls) =>
                            handleDocumentsChange(index, urls)
                          }
                        />
                        {owner.documents.length ? (
                          <span className="text-xs text-green-400">
                            {owner.documents.length} file(s) attached
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">
                            Attach documents
                          </span>
                        )}
                      </div>
                      {owners.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOwner(index)}
                          className="absolute top-2 right-2 text-red-500 hover:text-red-600"
                          aria-label="Remove guest"
                          title="Remove guest"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleGeneratePdfs} disabled={loading}>
                  {loading ? "Generating..." : "Generate PDFs"}
                </Button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}
    </>
  );
}
