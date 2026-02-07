/**
 * =============================================================================
 * PDF GENERATION - Offer Letter (Appointment Letter)
 * =============================================================================
 * 
 * This module generates a professional PDF document for employee offer letter.
 * 
 * LAYOUT ENGINE OVERVIEW:
 * -----------------------
 * The PDF uses a DETERMINISTIC cursor-based pagination system similar to onboarding document.
 */

import axios from "axios";
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb, PDFImage } from "pdf-lib";

type Payload = {
  // Document date
  letterDate: string;
  
  // Employee info
  employeeName: string;
  employeeFullName: string; // Full name for signature section
  
  // Company info
  companyName?: string;
  companyAddress?: string;
  authorizedSignatoryName?: string;
  authorizedSignatoryDesignation?: string;
  
  // Appointment details
  designation: string;
  dateOfJoining: string;
  postingLocation: string;
  workingHoursStart?: string;
  workingHoursEnd?: string;
  annualCTC: string;
  salaryPaymentCycle?: string;
  probationPeriod?: string;
  
  // Signature image URL (optional)
  signatureBase64?: string;
};

async function getBase64FromPublic(relativePath: string) {
  const filePath = path.join(process.cwd(), "public", relativePath);
  const fileData = await fs.readFile(filePath);
  return fileData.toString("base64");
}

function drawFullWidthSectionHeading(
  title: string,
  page: PDFPage,
  font: PDFFont,
  yPosRef: { value: number },
  leftMargin: number,
  rightMargin: number,
  sectionFontSize: number,
  pageWidth: number
) {
  const textHeight = font.heightAtSize(sectionFontSize);
  const paddingY = 8;
  const paddingX = 10;

  const rectX = leftMargin;
  const rectY = yPosRef.value - textHeight - paddingY;
  const rectW = pageWidth - leftMargin - rightMargin;
  const rectH = textHeight + paddingY * 2;

  page.drawRectangle({
    x: rectX,
    y: rectY,
    width: rectW,
    height: rectH,
    color: rgb(0.9, 0.9, 0.9),
  });

  page.drawText(title, {
    x: rectX + paddingX,
    y: rectY + paddingY,
    size: sectionFontSize,
    font,
    color: rgb(0, 0, 0),
  });

  yPosRef.value = rectY - 20;
}

export async function POST(req: NextRequest) {
  try {
    const data = (await req.json()) as Payload;

    // CRITICAL: Convert signature image URL → Base64 if provided
    let signatureBase64: string | undefined;
    if (data.signatureBase64) {
      try {
        let imageBuffer: Buffer;
        
        if (data.signatureBase64.startsWith("data:")) {
          const base64Match = data.signatureBase64.match(/^data:image\/\w+;base64,(.+)$/);
          if (base64Match && base64Match[1]) {
            signatureBase64 = base64Match[1];
          } else {
            throw new Error("Invalid data URL format");
          }
        } else {
          const sigRes = await axios.get(data.signatureBase64, {
            responseType: "arraybuffer",
            timeout: 10000,
          });
          imageBuffer = Buffer.from(sigRes.data);
          signatureBase64 = imageBuffer.toString("base64");
        }
        
        console.log("Signature successfully processed for PDF embedding");
      } catch (err) {
        console.error("Error processing signature for PDF:", err);
        signatureBase64 = undefined;
      }
    }

    // Defaults
    const companyName = data.companyName ?? "Zairo International Private Limited";
    const companyAddress = data.companyAddress ?? "117/N/70 3rd Floor Kakadeo, Kanpur 208025";
    const authorizedSignatoryName = data.authorizedSignatoryName ?? "Ankita Nigam";
    const authorizedSignatoryDesignation = data.authorizedSignatoryDesignation ?? "COO";
    const workingHoursStart = data.workingHoursStart ?? "11:30 AM";
    const workingHoursEnd = data.workingHoursEnd ?? "8:30 PM";
    const salaryPaymentCycle = data.salaryPaymentCycle ?? "15th to 18th";
    const probationPeriod = data.probationPeriod ?? "six (6) months";

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    // Layout constants
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const leftMargin = 72;
    const rightMargin = 72;
    const topMargin = 56;
    const bottomMargin = 40;
    const footerZoneHeight = 70;
    const effectiveBottomMargin = bottomMargin + footerZoneHeight;
    const contentWidth = pageWidth - leftMargin - rightMargin;
    const printableHeight = pageHeight - topMargin - effectiveBottomMargin;

    // Typography constants
    const lineHeight = 14;
    const paragraphSpacing = 12;
    const titleSize = 16;
    const bodySize = 11;
    const sectionSize = 11;
    const footerSize = 10;
    const textColor = rgb(0, 0, 0);
    const headerHeight = 30;

    // Date validation
    const parseAndValidateDate = (dateString: string | undefined): { day: number; monthName: string; year: number } | null => {
      if (!dateString) return null;
      const parsed = new Date(dateString);
      if (isNaN(parsed.getTime())) return null;
      return {
        day: parsed.getDate(),
        monthName: parsed.toLocaleString("en-US", { month: "long" }),
        year: parsed.getFullYear()
      };
    };

    const parsedLetterDate = parseAndValidateDate(data.letterDate);
    const parsedJoiningDate = parseAndValidateDate(data.dateOfJoining);
    
    const letterDay = parsedLetterDate?.day ?? "";
    const letterMonthName = parsedLetterDate?.monthName ?? "";
    const letterYear = parsedLetterDate?.year ?? "";
    
    const joiningDay = parsedJoiningDate?.day ?? "";
    const joiningMonthName = parsedJoiningDate?.monthName ?? "";
    const joiningYear = parsedJoiningDate?.year ?? "";

    // Sanitize text function
    const sanitizeTextForPdf = (text: string): string => {
      if (!text) return text;
      return text
        .replace(/[\r\n]+/g, " ")
        .replace(/\t/g, " ")
        .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[""]/g, '"')
        .replace(/['']/g, "'")
        .replace(/[–—]/g, "-")
        .replace(/…/g, "...")
        .split("")
        .map(char => {
          const code = char.charCodeAt(0);
          if (code >= 32 && code <= 126) return char;
          if (code >= 128 && code <= 255) return char;
          return " ";
        })
        .join("")
        .replace(/\s+/g, " ")
        .trim();
    };

    // Pagination engine
    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    let pageNumber = 1;
    let totalPages = 1;
    let yPosition = pageHeight - topMargin - headerHeight;

    const getRemainingSpace = (): number => {
      return yPosition - effectiveBottomMargin;
    };

    const needsPageBreak = (requiredHeight: number): boolean => {
      return getRemainingSpace() < requiredHeight;
    };

    const addNewPage = () => {
      pageNumber++;
      totalPages = pageNumber;
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      yPosition = pageHeight - topMargin - headerHeight;
      drawPageHeader();
    };

    const drawPageHeader = () => {
      currentPage.drawText(`Page ${pageNumber} of ${totalPages}`, {
        x: leftMargin,
        y: pageHeight - topMargin + 10,
        size: footerSize,
        font: font,
        color: textColor,
      });
    };

    // Text rendering function
    const drawWrappedText = (
      text: string,
      x: number,
      fontSize: number = bodySize,
      boldFont: boolean = false,
      indent: number = 0,
      justify: boolean = true
    ): number => {
      text = sanitizeTextForPdf(text);
      const xOffset = Math.max(0, x - leftMargin);
      const maxWidth = Math.max(contentWidth - xOffset - indent, 0);
      const selectedFont = boldFont ? fontBold : font;
      const words = text.split(" ").map(word => sanitizeTextForPdf(word)).filter(word => word.length > 0);
      const lines: string[] = [];
      let currentLine = "";

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        let testWidth: number;
        try {
          testWidth = selectedFont.widthOfTextAtSize(testLine, fontSize);
        } catch (error) {
          const sanitizedTestLine = sanitizeTextForPdf(testLine);
          try {
            testWidth = selectedFont.widthOfTextAtSize(sanitizedTestLine, fontSize);
          } catch (retryError) {
            testWidth = sanitizedTestLine.length * fontSize * 0.5;
          }
        }

        if (testWidth > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        lines.push(currentLine);
      }

      const blockHeight = lines.length * lineHeight;

      if (needsPageBreak(blockHeight)) {
        addNewPage();
      }

      let totalHeight = 0;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const isLastLine = i === lines.length - 1;

        if (getRemainingSpace() < lineHeight) {
          addNewPage();
        }

        const renderX = x + indent;
        const renderY = yPosition - lineHeight;

        if (justify && !isLastLine && line.includes(" ")) {
          const wordsInLine = line.split(" ").map(word => sanitizeTextForPdf(word)).filter(word => word.length > 0);
          const totalWordWidth = wordsInLine.reduce((acc, word) => {
            try {
              return acc + selectedFont.widthOfTextAtSize(word, fontSize);
            } catch (error) {
              return acc + (word.length * fontSize * 0.5);
            }
          }, 0);
          const totalSpaceWidth = maxWidth - totalWordWidth;
          const spaceWidth = wordsInLine.length > 1 ? totalSpaceWidth / (wordsInLine.length - 1) : 0;

          let currentX = renderX;
          for (let j = 0; j < wordsInLine.length; j++) {
            const word = wordsInLine[j];
            try {
              currentPage.drawText(word, {
                x: currentX,
                y: renderY,
                size: fontSize,
                font: selectedFont,
                color: textColor,
              });
              currentX += selectedFont.widthOfTextAtSize(word, fontSize) + spaceWidth;
            } catch (error) {
              const sanitizedWord = sanitizeTextForPdf(word);
              currentPage.drawText(sanitizedWord, {
                x: currentX,
                y: renderY,
                size: fontSize,
                font: selectedFont,
                color: textColor,
              });
              currentX += (sanitizedWord.length * fontSize * 0.5) + spaceWidth;
            }
          }
        } else {
          const sanitizedLine = sanitizeTextForPdf(line);
          currentPage.drawText(sanitizedLine, {
            x: renderX,
            y: renderY,
            size: fontSize,
            font: selectedFont,
            color: textColor,
          });
        }

        yPosition -= lineHeight;
        totalHeight += lineHeight;
      }

      return totalHeight;
    };

    const ensureSpace = (requiredHeight: number) => {
      if (needsPageBreak(requiredHeight)) {
        addNewPage();
      }
    };

    // Draw initial page header
    drawPageHeader();

    // Title: APPOINTMENT LETTER
    ensureSpace(titleSize + 20);
    currentPage.drawText("APPOINTMENT LETTER", {
      x: leftMargin,
      y: yPosition,
      size: titleSize,
      font: fontBold,
      color: textColor,
    });
    yPosition -= titleSize + 20;

    // Date
    drawWrappedText(
      `Date: ${letterDay ? `${letterDay}${getOrdinalSuffix(letterDay)}` : "____"} ${letterMonthName || "___________"} ${letterYear || "____"}`,
      leftMargin,
      bodySize
    );
    yPosition -= paragraphSpacing;

    // Employee name
    drawWrappedText(
      `Mr. ${data.employeeName || "_____________"}`,
      leftMargin,
      bodySize
    );
    yPosition -= paragraphSpacing;

    // Subject
    drawWrappedText(
      "Subject: Appointment Letter",
      leftMargin,
      bodySize
    );
    yPosition -= paragraphSpacing * 2;

    // Greeting
    drawWrappedText(
      `Dear ${data.employeeFullName || data.employeeName || "_____________"}`,
      leftMargin,
      bodySize
    );
    yPosition -= paragraphSpacing * 2;

    // Opening paragraph
    drawWrappedText(
      `With reference to your application and the subsequent interview held with us, we are pleased to appoint you as ${data.designation || "_____________"} with ${companyName}, on the following terms and conditions:`,
      leftMargin,
      bodySize
    );
    yPosition -= paragraphSpacing * 2;

    // Terms and Conditions
    const terms = [
      {
        title: "1. Date of Joining",
        content: `Your date of joining shall be ${joiningDay ? `${joiningDay}${getOrdinalSuffix(joiningDay)}` : "____"} ${joiningMonthName || "___________"} ${joiningYear || "____"}. This appointment letter is issued post joining and confirms your employment with the Company.`
      },
      {
        title: "2. Place of Posting / Transfer",
        content: `Your present place of work shall be ${data.postingLocation || companyAddress}. However, during the course of employment, you may be transferred or assigned to any location, project, or establishment of the Company in India or abroad at the sole discretion of the Management.`
      },
      {
        title: "3. Working Hours",
        content: `Your normal working hours shall be from ${workingHoursStart} to ${workingHoursEnd}, or as required based on business needs and Company policy.`
      },
      {
        title: "4. Compensation",
        content: `Your Annual Total Employment Cost to the Company shall be ${data.annualCTC || "_____________"}. Detailed compensation terms are provided in Annexure – A.`
      },
      {
        title: "5. Salary Payment Cycle",
        content: `Salary shall be processed monthly and credited on or before the ${salaryPaymentCycle} of every month, subject to attendance, performance, and policy compliance.`
      },
      {
        title: "6. Probation & Confirmation",
        content: `You shall be on probation for ${probationPeriod} from your date of joining. Terms relating to probation and confirmation are detailed in Annexure – E.`
      },
      {
        title: "7. Leave Policy",
        content: `Leave entitlement shall be governed strictly by the Company's HR Policy as detailed in Annexure – D.`
      },
      {
        title: "8. Confidentiality & Conduct",
        content: `You shall adhere to confidentiality, code of conduct, IT usage, and disciplinary policies as detailed in Annexure – B, C, and F.`
      },
      {
        title: "9. Termination & Exit",
        content: `Exit formalities, notice period obligations, and full-and-final settlement shall be governed by Annexure – I.`
      }
    ];

    for (const term of terms) {
      ensureSpace(lineHeight * 8);
      drawWrappedText(term.title, leftMargin, bodySize, true);
      yPosition -= paragraphSpacing * 0.5;
      drawWrappedText(term.content, leftMargin + 10, bodySize);
      yPosition -= paragraphSpacing;
    }

    yPosition -= paragraphSpacing;

    // Closing statement
    drawWrappedText(
      "This Appointment Letter along with Annexures A to I constitutes the complete and binding terms of employment.",
      leftMargin,
      bodySize
    );
    yPosition -= paragraphSpacing * 3;

    // Company signature section
    ensureSpace(lineHeight * 8);
    drawWrappedText("For Zairo International Private Limited", leftMargin, bodySize);
    yPosition -= paragraphSpacing * 2;
    drawWrappedText("Authorized Signatory", leftMargin, bodySize);
    yPosition -= paragraphSpacing;
    drawWrappedText(`Name: ${authorizedSignatoryName}`, leftMargin, bodySize);
    yPosition -= paragraphSpacing * 0.5;
    drawWrappedText(`Designation: ${authorizedSignatoryDesignation}`, leftMargin, bodySize);
    yPosition -= paragraphSpacing * 3;

    // Employee acknowledgement section
    ensureSpace(lineHeight * 10);
    drawFullWidthSectionHeading(
      "ACKNOWLEDGEMENT & ACCEPTANCE",
      currentPage,
      fontBold,
      { value: yPosition },
      leftMargin,
      rightMargin,
      sectionSize,
      pageWidth
    );
    yPosition -= lineHeight;

    drawWrappedText(
      "I have read, understood, and accepted the terms of employment and all annexures attached.",
      leftMargin,
      bodySize
    );
    yPosition -= paragraphSpacing * 2;

    drawWrappedText(`Name: ${data.employeeFullName || data.employeeName || "_____________"}`, leftMargin, bodySize);
    yPosition -= paragraphSpacing;
    drawWrappedText("Signature: ____________________", leftMargin, bodySize);
    yPosition -= paragraphSpacing;
    drawWrappedText("Date:", leftMargin, bodySize);
    yPosition -= paragraphSpacing * 2;

    // ANNEXURES
    const annexures = [
      {
        letter: "A",
        title: "Compensation & Salary Terms",
        content: `Same as finalized earlier — ${data.annualCTC || "_____________"} CTC, salary credit by ${salaryPaymentCycle} of every month, no deductions, revision discretionary.`
      },
      {
        letter: "B",
        title: "Confidentiality & Non-Disclosure Agreement",
        content: "Confidential data protection during & after employment, return of company data, breach consequences."
      },
      {
        letter: "C",
        title: "Code of Conduct & Discipline Policy",
        content: "1. Professional behaviour\n2. Harassment policy\n3. Substance abuse\n4. Misuse of resources\n5. Disciplinary action"
      },
      {
        letter: "D",
        title: "Leave & Attendance Policy",
        content: "1. Attendance compliance\n2. HR policy leave rules\n3. Probation leave restriction\n4. Abandonment after 3 days"
      },
      {
        letter: "E",
        title: "Probation & Confirmation Policy",
        content: `1. The probation period shall be ${probationPeriod} from date of joining.\n2. Performance, conduct, attendance, and policy compliance shall be evaluated.\n3. Probation may be extended at Management discretion.\n4. Confirmation shall be communicated in writing.\n5. Salary and leave during probation are governed by HR policy.`
      },
      {
        letter: "F",
        title: "IT, Data & Asset Usage Policy",
        content: "1. Company IT systems, email, data, and software are for official use only.\n2. Unauthorized access, sharing, or misuse of data is prohibited.\n3. All company assets must be returned upon separation.\n4. Violation may result in disciplinary and legal action."
      },
      {
        letter: "G",
        title: "Non-Solicitation & Limited Non-Compete",
        content: "1. Employees shall not solicit Company clients, vendors, or employees for personal or third-party benefit during employment and for a reasonable period post exit.\n2. This clause shall be interpreted in accordance with applicable Indian laws."
      },
      {
        letter: "H",
        title: "Performance Targets / KRA Policy",
        content: "1. Performance targets shall be assigned periodically.\n2. Evaluation shall be based on defined KRAs.\n3. Incentives, if any, shall be performance-linked and discretionary.\n4. Failure to meet targets may impact confirmation or continuation."
      },
      {
        letter: "I",
        title: "Exit & Full-and-Final Settlement Policy",
        content: "1. Employees must serve an applicable notice period or salary in lieu.\n2. Handover and clearance are mandatory.\n3. Final settlement shall be processed as per payroll cycle post clearance.\n4. The company reserves the right to recover dues or assets.\n5. Performance deduction may occur in case of low performance i.e. 30 percent"
      }
    ];

    for (const annexure of annexures) {
      ensureSpace(lineHeight * 12);
      drawFullWidthSectionHeading(
        `ANNEXURE – ${annexure.letter}`,
        currentPage,
        fontBold,
        { value: yPosition },
        leftMargin,
        rightMargin,
        sectionSize,
        pageWidth
      );
      yPosition -= lineHeight;

      drawWrappedText(annexure.title, leftMargin, bodySize, true);
      yPosition -= paragraphSpacing;

      // Handle multi-line content
      const contentLines = annexure.content.split('\n');
      for (const line of contentLines) {
        drawWrappedText(line, leftMargin + 5, bodySize);
        yPosition -= paragraphSpacing * 0.5;
      }
      yPosition -= paragraphSpacing;
    }

    // Final signature section
    ensureSpace(lineHeight * 10);
    yPosition -= paragraphSpacing * 2;
    drawWrappedText("For Zairo International Private Limited", leftMargin, bodySize);
    yPosition -= paragraphSpacing * 2;
    drawWrappedText(`Authorized Signatory`, leftMargin, bodySize);
    yPosition -= paragraphSpacing;
    drawWrappedText(`Name: ${authorizedSignatoryName}`, leftMargin, bodySize);
    yPosition -= paragraphSpacing * 0.5;
    drawWrappedText(`Designation: Chief Operating Officer (COO)`, leftMargin, bodySize);
    yPosition -= paragraphSpacing;
    drawWrappedText("Date:", leftMargin, bodySize);
    yPosition -= paragraphSpacing * 2;

    // Employee signature section
    drawWrappedText(`Name: ${data.employeeFullName || data.employeeName || "_____________"}`, leftMargin + 300, bodySize);
    yPosition += paragraphSpacing;
    drawWrappedText("Date:", leftMargin + 300, bodySize);

    // Handle signature image if provided
    let candidateSigImg: PDFImage | null = null;
    if (signatureBase64) {
      try {
        const sigImageBytes = Buffer.from(signatureBase64, "base64");
        candidateSigImg = await pdfDoc.embedPng(sigImageBytes);
      } catch (err) {
        console.error("Error embedding signature image:", err);
      }
    }

    // Draw signature on last page if available
    if (candidateSigImg && yPosition > effectiveBottomMargin + 50) {
      const sigWidth = 100;
      const sigHeight = (candidateSigImg.height / candidateSigImg.width) * sigWidth;
      const sigY = yPosition - sigHeight - 20;
      
      if (sigY > effectiveBottomMargin) {
        currentPage.drawImage(candidateSigImg, {
          x: leftMargin + 300,
          y: sigY,
          width: sigWidth,
          height: sigHeight,
        });
      }
    }

    // Update page headers with final count
    const allPages = pdfDoc.getPages();
    const pageHeaderY = pageHeight - topMargin + 10;

    allPages.forEach((page, index) => {
      const pageNum = index + 1;
      page.drawRectangle({
        x: leftMargin,
        y: pageHeaderY - 5,
        width: 150,
        height: footerSize + 10,
        color: rgb(1, 1, 1),
      });
      page.drawText(`Page ${pageNum} of ${totalPages}`, {
        x: leftMargin,
        y: pageHeaderY,
        size: footerSize,
        font: font,
        color: textColor,
      });
    });

    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(pdfBytes);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Offer-Letter-${
          data.employeeName?.replace(/\s+/g, "_") || "Employee"
        }.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error("PDF Generation Error:", err);
    return NextResponse.json(
      {
        error: "Failed to generate offer letter",
        details: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}

// Helper function to get ordinal suffix (1st, 2nd, 3rd, etc.)
function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return "th";
  switch (day % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}
