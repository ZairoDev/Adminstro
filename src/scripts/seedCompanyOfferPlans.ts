import "dotenv/config";

import Company, { type CompanyPlan } from "@/models/company";
import { connectDb } from "@/util/db";
import { ORGANIZATIONS, type Organization } from "@/util/organizationConstants";

const DEFAULT_PLANS_BY_ORG: Record<Organization, CompanyPlan[]> = {
  HousingSaga: [
    { planName: "Owner Plan", duration: "OneTime", price: 200, currency: "EUR", isActive: true },
  ],
  Holidaysera: [
    { planName: "Action Plan", duration: "12M", price: 299, currency: "EUR", isActive: true },
    { planName: "Game Plan", duration: "18M", price: 399, currency: "EUR", isActive: true },
    { planName: "Master Plan", duration: "24M", price: 499, currency: "EUR", isActive: true },
  ],
  VacationSaga: [
    { planName: "Action Plan", duration: "18M", price: 299, currency: "EUR", isActive: true },
    { planName: "Game Plan", duration: "18M", price: 399, currency: "EUR", isActive: true },
    { planName: "Master Plan", duration: "24M", price: 499, currency: "EUR", isActive: true },
  ],
};

function parseArgs(argv: string[]): { createMissing: boolean } {
  return {
    createMissing: argv.includes("--create-missing"),
  };
}

function orgNamePattern(organization: Organization): RegExp {
  return new RegExp(`^${organization}$`, "i");
}

async function upsertPlansForOrg(organization: Organization, createMissing: boolean): Promise<void> {
  const organizationPlans = DEFAULT_PLANS_BY_ORG[organization];
  const found = await Company.findOne({
    $or: [{ organization: orgNamePattern(organization) }, { name: orgNamePattern(organization) }],
  }).select("_id");

  if (!found && !createMissing) {
    // eslint-disable-next-line no-console
    console.log(`[skip] ${organization}: no company document found (use --create-missing to create).`);
    return;
  }

  if (!found && createMissing) {
    await Company.create({
      name: organization,
      email: `support@${organization.toLowerCase()}.com`,
      phone: "N/A",
      address: "N/A",
      description: `${organization} company profile`,
      logo: "N/A",
      organization,
      content: {},
      plans: organizationPlans,
    });
    // eslint-disable-next-line no-console
    console.log(`[created] ${organization}: created company doc with ${organizationPlans.length} plans.`);
    return;
  }

  await Company.updateOne(
    { _id: found?._id },
    {
      $set: {
        organization,
        plans: organizationPlans,
      },
    },
  );
  // eslint-disable-next-line no-console
  console.log(`[updated] ${organization}: set ${organizationPlans.length} plans.`);
}

async function main() {
  const { createMissing } = parseArgs(process.argv);
  await connectDb();

  for (const organization of ORGANIZATIONS) {
    await upsertPlansForOrg(organization, createMissing);
  }
}

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error("Failed to seed company offer plans:", error);
  process.exit(1);
});
