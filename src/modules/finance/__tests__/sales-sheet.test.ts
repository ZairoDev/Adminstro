import {
  buildSalesSheetRows,
  formatAmountPaid,
  formatInvoiceValueInr,
  formatPaymentMode,
  formatSheetDate,
  invoiceValueInInr,
  resolveExchangeRate,
  salesSheetToCsv,
  withSerialNumbers,
  type SalesSheetLookups,
  type SalesSheetSourcePayment,
} from "../sales-sheet";

const lookups: SalesSheetLookups = {
  bookingsById: {
    booking1: {
      address: "Athens",
      propertyName: "Athens Flat",
      visitId: "visit1",
      guests: [
        {
          id: "guest1",
          name: "Leo",
          email: "yangliagin@egcgr.com",
          phone: "30 6946096373",
        },
      ],
    },
  },
  visitsById: {
    visit1: {
      agentName: "Salvina",
      propertyId: "property1",
      vsid: "VSID1",
    },
  },
  propertiesById: {
    property1: { country: "Greece", address: "Athens" },
  },
  propertiesByVsid: {},
  invoicesByKey: {
    paymentObject: [
      {
        invoiceNumber: "ZI/2627/061",
        guestId: "guest1",
        guestName: "Leo",
        guestEmail: "yangliagin@egcgr.com",
        guestPhone: "30 6946096373",
        amountBilled: 210,
        currency: "EUR",
        status: "sent",
      },
    ],
  },
};

function payment(overrides: Partial<SalesSheetSourcePayment> = {}): SalesSheetSourcePayment {
  return {
    id: "paymentObject",
    paymentId: "pay_1",
    paymentLinkId: null,
    paidAt: "2026-08-26T10:00:00+05:30",
    capturedAt: null,
    createdAt: "2026-08-26T09:00:00+05:30",
    customerName: "Leo",
    customerEmail: "yangliagin@egcgr.com",
    customerPhone: "30 6946096373",
    guestId: "guest1",
    guestName: "Leo",
    guestEmail: "yangliagin@egcgr.com",
    bookingObjectId: "booking1",
    propertyId: null,
    amount: 210,
    currency: "EUR",
    method: "paypal",
    exchangeRate: 109.8,
    invoiceNumber: null,
    invoiceNumbers: ["ZI/2627/061"],
    ...overrides,
  };
}

describe("sales sheet formatting", () => {
  it("formats the sheet date in month/day/year", () => {
    expect(formatSheetDate("2026-08-26T10:00:00+05:30")).toBe("8/26/2026");
  });

  it("formats PayPal and euro the way the sheet shows them", () => {
    expect(formatPaymentMode("paypal")).toBe("PayPal");
    expect(formatAmountPaid(210, "EUR")).toBe("210€");
  });

  it("converts 210 euro at 109.8 into 23058 rupees", () => {
    expect(invoiceValueInInr(210, 109.8)).toBe(23058);
    expect(formatInvoiceValueInr(23058)).toContain("23,058.00");
  });

  it("defaults INR to a rate of 1 and leaves other currencies blank", () => {
    expect(resolveExchangeRate("INR", null)).toBe(1);
    expect(resolveExchangeRate("EUR", null)).toBeNull();
    expect(resolveExchangeRate("EUR", 109.8)).toBe(109.8);
  });
});

describe("buildSalesSheetRows", () => {
  it("fills every sheet column from the mapped payment", () => {
    const [row] = buildSalesSheetRows([payment()], lookups);
    expect(row).toMatchObject({
      date: "8/26/2026",
      customerName: "Leo",
      contactNumber: "30 6946096373",
      email: "yangliagin@egcgr.com",
      propertyAddress: "Athens",
      country: "Greece",
      invoiceNumber: "ZI/2627/061",
      amountPaid: 210,
      amountPaidLabel: "210€",
      mode: "PayPal",
      exchangeRate: 109.8,
      invoiceValueInr: 23058,
      agent: "Salvina",
    });
  });

  it("keeps a mapped payment on the sheet before an invoice exists", () => {
    const [row] = buildSalesSheetRows([payment({ invoiceNumbers: [] })], {
      ...lookups,
      invoicesByKey: {},
    });
    expect(row.invoiceNumber).toBe("");
    expect(row.customerName).toBe("Leo");
    expect(row.contactNumber).toBe("30 6946096373");
    expect(row.agent).toBe("Salvina");
  });

  it("writes one row per split invoice and ignores superseded invoices", () => {
    const rows = buildSalesSheetRows([payment({ amount: 300, exchangeRate: 1, currency: "INR" })], {
      ...lookups,
      invoicesByKey: {
        paymentObject: [
          {
            invoiceNumber: "FIN-00001",
            guestId: "guest1",
            guestName: "Leo",
            guestEmail: "leo@example.com",
            guestPhone: "111",
            amountBilled: 100,
            currency: "INR",
            status: "generated",
          },
          {
            invoiceNumber: "FIN-00002",
            guestId: null,
            guestName: "Mia",
            guestEmail: "mia@example.com",
            guestPhone: "222",
            amountBilled: 200,
            currency: "INR",
            status: "generated",
          },
          {
            invoiceNumber: "FIN-OLD",
            guestId: null,
            guestName: "Old",
            guestEmail: "old@example.com",
            guestPhone: "333",
            amountBilled: 50,
            currency: "INR",
            status: "superseded",
          },
        ],
      },
    });

    expect(rows.map((row) => row.invoiceNumber)).toEqual(["FIN-00001", "FIN-00002"]);
    expect(rows.map((row) => row.invoiceValueInr)).toEqual([100, 200]);
  });

  it("exports the sheet columns as CSV", () => {
    const csv = salesSheetToCsv(withSerialNumbers(buildSalesSheetRows([payment()], lookups)));
    expect(csv.split("\n")[0]).toBe(
      "S No,Date,Customer Name,Contact number,E mail ID,Customer Prop Address,Country,Invoice Number,Amount Paid,Mode,EXCH RATE,INVOICE VALUE IN RS,Agent",
    );
    expect(csv).toContain("Leo");
    expect(csv).toContain("Salvina");
    expect(csv).toContain("109.8");
  });
});
