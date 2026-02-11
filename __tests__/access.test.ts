import { canAccessConversation, shouldEmitToUser } from "@/lib/whatsapp/access";

jest.mock("@/lib/whatsapp/config", () => ({
  getAllowedPhoneIds: jest.fn((role: string, areas: string[]) => {
    if (role === "Sales" && areas?.includes("athens")) return ["phone-athens"];
    if (role === "Sales" && areas?.includes("milan")) return ["phone-milan"];
    if (role === "Sales") return ["phone-other"];
    if (role === "Advert") return [];
    if (role === "SuperAdmin") return ["phone-athens", "phone-milan", "phone-other"];
    return [];
  }),
}));

describe("canAccessConversation - Basic Retarget Rules", () => {
  test("Sales cannot access retarget before handover", async () => {
    const user = { role: "Sales", allotedArea: ["athens"] };
    const conv: any = { isRetarget: true, retargetStage: "initiated", businessPhoneId: "phone-athens" };
    const allowed = await canAccessConversation(user, conv);
    expect(allowed).toBe(false);
  });

  test("Sales can access retarget after handover if area matches", async () => {
    const user = { role: "Sales", allotedArea: ["athens"] };
    const conv: any = { isRetarget: true, retargetStage: "handed_to_sales", businessPhoneId: "phone-athens" };
    const allowed = await canAccessConversation(user, conv);
    expect(allowed).toBe(true);
  });

  test("Sales cannot access conversation from different phoneId", async () => {
    const user = { role: "Sales", allotedArea: ["athens"] };
    const conv: any = { isRetarget: false, businessPhoneId: "phone-unknown" };
    const allowed = await canAccessConversation(user, conv);
    expect(allowed).toBe(false);
  });

  test("Advert can access retarget conversations before handover", async () => {
    const user = { role: "Advert", allotedArea: [] };
    const conv: any = { isRetarget: true, retargetStage: "initiated", businessPhoneId: "phone-athens" };
    const allowed = await canAccessConversation(user, conv);
    expect(allowed).toBe(true);
  });

  test("Non-retarget conversation allowed if phone matches", async () => {
    const user = { role: "Sales", allotedArea: ["athens"] };
    const conv: any = { isRetarget: false, businessPhoneId: "phone-athens" };
    const allowed = await canAccessConversation(user, conv);
    expect(allowed).toBe(true);
  });
});

describe("canAccessConversation - Edge Cases", () => {
  test("Sales blocked even after handover if phoneId not in their area", async () => {
    const user = { role: "Sales", allotedArea: ["athens"] };
    const conv: any = {
      isRetarget: true,
      retargetStage: "handed_to_sales",
      businessPhoneId: "phone-other",
    };
    const allowed = await canAccessConversation(user, conv);
    expect(allowed).toBe(false);
  });

  test("Advert cannot access retarget after handover", async () => {
    const user = { role: "Advert", allotedArea: [] };
    const conv: any = {
      isRetarget: true,
      retargetStage: "handed_to_sales",
      businessPhoneId: "phone-athens",
    };
    const allowed = await canAccessConversation(user, conv);
    expect(allowed).toBe(false);
  });

  test("Sales cannot access retarget if stage undefined", async () => {
    const user = { role: "Sales", allotedArea: ["athens"] };
    const conv: any = {
      isRetarget: true,
      businessPhoneId: "phone-athens",
    };
    const allowed = await canAccessConversation(user, conv);
    expect(allowed).toBe(false);
  });
});

describe("canAccessConversation - Security Tests", () => {
  test("User cannot access conversation by manually changing phoneId", async () => {
    const user = { role: "Sales", allotedArea: ["athens"] };
    const conv: any = {
      isRetarget: false,
      businessPhoneId: "phone-admin-only",
    };
    const allowed = await canAccessConversation(user, conv);
    expect(allowed).toBe(false);
  });

  test("Non-WhatsApp roles cannot access any conversation", async () => {
    const user = { role: "Intern", allotedArea: [] };
    const conv: any = { isRetarget: false, businessPhoneId: "phone-athens" };
    const allowed = await canAccessConversation(user, conv);
    expect(allowed).toBe(false);
  });
});

describe("canAccessConversation - Conversation Ownership", () => {
  test("Assigned Sales agent can access conversation even if area mismatched", async () => {
    const user = { role: "Sales", allotedArea: ["milan"], _id: "agent1" };
    const conv: any = {
      isRetarget: true,
      retargetStage: "handed_to_sales",
      assignedAgent: "agent1",
      businessPhoneId: "phone-athens",
    };
    const allowed = await canAccessConversation(user, conv);
    expect(allowed).toBe(true);
  });

  test("Other Sales agents cannot access if not assigned", async () => {
    const user = { role: "Sales", allotedArea: ["athens"], _id: "agent2" };
    const conv: any = {
      isRetarget: true,
      retargetStage: "handed_to_sales",
      assignedAgent: "agent1",
      businessPhoneId: "phone-athens",
    };
    const allowed = await canAccessConversation(user, conv);
    expect(allowed).toBe(false);
  });
});

describe("canAccessConversation - Conversation Creation Protection", () => {
  test("Sales cannot create retarget conversation before handover", async () => {
    const user = { role: "Sales", allotedArea: ["athens"] };
    const conv: any = {
      isRetarget: true,
      retargetStage: "initiated",
      businessPhoneId: "phone-athens",
    };
    const allowed = await canAccessConversation(user, conv);
    expect(allowed).toBe(false);
  });
});

describe("canAccessConversation - Internal Phone Tests", () => {
  test("Internal conversations accessible regardless of area", async () => {
    const user = { role: "Sales", allotedArea: [] };
    const conv: any = {
      source: "internal",
      businessPhoneId: "internal-you",
    };
    const allowed = await canAccessConversation(user, conv);
    expect(allowed).toBe(true);
  });
});

describe("canAccessConversation - Send Permission Tests", () => {
  test("Sales cannot send message before handover", async () => {
    const user = { role: "Sales", allotedArea: ["athens"] };
    const conv: any = {
      isRetarget: true,
      retargetStage: "initiated",
      businessPhoneId: "phone-athens",
    };
    const allowed = await canAccessConversation(user, conv);
    expect(allowed).toBe(false);
  });

  test("Advert cannot send after handover", async () => {
    const user = { role: "Advert", allotedArea: [] };
    const conv: any = {
      isRetarget: true,
      retargetStage: "handed_to_sales",
      businessPhoneId: "phone-athens",
    };
    const allowed = await canAccessConversation(user, conv);
    expect(allowed).toBe(false);
  });
});

describe("shouldEmitToUser - Socket Emission Tests", () => {
  test("Socket not emitted to Sales before handover", () => {
    const user = { role: "Sales", allotedArea: ["athens"] };
    const conv = { isRetarget: true, retargetStage: "initiated", businessPhoneId: "phone-athens" };
    const shouldEmit = shouldEmitToUser(user, conv);
    expect(shouldEmit).toBe(false);
  });

  test("Socket emitted to Sales after handover", () => {
    const user = { role: "Sales", allotedArea: ["athens"] };
    const conv = { isRetarget: true, retargetStage: "handed_to_sales", businessPhoneId: "phone-athens" };
    const shouldEmit = shouldEmitToUser(user, conv);
    expect(shouldEmit).toBe(true);
  });

  test("Socket emitted to Advert before handover", () => {
    const user = { role: "Advert", allotedArea: [] };
    const conv = { isRetarget: true, retargetStage: "initiated", businessPhoneId: "phone-athens" };
    const shouldEmit = shouldEmitToUser(user, conv);
    expect(shouldEmit).toBe(true);
  });

  test("Socket not emitted to Advert after handover", () => {
    const user = { role: "Advert", allotedArea: [] };
    const conv = { isRetarget: true, retargetStage: "handed_to_sales", businessPhoneId: "phone-athens" };
    const shouldEmit = shouldEmitToUser(user, conv);
    expect(shouldEmit).toBe(false);
  });

  test("Socket not emitted if phoneId mismatch", () => {
    const user = { role: "Sales", allotedArea: ["athens"] };
    const conv = { isRetarget: false, businessPhoneId: "phone-other" };
    const shouldEmit = shouldEmitToUser(user, conv);
    expect(shouldEmit).toBe(false);
  });
});

describe("canAccessConversation - Retarget Lifecycle Tests", () => {
  test("Advert owns conversation during initiated stage", async () => {
    const user = { role: "Advert", allotedArea: [] };
    const conv: any = {
      isRetarget: true,
      retargetStage: "initiated",
      ownerRole: "Advert",
      businessPhoneId: "phone-athens",
    };
    const allowed = await canAccessConversation(user, conv);
    expect(allowed).toBe(true);
  });

  test("Advert owns conversation during engaged stage", async () => {
    const user = { role: "Advert", allotedArea: [] };
    const conv: any = {
      isRetarget: true,
      retargetStage: "engaged",
      ownerRole: "Advert",
      businessPhoneId: "phone-athens",
    };
    const allowed = await canAccessConversation(user, conv);
    expect(allowed).toBe(true);
  });

  test("Sales becomes owner after handover", async () => {
    const user = { role: "Sales", allotedArea: ["athens"], _id: "agent1" };
    const conv: any = {
      isRetarget: true,
      retargetStage: "handed_to_sales",
      ownerRole: "Sales",
      ownerUserId: "agent1",
      businessPhoneId: "phone-athens",
    };
    const allowed = await canAccessConversation(user, conv);
    expect(allowed).toBe(true);
  });

  test("Handover sets ownerUserId correctly", async () => {
    const user = { role: "Sales", allotedArea: ["athens"], _id: "agent1" };
    const conv: any = {
      isRetarget: true,
      retargetStage: "handed_to_sales",
      ownerUserId: "agent1",
      businessPhoneId: "phone-athens",
    };
    const allowed = await canAccessConversation(user, conv);
    expect(allowed).toBe(true);
  });
});
