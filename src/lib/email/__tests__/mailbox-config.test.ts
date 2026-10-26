import {
  encryptMailboxSecret,
  decryptMailboxSecret,
} from "@/lib/email/mailbox-secret";
import { prepareMailboxDraft } from "@/lib/email/mailbox-config";

describe("prepareMailboxDraft", () => {
  it("keeps the account email out of the connected list and accepts it as From", () => {
    expect(
      prepareMailboxDraft({
        loginEmail: " HR.ZairoInternational@gmail.com ",
        fromEmail: "hr.zairointernational@gmail.com",
        connectedEmails: [
          "hr.zairointernational@gmail.com",
          "admistro.in@gmail.com",
          "admistro.in@gmail.com",
        ],
      }),
    ).toEqual({
      loginEmail: "hr.zairointernational@gmail.com",
      fromEmail: "hr.zairointernational@gmail.com",
      connectedEmails: ["admistro.in@gmail.com"],
    });
  });

  it("rejects a From address that is not the account or a connected email", () => {
    expect(() =>
      prepareMailboxDraft({
        loginEmail: "admistro.in@gmail.com",
        fromEmail: "other@example.com",
        connectedEmails: ["no-reply@vacationsaga.com"],
      }),
    ).toThrow(/From address must be/);
  });
});

describe("mailbox secret", () => {
  const original = process.env.TOKEN_SECRET;

  beforeAll(() => {
    process.env.TOKEN_SECRET = "test-secret";
  });

  afterAll(() => {
    process.env.TOKEN_SECRET = original;
  });

  it("round-trips an app password", () => {
    const cipher = encryptMailboxSecret("abcd efgh ijkl mnop");
    expect(cipher).not.toContain("abcd");
    expect(decryptMailboxSecret(cipher)).toBe("abcd efgh ijkl mnop");
  });
});
