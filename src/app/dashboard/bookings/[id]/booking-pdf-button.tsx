"use client";

import { Button } from "@/components/ui/button";
import {
  PDFDocument,
  StandardFonts,
  rgb,
} from "pdf-lib";

export type Owner = {
  name: string;
  email: string;
  phone?: string;
  phoneNo?: string;
  idNumber?: string;
  documents?: string[];
};

type BookingPdfData = {
  amount: number;
  finalPrice?: number;
  description?: string;
  bookingId?: string;
  booking_Id?: string;
  guests?: Owner[];
  numberOfPeople?: number;
  propertyOwner?: string;
  address?: string;
  checkIn?: string;
  checkOut?: string;
  paymentType?: string;
  partialAmount?: number;
  rentPayable?: number;
  depositPaid?: number;
};

export default function BookingPdfButton({ value }: { value: BookingPdfData }) {
  const handleDownload = async () => {
    try {
      const pdfDoc = await PDFDocument.create();
      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const page = pdfDoc.addPage([pageWidth, pageHeight]);

      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      let y = pageHeight - 100;
      const baseFontSize = 12;
      const gray = (v: number) => rgb(v, v, v);
      const brand = rgb(1, 0.55, 0);

      const drawCentered = (
        text: string,
        size = baseFontSize,
        useBold = false,
        color = rgb(0, 0, 0)
      ) => {
        const usedFont = useBold ? bold : font;
        const textWidth = usedFont.widthOfTextAtSize(text, size);
        const x = (pageWidth - textWidth) / 2;
        page.drawText(text, { x, y, size, font: usedFont, color });
        y -= size + 8;
      };

      const drawLabelValue = (label: string, value: string) => {
        const leftX = 50;
        const gapX = 200;
        page.drawText(label, { x: leftX, y, size: baseFontSize, font: bold });
        page.drawText(value || "-", { x: gapX, y, size: baseFontSize, font });
        y -= baseFontSize + 8;
      };

      // === Header Banner ===
      const bannerHeight = 90;
      page.drawRectangle({
        x: 0,
        y: pageHeight - bannerHeight,
        width: pageWidth,
        height: bannerHeight,
        color: brand,
      });

      // === Logo ===
      try {
        const logoResponse = await fetch("/vs.png");
        if (logoResponse.ok) {
          const logoBuffer = await logoResponse.arrayBuffer();
          const logoImage = await pdfDoc.embedPng(new Uint8Array(logoBuffer));
          const scale = Math.min(160 / logoImage.width, 60 / logoImage.height);
          const w = logoImage.width * scale;
          const h = logoImage.height * scale;
          page.drawImage(logoImage, {
            x: (pageWidth - w) / 2,
            y: pageHeight - bannerHeight + (bannerHeight - h) / 2,
            width: w,
            height: h,
          });
        }
      } catch (err) {
        console.warn("Logo not found, skipping:", err);
      }

      y = pageHeight - bannerHeight - 40;
      drawCentered("Booking Confirmation", 18, true);

      page.drawRectangle({
        x: 50,
        y: y + 6,
        width: pageWidth - 100,
        height: 1,
        color: gray(0.75),
      });
      y -= 18;

      // === Booking Details ===
      drawLabelValue("Booking ID", value.booking_Id ?? "-");
      drawLabelValue("Total Amount ", `€${value.amount}`);
      drawLabelValue(
        "Paid Amount ",
        `€${value.finalPrice?.toFixed(2) ?? "0.00"}`
      );
      if (value.rentPayable !== undefined) {
        drawLabelValue("Rent Payable", `€${value.rentPayable.toFixed(2)}`);
      }
      if (value.depositPaid !== undefined) {
        drawLabelValue("Deposit Paid", `€${value.depositPaid.toFixed(2)}`);
      }
      drawLabelValue(
        "Number of People",
        value.numberOfPeople ? String(value.numberOfPeople) : "-"
      );
      drawLabelValue("Description", value.description || "-");
      drawLabelValue("Property Owner", value.propertyOwner || "-");
      drawLabelValue("Address", value.address || "-");
      drawLabelValue("Check-in", value.checkIn || "-");
      drawLabelValue("Check-out", value.checkOut || "-");
      y -= 20;

      // === Guests Section ===
      if (value.guests && value.guests.length > 0) {
        page.drawText("Guest(s) Details:", {
          x: 50,
          y,
          size: baseFontSize + 1,
          font: bold,
        });
        y -= baseFontSize + 6;

        value.guests.forEach((guest, i) => {
          drawLabelValue(`Guest ${i + 1} Name`, guest.name);
          drawLabelValue(`Email`, guest.email);
          drawLabelValue(`Phone`, guest.phoneNo || guest.phone || "-");
          drawLabelValue(`ID Number`, guest.idNumber || "-");
          y -= 10;
        });
        y -= 10;
      }

      y -= 20;

      // === Company Info ===
      const infoLines = [
        "Website: www.vacationsaga.com",
        "Company: ZAIRO INTERNATIONAL PRIVATE LIMITED",
        "CIN: U93090UP2017PTC089137",
        "Email: info@vacationsaga.com / support@vacationsaga.com",
        "Concerned Person: Miss. Ankita Nigam",
      ];

      infoLines.forEach((t) => {
        page.drawText(t, { x: 50, y, size: 10, font, color: gray(0.2) });
        y -= 14;
      });

      y -= 20;
      page.drawText("Signature:", { x: 50, y, size: baseFontSize, font: bold });
      y -= 36;

      // === Signature Image ===
      try {
        const signResponse = await fetch("/sign.png");
        if (signResponse.ok) {
          const signBuffer = await signResponse.arrayBuffer();
          const img = await pdfDoc.embedPng(new Uint8Array(signBuffer));
          const s = Math.min(140 / img.width, 60 / img.height);
          const w = img.width * s;
          const h = img.height * s;
          page.drawImage(img, { x: 50, y, width: w, height: h });
          y -= h + 10;
        }
      } catch (err) {
        console.warn("Signature image not found:", err);
      }

      const pdfBytes = await pdfDoc.save();
      
      // Download PDF
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `booking-${value.booking_Id || "details"}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  return (
    <Button size="sm" onClick={handleDownload}>
      Download PDF
    </Button>
  );
}
