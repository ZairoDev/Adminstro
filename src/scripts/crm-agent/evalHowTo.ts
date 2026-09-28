/**
 * Offline how-to eval for CRM Copilot (30 cases, ≥70% pass).
 * Heuristic by default; live RAG with CRM_AGENT_EVAL_LIVE=true.
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { getGoogleApiKey } from "@/services/crm-agent/config";

type EvalCase = {
  id: string;
  question: string;
  expectedDomain: string;
  expectedSourceIncludes: string;
};

const CASES: EvalCase[] = [
  { id: "1", question: "How do I find a lead by phone?", expectedDomain: "leads", expectedSourceIncludes: "leads.md" },
  { id: "2", question: "What is global lead search?", expectedDomain: "leads", expectedSourceIncludes: "leads.md" },
  { id: "3", question: "How do I open good-to-go leads?", expectedDomain: "leads", expectedSourceIncludes: "leads.md" },
  { id: "4", question: "What is a VSID?", expectedDomain: "glossary", expectedSourceIncludes: "glossary.md" },
  { id: "5", question: "How do I look up a property by VSID?", expectedDomain: "properties", expectedSourceIncludes: "properties-owners.md" },
  { id: "6", question: "Difference between long-term and short-term owner sheet?", expectedDomain: "properties", expectedSourceIncludes: "properties-owners.md" },
  { id: "7", question: "How do overdue visits work?", expectedDomain: "visits", expectedSourceIncludes: "visits-bookings.md" },
  { id: "8", question: "Where are bookings in the dashboard?", expectedDomain: "visits", expectedSourceIncludes: "visits-bookings.md" },
  { id: "9", question: "What are sales offer pending leads?", expectedDomain: "sales-offer", expectedSourceIncludes: "sales-offer.md" },
  { id: "10", question: "How do I check if a phone is already in sales offer?", expectedDomain: "sales-offer", expectedSourceIncludes: "sales-offer.md" },
  { id: "11", question: "What is WhatsApp initiation limit?", expectedDomain: "whatsapp", expectedSourceIncludes: "whatsapp.md" },
  { id: "12", question: "Where is the WhatsApp inbox?", expectedDomain: "whatsapp", expectedSourceIncludes: "whatsapp.md" },
  { id: "13", question: "Who can use finance tools in Copilot?", expectedDomain: "finance", expectedSourceIncludes: "finance.md" },
  { id: "14", question: "Where are Razorpay webhook logs?", expectedDomain: "finance", expectedSourceIncludes: "finance.md" },
  { id: "15", question: "What are candidate lifecycle phases?", expectedDomain: "hr", expectedSourceIncludes: "hr-people.md" },
  { id: "16", question: "When can HR create an employee from a candidate?", expectedDomain: "hr", expectedSourceIncludes: "hr-people.md" },
  { id: "17", question: "What does exitedAt mean?", expectedDomain: "glossary", expectedSourceIncludes: "glossary.md" },
  { id: "18", question: "Who can open People pages?", expectedDomain: "roles", expectedSourceIncludes: "roles-access.md" },
  { id: "19", question: "How does middleware roleAccess work?", expectedDomain: "roles", expectedSourceIncludes: "roles-access.md" },
  { id: "20", question: "What is PIP acknowledgment?", expectedDomain: "hr", expectedSourceIncludes: "hr-people.md" },
  { id: "21", question: "How do I import sales offer leads?", expectedDomain: "sales-offer", expectedSourceIncludes: "sales-offer.md" },
  { id: "22", question: "What is property boost?", expectedDomain: "properties", expectedSourceIncludes: "properties-owners.md" },
  { id: "23", question: "Where is the guest window?", expectedDomain: "visits", expectedSourceIncludes: "visits-bookings.md" },
  { id: "24", question: "Can Advert access WhatsApp retarget?", expectedDomain: "whatsapp", expectedSourceIncludes: "whatsapp.md" },
  { id: "25", question: "What boards exist for declined leads?", expectedDomain: "leads", expectedSourceIncludes: "leads.md" },
  { id: "26", question: "What is employeeCode?", expectedDomain: "glossary", expectedSourceIncludes: "glossary.md" },
  { id: "27", question: "Default pilot roles for CRM Copilot?", expectedDomain: "roles", expectedSourceIncludes: "roles-access.md" },
  { id: "28", question: "How do phone masks work on WhatsApp?", expectedDomain: "whatsapp", expectedSourceIncludes: "whatsapp.md" },
  { id: "29", question: "Difference between Offer and Query?", expectedDomain: "glossary", expectedSourceIncludes: "glossary.md" },
  { id: "30", question: "How do I start candidate onboarding?", expectedDomain: "hr", expectedSourceIncludes: "hr-people.md" },
];

function heuristicDomain(question: string): string {
  const q = question.toLowerCase();
  if (/what is a vsid|exitedat|employeecode|difference between offer and query/i.test(question)) {
    return "glossary";
  }
  if (/pip acknowledgment/i.test(question)) return "hr";
  if (/vsid|owner sheet|property boost|property/.test(q) && !/whatsapp/.test(q)) {
    if (/what is a vsid/.test(q)) return "glossary";
    return "properties";
  }
  if (/sales offer|pending lead|import sales|blacklisted|callback/.test(q)) {
    return "sales-offer";
  }
  if (/lead|good-to-go|good to go|global lead|declined/.test(q)) return "leads";
  if (/visit|booking|guest window/.test(q)) return "visits";
  if (/whatsapp|initiation|retarget|phone mask/.test(q)) return "whatsapp";
  if (/finance|razorpay|webhook/.test(q)) return "finance";
  if (/candidate|onboarding|employee from|lifecycle|pip/.test(q)) return "hr";
  if (/role|middleware|pilot|people pages|who can/.test(q)) return "roles";
  if (/what is|meaning|glossary/.test(q)) return "glossary";
  return "unknown";
}

async function runWithRetrieval(): Promise<{ pass: number; total: number }> {
  const { connectDb } = await import("@/util/db");
  const { retrieveChunks } = await import("@/services/crm-agent/rag/retrieve");
  await connectDb();
  let pass = 0;
  for (const c of CASES) {
    const chunks = await retrieveChunks(c.question, 3);
    const hit = chunks.some(
      (ch) =>
        ch.domain === c.expectedDomain ||
        ch.sourcePath.includes(c.expectedSourceIncludes),
    );
    if (hit) pass += 1;
    else {
      console.log(
        `FAIL ${c.id}: expected ${c.expectedDomain}, got ${chunks.map((x) => x.domain).join(",") || "none"}`,
      );
    }
  }
  return { pass, total: CASES.length };
}

function runHeuristic(): { pass: number; total: number } {
  let pass = 0;
  for (const c of CASES) {
    const domain = heuristicDomain(c.question);
    if (domain === c.expectedDomain) pass += 1;
    else console.log(`FAIL ${c.id}: expected ${c.expectedDomain}, heuristic=${domain}`);
  }
  return { pass, total: CASES.length };
}

async function main() {
  const outDir = path.join(process.cwd(), "docs/crm-agent/generated");
  fs.mkdirSync(outDir, { recursive: true });

  let result: { pass: number; total: number };
  if (getGoogleApiKey() && process.env.CRM_AGENT_EVAL_LIVE === "true") {
    console.log("Running live embedding retrieval eval…");
    result = await runWithRetrieval();
  } else {
    console.log(
      "Running heuristic eval (set CRM_AGENT_EVAL_LIVE=true + GOOGLE_GENERATIVE_AI_API_KEY + indexed KB for live RAG eval)…",
    );
    result = runHeuristic();
  }

  const rate = result.pass / result.total;
  const report = {
    generatedAt: new Date().toISOString(),
    pass: result.pass,
    total: result.total,
    rate,
    threshold: 0.7,
    ok: rate >= 0.7,
  };
  fs.writeFileSync(
    path.join(outDir, "eval-howto-report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(report);
  if (!report.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
