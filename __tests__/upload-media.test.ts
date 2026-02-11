import { POST, GET } from "@/app/api/whatsapp/upload-media/route";
import { NextRequest } from "next/server";

jest.mock("@/util/getDataFromToken", () => ({
  getDataFromToken: jest.fn(),
}));

jest.mock("@/lib/whatsapp/config", () => ({
  getAllowedPhoneIds: jest.fn((role: string, areas: string[]) => {
    if (role === "Sales" && areas?.includes("athens")) return ["phone-athens"];
    if (role === "Sales") return ["phone-other"];
    if (role === "Advert") return [];
    return [];
  }),
  getRetargetPhoneId: jest.fn(() => "phone-retarget"),
  getDefaultPhoneId: jest.fn(() => "phone-athens"),
  canAccessPhoneId: jest.fn(() => true),
  getWhatsAppToken: jest.fn(() => "whatsapp-token"),
  WHATSAPP_API_BASE_URL: "https://api.whatsapp.test",
}));

describe("upload-media API", () => {
  const { getDataFromToken } = require("@/util/getDataFromToken");

  beforeEach(() => {
    (getDataFromToken as jest.Mock).mockReset();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("Sales can upload image successfully", async () => {
    (getDataFromToken as jest.Mock).mockResolvedValue({ role: "Sales", allotedArea: ["athens"] });

    // mock file
    const fakeFile = {
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
      type: "image/png",
      name: "test.png",
      size: 3,
    };

    const req: any = {
      formData: async () => ({
        get: (k: string) => {
          if (k === "file") return fakeFile;
          if (k === "phoneNumberId") return "phone-retarget";
          return undefined;
        },
      }),
    };

    // mock WhatsApp upload response then media URL response
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "mid-123" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: "https://cdn.test/mid-123" }),
      });

    const res = await POST(req as NextRequest);
    const body = await (res as any).json();
    expect(body.success).toBe(true);
    expect(body.mediaId).toBe("mid-123");
    expect(body.url).toBe("https://cdn.test/mid-123");
    expect(body.mimeType).toBe("image/png");
    expect(body.filename).toBe("test.png");
  });

  test("Advert can upload using retarget phone id when no allowed phones", async () => {
    (getDataFromToken as jest.Mock).mockResolvedValue({ role: "Advert", allotedArea: [] });

    const fakeFile = {
      arrayBuffer: async () => new Uint8Array([4, 5, 6]).buffer,
      type: "image/jpeg",
      name: "adv.jpg",
      size: 3,
    };

    const req: any = {
      formData: async () => ({
        get: (k: string) => (k === "file" ? fakeFile : undefined),
      }),
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "mid-adv" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: "https://cdn.test/mid-adv" }),
      });

    const res = await POST(req as NextRequest);
    const body = await (res as any).json();
    expect(body.success).toBe(true);
    expect(["phone-retarget", "phone-athens"]).toContain(body.phoneNumberId);
  });

  test("GET media URL returns error when missing mediaId", async () => {
    (getDataFromToken as jest.Mock).mockResolvedValue({ role: "Sales", allotedArea: ["athens"] });
    const req: any = {
      nextUrl: { searchParams: new URLSearchParams() },
    };
    const res = await GET(req as NextRequest);
    const body = await (res as any).json();
    expect(body.error).toBe("Media ID is required");
  });

  test("GET media URL success", async () => {
    (getDataFromToken as jest.Mock).mockResolvedValue({ role: "Sales", allotedArea: ["athens"] });
    const req: any = {
      nextUrl: { searchParams: new URLSearchParams({ mediaId: "mid-123" }) },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: "https://cdn.test/mid-123", mime_type: "image/png", sha256: "abc", file_size: 123 }),
    });

    const res = await GET(req as NextRequest);
    const body = await (res as any).json();
    expect(body.success).toBe(true);
    expect(body.url).toBe("https://cdn.test/mid-123");
    expect(body.mimeType).toBe("image/png");
  });
});

