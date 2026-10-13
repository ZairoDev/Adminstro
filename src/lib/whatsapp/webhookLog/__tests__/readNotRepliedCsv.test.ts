import { csvCell, readNotRepliedToCsv } from "../readNotRepliedCsv";
import type { ReadNotRepliedRow } from "../monitorService";

const baseRow: ReadNotRepliedRow = {
  conversationId: "c1",
  phone: "919876543210",
  name: "=HYPERLINK(\"http://evil\")",
  businessPhoneId: "123",
  lastReadMessage: {
    messageId: "wamid.1",
    type: "template",
    templateName: "guest_greeting",
    preview: 'He said "hi", ok',
    sentAt: "2026-10-13T08:00:00.000Z",
    readAt: "2026-10-13T08:05:00.000Z",
  },
  readMessageCount: 1,
  verdict: "no_inbound_webhook",
  lostInbound: [],
};

describe("csvCell", () => {
  it("prefixes formula-looking values so spreadsheets do not execute them", () => {
    expect(csvCell("=1+1")).toBe(`"'=1+1"`);
    expect(csvCell("+91")).toBe(`"'+91"`);
    expect(csvCell("@cmd")).toBe(`"'@cmd"`);
  });

  it("escapes quotes and handles undefined", () => {
    expect(csvCell('a"b')).toBe(`"a""b"`);
    expect(csvCell(undefined)).toBe(`""`);
  });
});

describe("readNotRepliedToCsv", () => {
  it("emits a header plus one line per row", () => {
    const csv = readNotRepliedToCsv([baseRow]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("phone,name,location");
    expect(lines[1]).toContain(`"'=HYPERLINK`);
    expect(lines[1]).toContain(`"He said ""hi"", ok"`);
    expect(lines[1]).toContain(`"no_inbound_webhook"`);
  });
});
