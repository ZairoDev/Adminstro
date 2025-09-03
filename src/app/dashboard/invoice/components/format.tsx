import { ComputedTotals } from "../page";

export const eur = (n: number) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(
    isFinite(n) ? n : 0
  );

export const safeNumber = (n: unknown) =>
  typeof n === "number" && isFinite(n) ? n : Number(n || 0) || 0;

export function computeTotals({
  amount,
  sgst,
  igst,
  cgst,
}: {
  amount: number;
  sgst: number;
  igst: number;
  cgst: number;
}): ComputedTotals {
  const taxes = {
    sgst: sgst || 0,
    igst: igst || 0,
    cgst: cgst || 0,
  };

  const subTotal = amount;
  const total = subTotal + taxes.sgst + taxes.igst + taxes.cgst;

  return { subTotal, total, taxes };
}


export function formatDisplayDate(iso?: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
