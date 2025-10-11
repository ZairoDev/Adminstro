// lib/pdfmake.ts
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

(pdfMake as any).vfs = (pdfFonts as any).vfs;

// Override Roboto completely so Roboto-Medium.ttf is not required
(pdfMake as any).fonts = {
  Roboto: {
    normal: "Roboto-Regular.ttf",
    bold: "Roboto-Regular.ttf",
    italics: "Roboto-Regular.ttf",
    bolditalics: "Roboto-Regular.ttf",
  },
};

export default pdfMake;
