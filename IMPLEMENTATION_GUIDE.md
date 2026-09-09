# Implementation Guide — Personalized HR/SuperAdmin Email Signatures + Office Details Card

This guide walks through everything discussed in this chat: an "Office Details" card
(Location / Assigned Email / Assigned Number) on the person-detail page, and wiring
those fields into every HR/SuperAdmin-signed email so recipients always know exactly
who sent it.

**How to use this guide:** do the steps in order. Each one leaves the app in a
working, compilable state — you can stop after any step, run the app, and nothing
is broken. Don't jump ahead; several later steps depend on exact code written in
earlier ones.

---

## Part A — Office Details data model & API

### Step 1 — Add the `officeDetails` field to the Employee schema

**Goal:** Give every employee a place to store their office-assigned contact info,
separate from their personal login `email`/`phone`. This is the foundation
everything else in this guide builds on.

**File:** `src/models/employee.ts` (existing file — you're adding a new field next
to `candidateId`/`employeeCode`, not touching those).

**Context:** Today `Employees` only has personal `email` (login credential) and
`phone` (required, also used for mobile-PIN login). There's no concept of an
"office-assigned" contact separate from those. You're adding a new nested object,
following the exact same inline-object pattern this file already uses for
`whatsappPhoneMask` and `pricingRule` — small, fixed-shape settings live as plain
nested fields, not separate collections.

**The change — part 1, the schema object:**

```ts
    // Sparse so legacy docs without a code (pre-backfill) don't violate the
    // unique index — note this deliberately has NO `default`, since a sparse
    // index only excludes documents where the field is truly *absent*, not
    // documents where it's explicitly `null` (which would still collide with
    // each other). Immutable so no update path can ever overwrite it once set.
    employeeCode: {
      type: String,
      unique: true,
      sparse: true,
      immutable: true,
    },
    // NEW: office-assigned contact info, distinct from personal email/phone.
    // HR fills this in manually via the Office Details card — nothing here
    // is auto-generated, so every field starts unset on existing employees.
    // `assignedEmail`/`assignedNumber` deliberately have NO `default` — same
    // reasoning as `employeeCode` above. Step 2 puts a unique+sparse index on
    // both, and sparse only excludes documents where the field is truly
    // *absent*. A `default` of `null` or `""` would make the field *present*
    // (just empty) on every employee, so the second employee ever created
    // would collide with the first on that shared empty value and fail to
    // save with a duplicate-key error. `officeAddressId` isn't covered by a
    // unique index, so `default: null` is harmless there.
    officeDetails: {
      officeAddressId: {
        type: Schema.Types.ObjectId,
        ref: "OfficeAddress", // same collection Candidate.officeAddressId already points to
        default: null,
      },
      assignedEmail: {
        type: String,
      },
      assignedNumber: {
        type: String,
      },
    },
```
*(Insert this right after the existing `employeeCode` block.)*

**The change — part 2, the TypeScript interface:**

`employeeSchema` is declared as `new Schema<IEmployee>({...})` a little further
down this same file — that generic parameter means TypeScript checks every key
in the object literal above against the `IEmployee` interface at the top of the
file, and rejects any key `IEmployee` doesn't declare (excess property
checking). `employeeCode` was already added there; `officeDetails` needs the
same treatment or Step 1's schema change won't compile:

```ts
interface IEmployee extends Document, EmployeeSchema {
  employeeCode?: string | null;
  officeDetails?: {
    officeAddressId?: Types.ObjectId | null;
    assignedEmail?: string | null;
    assignedNumber?: string | null;
  };
  candidateId?: Types.ObjectId | null;
  // ...rest of the interface unchanged
```

Note this is a *different* shape from the `EmployeeInterface` you'll add in
Step 3 (`src/util/type.ts`): here `officeAddressId` is `Types.ObjectId | null`
because this interface describes the raw Mongoose document, where an
unpopulated ref is always a real `ObjectId`. `EmployeeInterface` describes what
the *frontend* receives over JSON, where a populated ref becomes a plain
`{ _id, name }` object and an unpopulated one becomes a string — hence its
wider `string | { _id: string; name: string } | null` union. Don't merge these
two interfaces or reuse one for the other.

**Why this way:** This is an **additive schema change** — no existing field is
touched, so every current query, read, and write in the codebase keeps working
unchanged. `officeAddressId` is a **reference** (`ObjectId` + `ref`), not a copied
string, so the office's name/address always stays in sync with the one canonical
`OfficeAddress` record — this is basic **database normalization**: store the ID,
look up the display text on read, never duplicate it. Leaving `assignedEmail`/
`assignedNumber` genuinely unset (no `default`) rather than `null`/`""` is what
makes the sparse unique index in Step 2 actually work — sparse indexes key off
of whether the *path* exists at all, not whether its value is "empty".

**How to verify:** Run `npx tsc --noEmit` — it should pass with no new errors
(this is a pure additive type change; if you only did part 1 above, you'd see
`error TS2353: Object literal may only specify known properties, and
'officeDetails' does not exist in type ...` — that's part 2 missing). Optionally
open `mongosh` and confirm `db.employees.findOne()` still returns existing
documents unchanged (the new field simply won't appear on old documents until
Step 10 writes it).

**Common mistakes:**
- Adding `default: null` or `default: ""` to `assignedEmail`/`assignedNumber`
  "to be safe" — this is the opposite of safe here. It silently breaks Step 2's
  unique index the moment a second employee is created (both would share the
  same explicit empty value). Leave these two fields with no `default` at all.
- Forgetting the `ref: "OfficeAddress"` string means `.populate()` in later
  steps will silently return the raw ID instead of the office document.
- Editing the schema object but forgetting the matching `IEmployee` interface
  update (part 2) — you'll get a `TS2353` excess-property error pointing at
  `officeDetails` in the schema object.
- Don't add `required: true` anywhere in this block — every existing employee
  must remain valid without ever touching this feature.

---

### Step 2 — Add the two unique indexes, then create them in the database

**Goal:** Guarantee two employees can never accidentally end up with the same
assigned email or number (you decided this should be enforced, not just
convention).

**File:** `src/models/employee.ts` (same file, near the bottom where the existing
indexes are declared).

**Context:** `employeeSchema.index({ location: 1, isActive: 1 })` and one other
index already exist near the bottom of this file. You're adding two more, on the
nested paths from Step 1.

**The change:**

```ts
employeeSchema.index({ location: 1, isActive: 1 });
employeeSchema.index({ role: 1, isActive: 1 });
// NEW: prevent two employees from sharing the same office-assigned contact.
// sparse: true is essential — see Step 1's comment. Without it, the very
// first two employees to *not* have office details set would collide on
// `null` and the index creation itself would fail.
employeeSchema.index({ "officeDetails.assignedEmail": 1 }, { unique: true, sparse: true });
employeeSchema.index({ "officeDetails.assignedNumber": 1 }, { unique: true, sparse: true });
```

Then, from a terminal, actually create these indexes in the database (defining
them in the schema alone doesn't guarantee they exist yet — see below):

```bash
npm run db:sync-indexes
```

**Why this way:** Index *definitions* live in code (so they're versioned and
reviewable); index *creation* is a deliberate, explicit action against a real
database. This project already has this exact split — `src/scripts/createIndexes.ts`
calls `mongoose.connection.syncIndexes()` and already imports the `employee` model,
so it picks up these two new indexes with zero script changes. This is the same
approach used for the `employeeCode` unique index earlier in this project — reuse
of an established pattern beats inventing a new one.

**How to verify:**
```bash
npm run db:sync-indexes
```
should print `Indexes synced.` with no errors. Then in `mongosh`:
```js
db.employees.getIndexes()
```
should list `officeDetails.assignedEmail_1` and `officeDetails.assignedNumber_1`,
both with `"sparse": true, "unique": true`.

**Common mistakes:**
- Running this against production before Step 1 is deployed there will fail
  silently to do anything useful — the field must exist in the schema mongoose
  loads at the time you run the sync.
- If you ever see a "duplicate key" error while running the sync itself, it means
  some employees already share a value in that field from before this feature —
  find and fix them before re-running (this shouldn't happen here since the field
  is brand new, but it's the general lesson for adding a unique index to existing
  data).

---

### Step 3 — Add `officeDetails` to the `EmployeeInterface` TypeScript type

**Goal:** Let the frontend read `officeDetails` with type safety instead of `any`.

**File:** `src/util/type.ts` (existing `EmployeeInterface`, right where
`employeeCode` was added earlier).

**Context:** `EmployeeInterface` mirrors what the API actually returns to the
client. Because Step 8's card will call `.populate()` on `officeAddressId`, the
*populated* shape is an object `{ _id, name }`, not a plain string — the type has
to allow both, matching exactly how this codebase already types `Candidate.officeAddressId`.

**The change:**

```ts
export interface EmployeeInterface {
  _id: string;
  /** Permanent human-readable ID, e.g. "ZI-4K7QXH". Null until backfilled on legacy records. */
  employeeCode?: string | null;
  /**
   * Office-assigned contact info, distinct from personal login email/phone.
   * `officeAddressId` is a string (raw ObjectId) unless the API populated it,
   * in which case it's an object — check `typeof` before reading `.name`.
   */
  officeDetails?: {
    officeAddressId?: string | { _id: string; name: string } | null;
    assignedEmail?: string | null;
    assignedNumber?: string | null;
  } | null;
  name: string;
  email: string;
```

**Why this way:** This is exactly the same shape Mongoose's `.populate()` produces
in real life — a field is *either* an unpopulated ID *or* a populated object,
never both at once. Modeling that honestly with a union type (rather than lying
and saying it's always an object) means TypeScript will force every consumer to
check before reading `.name`, catching a whole class of "works until it doesn't"
bugs at compile time instead of in production.

**How to verify:** `npx tsc --noEmit` — still clean, this is purely additive.

**Common mistakes:**
- Typing `officeAddressId` as just `{ _id: string; name: string }` (forgetting the
  `string |` union) will make Step 8's code look correct in the editor but crash
  at runtime the first time you fetch an employee whose office was never populated.

---

## Part B — the new API route

### Step 4 — Create the Zod validation schema for the office-details payload

**Goal:** Validate every write to this new field at the API boundary — required by
this project's rules, and this is the layer where it belongs (not in the UI, not
in the model).

**File:** `src/schemas/officeDetails.schema.ts` — **new file**. This project keeps
one small `*.schema.ts` file per feature under `src/schemas/` (see
`employee.schema.ts`, `property.schema.ts`); a brand-new dedicated field group
gets its own file rather than being crammed into the giant `employee.schema.ts`,
which is reserved for the full employee-creation payload.

**Context:** New file, no existing behavior to change. Its only job is to answer
"is this PUT body shape-valid" before any database call happens.

**The change:**

```ts
import { z } from "zod";
import mongoose from "mongoose";

// A tiny local helper — Zod doesn't know about Mongoose's ObjectId format,
// so we teach it via .refine().
const isObjectId = (value: string) => mongoose.Types.ObjectId.isValid(value);

export const officeDetailsSchema = z.object({
  employeeId: z.string().refine(isObjectId, "Invalid employee id"),
  // .nullable() because "unassign this office" is a valid action (HR clearing
  // a field), distinct from .optional() which would mean "field can be omitted".
  officeAddressId: z.string().refine(isObjectId, "Invalid office id").nullable(),
  assignedEmail: z.string().email("Enter a valid email address").nullable(),
  assignedNumber: z
    .string()
    .regex(/^[0-9+\-\s]{7,15}$/, "Enter a valid phone number")
    .nullable(),
});

export type OfficeDetailsInput = z.infer<typeof officeDetailsSchema>;
```

**Why this way:** `nullable()` vs `optional()` is a deliberate, meaningful choice
here (not a typo) — this schema requires the client to always send all three
fields, explicitly as `null` if unset. That removes an entire class of "did they
mean to leave the number as-is, or did they forget to send it?" ambiguity that
`optional()` would introduce. `z.infer` derives the TypeScript type from the
schema itself, so the type and the runtime validation can never drift apart —
one source of truth instead of two.

**How to verify:** This file has no side effects yet (nothing imports it). Confirm
it compiles: `npx tsc --noEmit`. You can also sanity-check it interactively:
```bash
npx tsx -e "import { officeDetailsSchema } from './src/schemas/officeDetails.schema'; console.log(officeDetailsSchema.safeParse({ employeeId: '507f1f77bcf86cd799439011', officeAddressId: null, assignedEmail: 'not-an-email', assignedNumber: null }))"
```
should print `success: false` with a message about the email.

**Common mistakes:**
- Using `.optional()` instead of `.nullable()` — then a client that forgets to
  send `assignedNumber` silently leaves it validated-away instead of erroring,
  which hides bugs in whatever calls this API.
- Forgetting `mongoose.Types.ObjectId.isValid` returns `true` for some strings
  that "look like" ObjectIds but don't exist — this only validates *format*, not
  *existence*. Existence is checked separately in Step 5, at the database layer,
  where it belongs.

---

### Step 5 — Create the office-details API route (happy path)

**Goal:** The actual endpoint HR uses to read and write an employee's office
details.

**File:** `src/app/api/employee/office-details/route.ts` — **new file**, living
under `src/app/api/employee/` alongside the other focused, single-purpose employee
sub-object routes (`whatsapp-phone-mask/route.ts` is this route's closest sibling
in structure — read that file side-by-side with this one if anything looks
unfamiliar).

**Context:** New route, but it follows an existing, proven shape exactly:
`ensureHrOrSuperAdmin` guard clause → `connectDb()` → validate → touch the
database → shaped JSON response. Nothing else in the app calls this yet (that
comes in Step 9).

**The change:**

```ts
import { NextRequest, NextResponse } from "next/server";

import Employees from "@/models/employee";
import OfficeAddress from "@/models/officeAddress";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { officeDetailsSchema } from "@/schemas/officeDetails.schema";

export const dynamic = "force-dynamic";

// Guard clause: return early with a 403 instead of nesting the rest of the
// handler inside an `if (allowed)`. Keeps the "happy path" flat and readable.
function ensureHrOrSuperAdmin(role: unknown) {
  const r = String(role || "");
  if (r !== "HR" && r !== "SuperAdmin") {
    return NextResponse.json(
      { error: "Unauthorized. Only HR/SuperAdmin can manage office details." },
      { status: 403 },
    );
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const token = await getDataFromToken(request);
    const deny = ensureHrOrSuperAdmin((token as { role?: string }).role);
    if (deny) return deny;

    await connectDb();
    const employeeId = request.nextUrl.searchParams.get("employeeId") || "";
    if (!employeeId) {
      return NextResponse.json({ error: "employeeId is required" }, { status: 400 });
    }

    const employee = await Employees.findById(employeeId)
      .select("_id name officeDetails")
      // Resolve officeAddressId to { _id, name } so the UI can show a label,
      // not a raw ObjectId string.
      .populate("officeDetails.officeAddressId", "name")
      .lean();

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      officeDetails: employee.officeDetails ?? null,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string; message?: string };
    if (err?.status === 401 || err?.code) {
      return NextResponse.json({ code: err.code || "AUTH_FAILED" }, { status: err.status || 401 });
    }
    console.error("office-details GET error:", error);
    return NextResponse.json({ error: "Failed to load office details" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = await getDataFromToken(request);
    const deny = ensureHrOrSuperAdmin((token as { role?: string }).role);
    if (deny) return deny;

    await connectDb();
    const body = await request.json();

    const parsed = officeDetailsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 },
      );
    }
    const { employeeId, officeAddressId, assignedEmail, assignedNumber } = parsed.data;

    // Existence check belongs here (DB layer), not in Zod (format-only layer).
    if (officeAddressId) {
      const office = await OfficeAddress.findById(officeAddressId).select("_id");
      if (!office) {
        return NextResponse.json({ error: "Selected office was not found" }, { status: 400 });
      }
    }

    const updated = await Employees.findByIdAndUpdate(
      employeeId,
      { $set: { officeDetails: { officeAddressId, assignedEmail, assignedNumber } } },
      { new: true },
    )
      .select("_id name officeDetails")
      .populate("officeDetails.officeAddressId", "name");

    if (!updated) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, officeDetails: updated.officeDetails });
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string; message?: string };
    if (err?.status === 401 || err?.code) {
      return NextResponse.json({ code: err.code || "AUTH_FAILED" }, { status: err.status || 401 });
    }
    console.error("office-details PUT error:", error);
    return NextResponse.json({ error: "Failed to update office details" }, { status: 500 });
  }
}
```

**Why this way:** Auth check → parse/validate → business rule check (office
exists) → mutate → respond is a strict, repeatable **layered validation**
order: cheapest/fastest checks first (is this even a valid request shape?)
before the expensive one (a database round-trip). Notice the file has **zero
`any`** — every unknown value from the token or request body is narrowed with an
explicit cast or a Zod parse before use, matching this project's strict-typing
rule.

**How to verify:** Start the dev server, then from a terminal (swap in a real
employee `_id` and a valid HR/SuperAdmin auth cookie):
```bash
curl -X PUT http://localhost:3000/api/employee/office-details \
  -H "Content-Type: application/json" \
  --cookie "token=<your-token>" \
  -d '{"employeeId":"<id>","officeAddressId":null,"assignedEmail":"priya@zairointernational.com","assignedNumber":"+919876543210"}'
```
should return `{"success":true,"officeDetails":{...}}`. Then:
```bash
curl "http://localhost:3000/api/employee/office-details?employeeId=<id>" --cookie "token=<your-token>"
```
should echo it back.

**Common mistakes:**
- Calling this without a valid cookie/role returns a 403 — that's correct
  behavior, not a bug; don't "fix" it by removing the guard clause.
- Forgetting `.populate(...)` on the `GET` handler means the UI in Step 8 will
  receive a raw ObjectId string for `officeAddressId` and show `undefined` where
  it expects `.name`.

---

### Step 6 — Add duplicate-assignment error handling

**Goal:** Turn the raw MongoDB "duplicate key" crash from the Step 2 unique index
into a clear, actionable error message instead of a generic 500.

**File:** `src/app/api/employee/office-details/route.ts` (same file, `PUT` handler
only).

**Context:** Right now, if HR assigns an email/number that's already taken, the
`findByIdAndUpdate` call throws a raw MongoDB `E11000` error, which the outer
`catch` block turns into an unhelpful `"Failed to update office details"` / 500.
This step catches that *specific* error at the point it happens and responds with
a `409 Conflict` and a message HR can actually act on.

**The change:**

```ts
    // Existence check belongs here (DB layer), not in Zod (format-only layer).
    if (officeAddressId) {
      const office = await OfficeAddress.findById(officeAddressId).select("_id");
      if (!office) {
        return NextResponse.json({ error: "Selected office was not found" }, { status: 400 });
      }
    }

    let updated;
    try {
      updated = await Employees.findByIdAndUpdate(
        employeeId,
        { $set: { officeDetails: { officeAddressId, assignedEmail, assignedNumber } } },
        { new: true },
      )
        .select("_id name officeDetails")
        .populate("officeDetails.officeAddressId", "name");
    } catch (updateError: unknown) {
      const duplicateField = getDuplicateKeyField(updateError);
      if (duplicateField) {
        return NextResponse.json(
          {
            error:
              duplicateField === "officeDetails.assignedEmail"
                ? "This email is already assigned to another employee."
                : "This number is already assigned to another employee.",
          },
          { status: 409 }, // 409 Conflict: request is well-formed, but collides with existing state
        );
      }
      throw updateError; // anything else is unexpected — let the outer catch log & 500 it
    }

    if (!updated) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
```

And add this small helper near the top of the file, next to `ensureHrOrSuperAdmin`:

```ts
// True MongoDB duplicate-key errors have `code === 11000` and name the
// offending field in `keyPattern`. Mirrors the same detection used for the
// employeeCode unique index elsewhere in this project.
function getDuplicateKeyField(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const err = error as { code?: number; keyPattern?: Record<string, unknown> };
  if (err.code !== 11000 || !err.keyPattern) return null;
  return Object.keys(err.keyPattern)[0] ?? null;
}
```

**Why this way:** This is **handling the error at the layer that has enough
context to give a useful message**. The database layer only knows "duplicate key
on field X"; only *this* route knows that field X, translated to a human, means
"someone already has this email." Catching it here — not in a generic top-level
error handler — is what makes that translation possible. The narrow `try/catch`
around just the one call that can throw this specific error (instead of wrapping
the whole function) is deliberate: it means *only* this one failure mode gets
special-cased, and every other unexpected error still falls through to the normal
500 path untouched.

**How to verify:** Assign the same `assignedEmail` to two different employees via
two `PUT` calls (same value, different `employeeId`). The second call should now
return **409** with `"This email is already assigned to another employee."`
instead of a generic 500.

**Common mistakes:**
- Putting the `try/catch` around the *entire* handler instead of just the update
  call — then a validation bug elsewhere could accidentally get misreported as a
  "duplicate" error.
- Checking `error.code === 11000` without also checking `keyPattern` exists —
  some other, unrelated Mongo errors can reuse error codes in edge cases;
  `keyPattern` is what confirms it's specifically a unique-index violation.

---

### Step 7 — Populate `officeDetails.officeAddressId` in `getEmployeeDetails`

**Goal:** The person-detail page (Step 8) loads employee data through a
*different* route (`getEmployeeDetails`) than the one you just built. That route
also needs to resolve the office reference, or the card will only ever see a raw
ID.

**File:** `src/app/api/employee/getEmployeeDetails/route.ts` (existing route,
small addition).

**Context:** Today this route does `Employees.findOne({ _id: userId }).select("-password -passwordExpiresAt").lean()` and returns the whole document. It has no `.populate()` calls at all yet — this is the first one.

**The change:**

```ts
import Employees from "@/models/employee";
// Side-effect import: registers the OfficeAddress schema with Mongoose so
// .populate() below can resolve it. Without this, populating a ref to a
// model that's never been imported anywhere else in the request throws
// "Schema hasn't been registered for model \"OfficeAddress\"".
import "@/models/officeAddress";
import { connectDb } from "@/util/db";
import { EmployeeInterface } from "@/util/type";
import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
connectDb();
interface RequestBody {
  userId: string;
}
export async function POST(request: NextRequest) {
  try {
    await getDataFromToken(request);
    const reqBody: RequestBody = await request.json();
    const { userId } = reqBody;
    const user = await Employees.findOne({ _id: userId })
      .select("-password -passwordExpiresAt")
      .populate("officeDetails.officeAddressId", "name")
      .lean() as EmployeeInterface | null;
```

**Why this way:** This route is the app's single existing choke point for "give
me the full employee profile" — the person-detail page, the employee-detail page,
and warnings/PIP dialogs all go through it. Fixing the populate here once means
every consumer benefits, instead of duplicating this `.populate()` call in every
place that happens to need the office name.

**How to verify:** With an employee that already has `officeDetails.officeAddressId`
set from Step 6's `curl` test, call this route and confirm the response now has
`officeDetails.officeAddressId` as an object `{ _id, name }`, not a bare string.

**Common mistakes:**
- Forgetting the side-effect `import "@/models/officeAddress";` — the populate
  call will throw at request time, not at compile time, so this mistake only
  surfaces when you actually test it (a good reason to always do the "How to
  verify" step, not just trust the types).

---

## Part C — the UI card

### Step 8 — Add the read-only "Office Details" card

**Goal:** Make the new data visible on the page before adding any editing —
smallest possible visible, testable slice.

**File:** `src/app/dashboard/people/[candidateId]/page.tsx` (existing file,
Employment tab section, right after the existing "Employment profile" card).

**Context:** The Employment tab currently renders one `Card` showing
name/email/role/status/joined/organization, read-only with a link out to a
separate edit page (around line 1535). You're adding a second card in the same
style, for the fields *this* feature owns.

**The change:**

```tsx
                  {/* Employee Profile Card */}
                  <Card className="p-4 space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold uppercase tracking-wide">
                        Employment profile
                      </h2>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/editemployeedetails/${employee._id}`}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit profile
                        </Link>
                      </Button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <p className="text-sm"><span className="text-muted-foreground">Name: </span>{employee.name}</p>
                      <p className="text-sm"><span className="text-muted-foreground">Email: </span>{employee.email}</p>
                      <p className="text-sm"><span className="text-muted-foreground">Role: </span>{String(employee.role)}</p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Status: </span>
                        {employee.isActive ? "Active" : "Inactive"}
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Joined: </span>
                        {formatDate(employee.dateOfJoining)}
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Organization: </span>
                        {employee.organization || "VacationSaga"}
                      </p>
                    </div>
                  </Card>

                  {/* NEW: Office Details Card — feeds the HR email signature (Part D) */}
                  <Card className="p-4 space-y-4 mt-4">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold uppercase tracking-wide">
                        Office Details
                      </h2>
                      {/* Edit button added in Step 10, once the dialog exists */}
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <p className="text-sm">
                        <span className="text-muted-foreground">Location: </span>
                        {employee.officeDetails?.officeAddressId &&
                        typeof employee.officeDetails.officeAddressId === "object"
                          ? employee.officeDetails.officeAddressId.name
                          : "Not set"}
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Assigned Email: </span>
                        {employee.officeDetails?.assignedEmail || "Not set"}
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Assigned Number: </span>
                        {employee.officeDetails?.assignedNumber || "Not set"}
                      </p>
                    </div>
                  </Card>
```

**Why this way:** The `typeof employee.officeDetails.officeAddressId === "object"`
check is the **type guard** that Step 3's union type forced you to write — this
is exactly the compile-time safety net doing its job. Rendering `"Not set"` as a
fallback rather than `undefined`/blank is a small but real UX principle: never
show a raw "nothing" to a user; always show an explicit, worded absence.

**How to verify:** Open any employed person's page → Employment tab. You should
see the new "Office Details" card below "Employment profile", showing "Not set"
for all three fields (or real values if you ran Step 5/6's `curl` tests against
that employee).

**Common mistakes:**
- Skipping the `typeof` check and writing
  `employee.officeDetails?.officeAddressId?.name` directly — this compiles fine
  *only* if TypeScript still thinks the type is exclusively the object shape;
  with the correct union type from Step 3, this line will actually fail to
  compile, which is the type system correctly stopping you before a runtime bug.

---

### Step 9 — Build the Office Details edit dialog (standalone component)

**Goal:** Create the editing UI as its own self-contained component, following
this codebase's existing "small Dialog + its own fetch/save logic" pattern —
without wiring it into the page yet.

**File:** `src/features/people/components/OfficeDetailsDialog.tsx` — **new file**,
next to this project's other single-purpose person/employee dialogs
(`SeparatePersonDialog.tsx` lives in this exact folder). Compare this component
side-by-side with `src/app/whatsapp/components/WhatsAppPhoneMaskForm.tsx` — it's
the closest existing template (Dialog, loads current settings on open, one Save
button, one dedicated PUT route).

**Context:** New file. It isn't imported or rendered anywhere yet — that's Step
10. It's fully typeable and testable on its own right now.

**The change:**

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "@/util/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface OfficeOption {
  _id: string;
  name: string;
}

interface OfficeDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  onSaved: () => void; // parent's reloadEmployee(), called after a successful save
}

export function OfficeDetailsDialog({
  open,
  onOpenChange,
  employeeId,
  onSaved,
}: OfficeDetailsDialogProps) {
  const [offices, setOffices] = useState<OfficeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [officeAddressId, setOfficeAddressId] = useState<string>("");
  const [assignedEmail, setAssignedEmail] = useState("");
  const [assignedNumber, setAssignedNumber] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Public "active offices" list — no need to duplicate the HR-only
      // office-address manager check just to populate a dropdown.
      const [officesRes, currentRes] = await Promise.all([
        axios.get("/api/office-addresses?active=1"),
        axios.get("/api/employee/office-details", { params: { employeeId } }),
      ]);
      setOffices(officesRes.data?.data ?? []);
      const current = currentRes.data?.officeDetails;
      const currentOfficeId = current?.officeAddressId;
      setOfficeAddressId(
        currentOfficeId && typeof currentOfficeId === "object"
          ? currentOfficeId._id
          : currentOfficeId || "",
      );
      setAssignedEmail(current?.assignedEmail || "");
      setAssignedNumber(current?.assignedNumber || "");
    } catch {
      toast.error("Could not load office details");
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    if (open) {
      void loadData();
    } else {
      // Reset on close so stale values don't flash on next open.
      setOfficeAddressId("");
      setAssignedEmail("");
      setAssignedNumber("");
    }
  }, [open, loadData]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await axios.put("/api/employee/office-details", {
        employeeId,
        officeAddressId: officeAddressId || null,
        assignedEmail: assignedEmail.trim() || null,
        assignedNumber: assignedNumber.trim() || null,
      });
      toast.success("Office details updated");
      onSaved();
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Failed to save office details";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Office Details</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Location</Label>
              <Select value={officeAddressId} onValueChange={setOfficeAddressId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select office" />
                </SelectTrigger>
                <SelectContent>
                  {offices.map((o) => (
                    <SelectItem key={o._id} value={o._id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assigned-email">Assigned Email</Label>
              <Input
                id="assigned-email"
                type="email"
                value={assignedEmail}
                onChange={(e) => setAssignedEmail(e.target.value)}
                placeholder="priya@zairointernational.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assigned-number">Assigned Number</Label>
              <Input
                id="assigned-number"
                value={assignedNumber}
                onChange={(e) => setAssignedNumber(e.target.value)}
                placeholder="+91XXXXXXXXXX"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving || loading}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Why this way:** This component takes `employeeId` and `onSaved` as **props**
instead of reaching into global state or making page-specific assumptions — this
is **dependency injection** in its simplest form, and it's exactly why this same
component can be dropped onto the person-detail page *and* the older
`employeedetails` page later without modification. The `useEffect` that resets
state on close (not just loads on open) matters: without it, closing and
reopening the dialog for a *different* employee would briefly flash the previous
employee's data.

**How to verify:** `npx tsc --noEmit` should pass — the component is fully typed
and self-contained even though nothing renders it yet. (Full interactive
verification happens in Step 10, once it's actually mounted on the page.)

**Common mistakes:**
- Forgetting the `else` branch in the `useEffect` (resetting state on close) — a
  subtle bug that only shows up when a user edits one employee, closes, then
  opens the dialog for a different employee before the fetch resolves.
- Sending empty strings (`""`) instead of `null` for cleared fields — the PUT
  route's Zod schema expects `null` for "unset", and an empty string would fail
  the email/phone format validation instead of being treated as "no value".

---

### Step 10 — Wire the dialog into the person-detail page

**Goal:** Connect everything — Step 8's card, Step 9's dialog, and the page's
existing `reloadEmployee` — into one working feature.

**File:** `src/app/dashboard/people/[candidateId]/page.tsx` (same file as Step 8).

**Context:** `reloadEmployee` (defined around line 422) already exists and is
used by every other mutation on this page (warnings, PIP, appreciation) to
refresh employee state after a save. You're plugging into that exact same
mechanism, not inventing a new one.

**The change:** First, the import, next to the other feature-component imports:

```tsx
import { SeparatePersonDialog } from "@/features/people/components/SeparatePersonDialog";
import { OfficeDetailsDialog } from "@/features/people/components/OfficeDetailsDialog";
```

Then a new piece of dialog-open state, next to the other `useState` dialog flags
(near `separationDialogOpen`):

```tsx
  const [officeDetailsDialogOpen, setOfficeDetailsDialogOpen] = useState(false);
```

Then the card from Step 8 gets its "Edit" button:

```tsx
                  <Card className="p-4 space-y-4 mt-4">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold uppercase tracking-wide">
                        Office Details
                      </h2>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setOfficeDetailsDialogOpen(true)}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </div>
```

And finally, render the dialog itself alongside this page's other dialogs (near
where `SeparatePersonDialog` is rendered, towards the end of the JSX tree):

```tsx
      {employee && (
        <OfficeDetailsDialog
          open={officeDetailsDialogOpen}
          onOpenChange={setOfficeDetailsDialogOpen}
          employeeId={employee._id}
          onSaved={reloadEmployee}
        />
      )}
```

**Why this way:** Passing `reloadEmployee` straight into `onSaved` means the
dialog doesn't need to know *how* the parent refreshes its data — it just calls
back when it's done. This is the **observer/callback pattern**: the child
signals "something happened," the parent decides what that means. The
`{employee && (...)}` guard is a **guard clause for JSX** — it stops the dialog
from ever rendering (and therefore fetching) before there's a real
`employee._id` to fetch for.

**How to verify:** On an employed person's page, click "Edit" on the new Office
Details card → dialog opens with the office dropdown populated → pick an office,
type an email/number → Save → toast confirms → dialog closes → the card
immediately shows the new values (proving `reloadEmployee` actually re-fetched).

**Common mistakes:**
- Rendering `<OfficeDetailsDialog employeeId={employee._id} ... />` without the
  `employee &&` guard — this crashes at first render, since `employee` is `null`
  until the async load finishes.
- Forgetting to pass `reloadEmployee` (or passing a no-op function) — the save
  will still succeed on the server, but the card will look like nothing happened
  until the user refreshes the whole page.

---

## Part D — signature building blocks

### Step 11 — Add `location` to `EmailSignatureConfig` and the signature template

**Goal:** Teach the shared signature HTML generator how to render an optional
office-location line, before anything actually feeds it real data.

**File:** `src/lib/email/signature.ts` (existing file).

**Context:** `EmailSignatureConfig` currently has `name`, `title`, `website`,
`email`, `phone`, `logoUrl`. `getEmailSignature()` renders each of those as a row
in an HTML table. You're adding one more optional field and one more
conditionally-rendered row.

**The change:**

```ts
export interface EmailSignatureConfig {
  name?: string;
  title?: string;
  website?: string;
  email?: string;
  phone?: string;
  logoUrl?: string;
  /** e.g. "Noida Office". Omitted from the rendered signature when unset. */
  location?: string;
}
```

```ts
export const getEmailSignature = (config?: EmailSignatureConfig): string => {
  const {
    name = "Zairo International",
    title = "HR Manager",
    website = "zairointernational.com",
    email = "hr.zairointernational@gmail.com",
    phone = "+919519803665",
    logoUrl,
    location, // no default — an empty signature line is worse than no line
  } = config || {};
```

And, inside the returned template string, right after the existing Phone `<tr>`
block:

```html
              <tr>
                <td style="padding: 4px 0 0 0;">
                  <p style="margin: 0; font-size: 13px; color: #374151; font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6;">
                    <strong style="color: #1f2937;">Phone:</strong> 
                    <a href="tel:${phone}" style="color: #1f2937; text-decoration: none;">${phone}</a>
                  </p>
                </td>
              </tr>
              ${location ? `
              <tr>
                <td style="padding: 4px 0 0 0;">
                  <p style="margin: 0; font-size: 13px; color: #374151; font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6;">
                    <strong style="color: #1f2937;">Location:</strong> 
                    <span style="color: #1f2937;">${location}</span>
                  </p>
                </td>
              </tr>
              ` : ""}
```

**Why this way:** Making `location` **optional with no default** (rather than
defaulting to something like `"Head Office"`) means every *existing* call to
`getEmailSignature()` anywhere in the codebase — none of which pass `location`
today — renders **byte-for-byte identical output** to before this change. That's
the definition of a backward-compatible, non-breaking template change: old
behavior is a strict subset of new behavior. `${location ? \`...\` : ""}` is the
smallest possible way to express "render this block only if there's something
real to show."

**How to verify:** Trigger any existing email that already calls
`getEmailSignature()` (e.g. the request-reupload flow, unchanged so far) and
confirm the signature looks exactly as it did before — no blank "Location:" line
appears. This regression-check matters *before* Step 12 starts actually passing
a `location` value in.

**Common mistakes:**
- Giving `location` a default value like `""` instead of leaving it
  `undefined` — an empty string is still truthy-checked wrong in some ternaries
  and can render as a literal blank line depending on how the check is written;
  `undefined` unambiguously means "not provided."

---

### Step 12 — Create the `getActingUserSignature()` resolver

**Goal:** The single new function this entire feature revolves around: given
"who is acting right now," return the signature that should represent them —
office-assigned contact first, personal contact second, generic company details
as the last resort.

**File:** `src/lib/email/actingUserSignature.ts` — **new file**, next to the
existing `src/lib/email/getHREmployee.ts` (same folder, same responsibility
level: "produce an `EmailSignatureConfig`", just from a different, more specific
source of truth).

**Context:** `getHREmployee.ts`'s `getActiveHREmployee()` looks up "any active
HR" with no relation to who's logged in — that function isn't being deleted (it
stays as the final safety-net fallback), but it stops being the *primary* source
starting in Part E.

**The change:**

```ts
import { connectDb } from "@/util/db";
import Employees from "@/models/employee";
// Side-effect import — same reason as Step 7: registers the OfficeAddress
// schema so populate() below can resolve it.
import "@/models/officeAddress";
import { getActiveHREmployee } from "./getHREmployee";
import { EmailSignatureConfig } from "./signature";

/** The minimal shape every route already has available from getDataFromToken(). */
export interface ActingUser {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
}

const ROLE_TITLES: Record<string, string> = {
  HR: "HR Manager",
  SuperAdmin: "Super Admin",
};

// Same constants signature.ts already defaults to — kept here too so this
// resolver never has to import defaults out of a template-rendering file.
const FALLBACK_SIGNATURE_EMAIL = "hr.zairointernational@gmail.com";
const FALLBACK_SIGNATURE_PHONE = "+919519803665";

function resolveTitle(role: string | undefined): string {
  return ROLE_TITLES[role ?? ""] ?? "Team Member";
}

interface PopulatedOffice {
  _id: unknown;
  name: string;
}

/**
 * Builds the email signature for the employee actually performing an action —
 * as opposed to getActiveHREmployee(), which returns an arbitrary active HR
 * record unrelated to who's logged in. This is the one place every
 * HR/SuperAdmin-signed email should get its identity from.
 */
export async function getActingUserSignature(
  actingUser: ActingUser,
): Promise<EmailSignatureConfig> {
  try {
    await connectDb();

    const employee = actingUser.id
      ? await Employees.findById(actingUser.id)
          .select("name email phone role officeDetails")
          .populate("officeDetails.officeAddressId", "name")
          .lean()
      : null;

    // No employee doc at all — e.g. the "test-superadmin" QA bypass, which
    // getDataFromToken lets through with no real database record. Fall back
    // to whatever the token itself carried.
    if (!employee) {
      return {
        name: actingUser.name || "Zairo International",
        title: resolveTitle(actingUser.role),
        email: actingUser.email || FALLBACK_SIGNATURE_EMAIL,
        phone: FALLBACK_SIGNATURE_PHONE,
      };
    }

    const officeDetails = (
      employee as {
        officeDetails?: {
          officeAddressId?: PopulatedOffice | null;
          assignedEmail?: string | null;
          assignedNumber?: string | null;
        };
      }
    ).officeDetails;

    const officeName =
      officeDetails?.officeAddressId && typeof officeDetails.officeAddressId === "object"
        ? officeDetails.officeAddressId.name
        : undefined;

    return {
      name: employee.name || actingUser.name || "Zairo International",
      title: resolveTitle(actingUser.role || (employee as { role?: string }).role),
      // Office-assigned contact wins; personal login contact is the fallback
      // so nothing breaks for HR/SuperAdmin accounts before they fill the
      // Office Details card in.
      email: officeDetails?.assignedEmail || employee.email || FALLBACK_SIGNATURE_EMAIL,
      phone:
        officeDetails?.assignedNumber ||
        (employee as { phone?: string }).phone ||
        FALLBACK_SIGNATURE_PHONE,
      location: officeName,
    };
  } catch (error) {
    console.error("getActingUserSignature: falling back to generic signature:", error);
    // Last-resort safety net — never let a signature-lookup bug block a send.
    return getActiveHREmployee();
  }
}
```

**Why this way:** The three-tier fallback (office details → personal contact →
generic company defaults) is a deliberate **graceful degradation** chain: each
tier is strictly better than the one below it when available, but the system
never *breaks* just because a tier is missing. Catching errors at the very
bottom and falling back to `getActiveHREmployee()` (rather than letting an
exception propagate) means a bug in *this* function can never be the reason a
candidate email fails to send — the worst case is a slightly-less-personalized
signature, never a broken feature.

**How to verify:** This function has no caller yet, so verify it in isolation:
```bash
npx tsx -e "
import { getActingUserSignature } from './src/lib/email/actingUserSignature';
getActingUserSignature({ id: '<a real employee _id>', role: 'HR' }).then(console.log);
"
```
should print an object with `name`, `title: 'HR Manager'`, and whatever
`email`/`phone`/`location` that employee currently has (real full verification
happens once Step 16 wires it into a live route).

**Common mistakes:**
- Forgetting the `import "@/models/officeAddress"` side-effect import — same
  failure mode as Step 7, but here it would silently produce `location:
  undefined` instead of throwing, because the `typeof === "object"` check
  quietly treats an unpopulated ID as "not populated" — a bug that hides itself.
- Reaching for `getActiveHREmployee()` as the *first* fallback instead of the
  *last* — that would defeat the entire point of this feature by falling back
  to "some other HR person" before falling back to "this person's own personal
  contact info."

---

### Step 13 — Add the `HR_FROM_EMAIL` constant

**Goal:** Fix the "From" address so it always matches the account
`createTransporterHR()` actually authenticates as — closing the Gmail
From/SMTP-auth mismatch identified earlier.

**File:** `src/lib/email/transporter.ts` (existing file).

**Context:** `DEFAULT_FROM_EMAIL` (`admistro.in@gmail.com`) is currently reused
for HR-signed emails even though `createTransporterHR()` authenticates as
`hr.zairointernational@gmail.com` — a different address. You're adding a second,
correctly-paired constant rather than changing what `DEFAULT_FROM_EMAIL` means
(it's still correct for `createTransporter()`'s non-HR emails, like personal
reminders).

**The change:**

```ts
export const DEFAULT_FROM_EMAIL = "admistro.in@gmail.com";

// Matches the account createTransporterHR() actually authenticates as.
// Use this — not DEFAULT_FROM_EMAIL — for anything sent through
// createTransporterHR(); otherwise Gmail sees a "From" address that doesn't
// match the authenticated account, which can get the message flagged or
// silently rewritten.
export const HR_FROM_EMAIL = "hr.zairointernational@gmail.com";
```

**Why this way:** One constant, one clearly-scoped job, named after *what it's
for* rather than *what its value is* — `HR_FROM_EMAIL`, not
`SECOND_GMAIL_ADDRESS`. This is the same "name things by role, not by shape"
principle already followed by `DEFAULT_FROM_EMAIL` and `DEFAULT_COMPANY_NAME` in
this same file.

**How to verify:** `npx tsc --noEmit` — additive export, nothing consumes it
until Step 14.

**Common mistakes:**
- None specific to this step — it's a single constant. The mistake to watch for
  is in *later* steps: forgetting to actually switch a `from:` line over to this
  new constant and leaving `DEFAULT_FROM_EMAIL` in place for an HR email.

---

## Part D (continued) — wiring the resolver into the shared senders

### Step 14 — Add `actingUser` to `sendCandidateEmail` (and its `sendEmail` alias)

**Goal:** Teach the *first* of six shared "send this kind of email" functions how
to accept and use a real acting user — establishing the pattern the rest of Part
D repeats.

**File:** `src/lib/email/index.ts` (existing file).

**Context:** `sendCandidateEmail` currently always calls `getActiveHREmployee()`
internally, with no way for a caller to override it. You're making the acting
user an **optional** parameter for now — optional, not required, is the key
choice here (explained below) — so every existing caller keeps compiling
untouched until Part E updates them one at a time.

**The change:** update the imports at the top of the file:

```ts
import { getActiveHREmployee } from "./getHREmployee";
import { getActingUserSignature, type ActingUser } from "./actingUserSignature";
```

Add the re-export so other files can import it from the `@/lib/email` barrel
(several routes in Part E do exactly that):

```ts
export { getActiveHREmployee } from "./getHREmployee";
export type { HREmployee } from "./getHREmployee";
export { getActingUserSignature } from "./actingUserSignature";
export type { ActingUser } from "./actingUserSignature";
```

Then `sendCandidateEmail` itself:

```ts
// Send Candidate Email
export async function sendCandidateEmail(
  payload: CandidateEmailPayload,
  actingUser?: ActingUser, // who is actually sending this; optional for now — see Step 22
): Promise<EmailResponse> {
  try {
    // Personalized signature when we know who's acting; otherwise the old
    // generic-HR fallback, so any caller not yet updated keeps working.
    const signature = actingUser
      ? await getActingUserSignature(actingUser)
      : await getActiveHREmployee();
    const { subject, html } = getCandidateEmailTemplate(payload, signature);
    const transporter = createTransporterHR();

    const mailOptions = {
      // Personalize the display name; keep the address matching the SMTP auth user.
      from: `"${signature.name} · HR, ${payload.companyName || DEFAULT_COMPANY_NAME}" <${HR_FROM_EMAIL}>`,
      replyTo: signature.email, // replies reach the acting HR/SuperAdmin directly
      to: payload.to,
      subject,
      html,
    };

    const mailResponse = await transporter.sendMail(mailOptions);
```

And update the transporter import line at the very top to pull in the new
constant:

```ts
import {
  createTransporter,
  createTransporterHR,
  DEFAULT_FROM_EMAIL,
  HR_FROM_EMAIL,
  DEFAULT_COMPANY_NAME,
} from "./transporter";
```

Finally, the tiny backward-compatible `sendEmail` alias needs to forward the new
parameter too, or every call through it (like the candidate-status route in Step
20) would have no way to pass one through:

```ts
// Generic send email function (backward compatible)
export async function sendEmail(
  payload: CandidateEmailPayload,
  actingUser?: ActingUser,
): Promise<EmailResponse> {
  return sendCandidateEmail(payload, actingUser);
}
```

**Why this way:** Making `actingUser` **optional** here — even though the whole
point of this feature is that it should always be provided — is a deliberate
**expand/contract migration**: "expand" the function to accept the new thing
without requiring it yet (this step), update every real call site to actually
pass it (Part E), then "contract" the signature to require it once nothing can
possibly omit it (Step 23). Skipping straight to `actingUser: ActingUser`
(required) right now would make this file fail to compile the moment you save
it, because eight other files still call these functions without a second
argument — and none of those eight are fixed yet. Doing it this way means the
app **stays green after every single commit**, not just at the very end.

**How to verify:** `npx tsc --noEmit` should still pass — every existing caller
of `sendCandidateEmail`/`sendEmail` (still just passing one argument) remains
valid, because the new parameter is optional. Manually trigger any flow that
already calls `sendEmail`/`sendCandidateEmail` (e.g. change a candidate's status)
— the email should send exactly as before, using the old generic signature,
since no caller passes `actingUser` yet.

**Common mistakes:**
- Making `actingUser` required in this step "since we're going to need it
  anyway" — this is the single most likely way to break the build for the rest
  of this guide, since seven other files haven't been touched yet.
- Forgetting to update the `sendEmail` alias — `sendCandidateEmail` would support
  personalization, but the candidate-status route (which calls `sendEmail`, not
  `sendCandidateEmail` directly) would have no way to use it.

---

### Step 15 — Apply the same pattern to the remaining five wrapper functions

**Goal:** Repeat exactly what Step 14 just established — optional `actingUser`
param, personalized `from`/`replyTo` — across `sendWarningEmail`, `sendPIPEmail`,
`sendPIPCompletionEmail`, `sendAppreciationEmail`, and `sendSeparationEmail`.

**File:** `src/lib/email/index.ts` (same file, same pattern, four more times plus
one function with a slightly different shape).

**Context:** These four functions are structurally identical to
`sendCandidateEmail` — same three lines change in each (signature param,
signature resolution, `from`/`replyTo`). `sendPIPCompletionEmail` differs because
it takes positional arguments instead of one payload object; the same idea still
applies, just as a new trailing parameter.

**The change** (repeat this shape for each of the four payload-based functions —
shown once for `sendWarningEmail`, apply identically to `sendPIPEmail` and
`sendAppreciationEmail`):

```ts
export async function sendWarningEmail(
  payload: WarningEmailPayload,
  actingUser?: ActingUser,
): Promise<EmailResponse> {
  try {
    const signature = actingUser
      ? await getActingUserSignature(actingUser)
      : await getActiveHREmployee();
    const { subject, html } = getWarningEmailTemplate(payload, signature);
    const transporter = createTransporterHR();

    const mailOptions = {
      from: `"${signature.name} · HR, ${payload.companyName || DEFAULT_COMPANY_NAME}" <${HR_FROM_EMAIL}>`,
      replyTo: signature.email,
      to: payload.to,
      subject,
      html,
    };
```

For `sendSeparationEmail`, identical shape, just with `getSeparationEmailTemplate`
and `SeparationEmailPayload` as already exist in that function today.

For `sendPIPCompletionEmail` (positional args — add the new parameter at the
end):

```ts
export async function sendPIPCompletionEmail(
  to: string,
  employeeName: string,
  pipLevel: PIPLevel,
  startDate: string,
  endDate: string,
  companyName?: string,
  actingUser?: ActingUser,
): Promise<EmailResponse> {
  try {
    const signature = actingUser
      ? await getActingUserSignature(actingUser)
      : await getActiveHREmployee();
    const { subject, html } = getPIPCompletionEmailTemplate(
      employeeName,
      pipLevel,
      startDate,
      endDate,
      companyName || DEFAULT_COMPANY_NAME,
      signature,
    );
    const transporter = createTransporterHR();

    const mailOptions = {
      from: `"${signature.name} · HR, ${companyName || DEFAULT_COMPANY_NAME}" <${HR_FROM_EMAIL}>`,
      replyTo: signature.email,
      to,
      subject,
      html,
    };
```

**Why this way:** This is intentional, disciplined repetition — once you've
verified the pattern works correctly in Step 14, mechanically applying the exact
same shape five more times is *safer* than trying to cleverly abstract it into a
shared helper right now (that abstraction can come later, once the pattern has
proven itself in production; extracting too early is its own kind of risk).
Recognizing "I've solved this exact shape of problem already" and repeating the
known-good solution is itself a real engineering skill.

**How to verify:** `npx tsc --noEmit` should stay clean. Trigger a Warning, PIP,
Appreciation, or Separation email exactly as before (through the existing UI) —
each should still send successfully with the old generic signature, since none
of their callers pass `actingUser` yet.

**Common mistakes:**
- Copy-pasting `sendWarningEmail`'s block into `sendPIPCompletionEmail` without
  adjusting for its positional-argument shape — the new parameter must go at the
  very end, after `companyName`, not replace any existing parameter.
- Forgetting to pass the (renamed) `signature` variable into the template
  function call itself — e.g. leaving `getPIPCompletionEmailTemplate(..., hrEmployee)`
  instead of updating it to `..., signature)` after renaming the variable.

---

## Part E — propagate to every call site

### Step 16 — `request-reupload/route.ts`

**Goal:** The first real, live route to actually benefit from Part D's work.

**File:** `src/app/api/candidates/[id]/request-reupload/route.ts` (existing
file).

**Context:** This route already captures `userId`/`userName`/`userRole` from the
token — for the `requestedBy` audit-trail field. It currently, separately, calls
`getActiveHREmployee()` for the email signature, completely unrelated to that
already-resolved user. You're pointing the signature at the same person instead
of a second, unrelated lookup.

**The change:** update the imports:

```ts
import { createTransporterHR, HR_FROM_EMAIL } from "@/lib/email/transporter";
import { getActingUserSignature } from "@/lib/email/actingUserSignature";
import { getEmailSignature } from "@/lib/email/signature";
```

Then, in the email-sending block:

```ts
    // Send email to candidate
    try {
      const signature = await getActingUserSignature({
        id: userId,
        name: userName,
        email: token.email as string,
        role: userRole,
      });
      const transporter = createTransporterHR();
```

And further down, where the mail is actually sent:

```ts
            ${getEmailSignature(signature)}
          </div>
          ...
      const mailResponse = await transporter.sendMail({
        from: `"${signature.name} · HR, Zairo International" <${HR_FROM_EMAIL}>`,
        replyTo: signature.email,
        to: candidate.email,
        subject: "Document Re-upload Required - Zairo International",
        html: emailHtml,
      });
```

**Why this way:** Notice `userName` — already resolved a few lines earlier with
its own DB-fallback logic for the `requestedBy` audit field — gets passed
straight into `getActingUserSignature`'s `actingUser` argument. There's no need
to duplicate that fallback logic; the resolver does its *own* authoritative
lookup by `id` anyway, and only falls back to the `name` you hand it if no
employee record is found at all. Reusing a variable that's already correct,
rather than re-deriving the same fact twice, is straightforward **DRY**
(Don't Repeat Yourself).

**How to verify:** Log in as a specific HR employee (not SuperAdmin), trigger a
document re-upload request for any onboarding candidate, and open the resulting
email — the signature block should show *that specific HR employee's* name, and
(once Step 10's card has been filled in for them) their assigned email/number/
office, not a generic company signature.

**Common mistakes:**
- Leaving the old `getActiveHREmployee` import in place unused — TypeScript
  won't error on an unused import by default in this project's config, but it's
  a sign you missed removing a now-dead code path; delete it.
- Forgetting to swap `DEFAULT_FROM_EMAIL` for `HR_FROM_EMAIL` in the `from:` line
  — the personalized display name would show correctly, but the underlying
  address would still be the mismatched one this whole fix was partly about.

---

### Step 17 — `request-resignature/route.ts`

**Goal:** Same fix, second route.

**File:** `src/app/api/candidates/[id]/request-resignature/route.ts` (existing
file).

**Context:** Nearly identical shape to Step 16 — this route also already
resolves `userName` for its own audit field (`requestedBy`), and separately
calls `getActiveHREmployee()` plus builds its own `hrName`/`hrEmail` locals for
the `from` header.

**The change:** imports:

```ts
import { createTransporterHR, HR_FROM_EMAIL } from "@/lib/email/transporter";
import { getActingUserSignature } from "@/lib/email/actingUserSignature";
import { getEmailSignature } from "@/lib/email/signature";
```

Replace the old signature-building block:

```ts
      const hrEmployee = await getActiveHREmployee();
      const hrEmail = hrEmployee?.email || DEFAULT_FROM_EMAIL;
      const hrName = hrEmployee?.name || "HR Team";

      const agreementName = agreementType === "training" 
        ? "Training Agreement" 
        : "Onboarding Agreement";

      await transporter.sendMail({
        from: `"${hrName}" <${hrEmail}>`,
```

with:

```ts
      const signature = await getActingUserSignature({
        id: userId,
        name: userName,
        email: token.email as string,
        role: userRole,
      });

      const agreementName = agreementType === "training" 
        ? "Training Agreement" 
        : "Onboarding Agreement";

      await transporter.sendMail({
        from: `"${signature.name} · HR, Zairo International" <${HR_FROM_EMAIL}>`,
        replyTo: signature.email,
```

And note the `const emailSignature = await getEmailSignature(hrEmployee);` line
higher up — `getEmailSignature` is a plain synchronous function (it doesn't
`return` a `Promise`), so drop the unnecessary `await` while you're renaming its
argument:

```ts
      const emailSignature = getEmailSignature(signature);
```

**Why this way:** Same reasoning as Step 16. The synchronous/`await` cleanup is
a small, low-risk drive-by fix — `await`ing a non-Promise value doesn't cause
bugs (it just resolves immediately), but leaving it in would incorrectly signal
to a future reader that this function does asynchronous work.

**How to verify:** Trigger an agreement re-signature request as a specific HR
employee; confirm the email's `From` display name and the signature block both
show that employee, and a reply would land in their assigned/personal email
(check the raw email headers if your mail client shows them).

**Common mistakes:**
- Also removing the `if (!userName && userId) { ... }` DB-fallback block a few
  lines above — **don't**. That block feeds the `requestedBy` audit-trail field
  elsewhere in this file, a completely separate concern from the signature.
  Removing it would leave `requestedBy` blank for tokens that happen to omit
  `name`.

---

### Step 18 — `send-offer-letter/route.ts`

**Goal:** Fix the one route in this group that wasn't even capturing its own
token, and had no role restriction at all.

**File:** `src/app/api/candidates/[id]/send-offer-letter/route.ts` (existing
file).

**Context:** Today, `await getDataFromToken(request);` runs (so *some* valid
session is required) but its return value is thrown away, and there's no check
that the caller is HR/SuperAdmin specifically — any logged-in employee could
send an appointment letter. You're capturing the token, restricting the role
(matching its siblings in Steps 16–17), and using it for the signature.

**The change:**

```ts
import { createTransporterHR, HR_FROM_EMAIL } from "@/lib/email/transporter";
import { getActingUserSignature } from "@/lib/email/actingUserSignature";
import { getEmailSignature } from "@/lib/email/signature";
import { getDataFromToken } from "@/util/getDataFromToken";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getDataFromToken(request);
    const userRole = token.role as string;
    if (!["HR", "SuperAdmin"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Only HR and SuperAdmin can send offer letters." },
        { status: 403 }
      );
    }
    const { id } = await params;
    await connectDb();
```

Then further down, replace:

```ts
    // Get HR employee details for email
    const hrEmployee = await getActiveHREmployee();
    const emailSignature = await getEmailSignature(hrEmployee);
    const transporter = createTransporterHR();
```

with:

```ts
    // Signature reflects whichever HR/SuperAdmin is actually sending this letter
    const signature = await getActingUserSignature({
      id: token.id as string,
      name: token.name as string,
      email: token.email as string,
      role: userRole,
    });
    const emailSignature = getEmailSignature(signature);
    const transporter = createTransporterHR();
```

And the send call:

```ts
    await transporter.sendMail({
      from: `"${signature.name} · HR, Zairo International" <${HR_FROM_EMAIL}>`,
      replyTo: signature.email,
      to: candidate.email,
      subject: `Appointment Letter - ${candidate.name}`,
      html: emailHtml,
    });
```

**Why this way:** This route's `from:` address was already
`hr.zairointernational@gmail.com` (correctly matching the transporter), so this
step is purely about *who gets credited* — adding the missing role check here is
the same **guard clause** already used in Steps 16–17, applied for consistency
rather than leaving one route in this family less protected than its siblings.

**How to verify:** Try calling this route logged in as a non-HR/non-SuperAdmin
employee — it should now return 403 (previously it would have succeeded). Then,
as an HR employee, send an offer letter and confirm the signature reflects them
specifically.

**Common mistakes:**
- Forgetting this route's `import` list didn't previously include
  `getDataFromToken`'s result being *used* anywhere — make sure `token` is
  actually referenced now (an unused-but-captured variable is a sign something's
  wired wrong).

---

### Step 19 — `email/generateTemplate/route.ts`

**Goal:** Close the second auth gap you asked to bundle into this fix — this
route currently has no authentication at all.

**File:** `src/app/api/email/generateTemplate/route.ts` (existing file).

**Context:** This route is called from the warnings/PIP/appreciation dialogs on
the person-detail page to generate an HTML *preview* before sending. It has zero
auth today — anyone who can reach the URL can generate signed-looking HR email
HTML. You're adding the same HR/SuperAdmin guard clause used everywhere else in
this guide, and personalizing the preview to whoever's actually about to send it.

**The change:**

```ts
import { NextRequest, NextResponse } from "next/server";
import {
  getWarningEmailTemplate,
  getPIPEmailTemplate,
  getAppreciationEmailTemplate,
  getActingUserSignature,
  getPIPCompletionEmailTemplate,
} from "@/lib/email";
import { WarningType, PIPLevel, AppreciationType } from "@/lib/email/types";
import { getDataFromToken } from "@/util/getDataFromToken";

export async function POST(request: NextRequest) {
  try {
    const token = await getDataFromToken(request);
    const userRole = token.role as string;
    if (!["HR", "SuperAdmin"].includes(userRole)) {
      return NextResponse.json(
        { error: "Unauthorized. Only HR and SuperAdmin can preview email templates." },
        { status: 403 }
      );
    }

    const { type, payload } = await request.json();

    if (!type || !payload) {
      return NextResponse.json(
        { error: "Type and payload are required" },
        { status: 400 }
      );
    }

    // Signature reflects whoever is previewing/about to send this email
    const hrEmployee = await getActingUserSignature({
      id: token.id as string,
      name: token.name as string,
      email: token.email as string,
      role: userRole,
    });
```

The rest of the function (the `switch (type)` block) stays exactly as-is — it
already just passes `hrEmployee` through to each template function, which is now
a personalized signature instead of a generic one, with zero further changes
needed there.

**Why this way:** Bundling this auth fix in here (as you asked) means this
preview endpoint can no longer be hit by an unauthenticated request — closing
exactly the same class of gap Step 18 closed, in the same pass, rather than as a
separate, easy-to-forget follow-up.

**How to verify:** Call this route with no auth cookie — should now return 401
(via `getDataFromToken` throwing) instead of successfully generating HTML. As a
logged-in HR employee, open the Warning dialog on the person-detail page and
preview an email — the signature in the preview should already reflect you,
before you even click send.

**Common mistakes:**
- Only checking `getDataFromToken` succeeds (i.e. *some* valid session) without
  also checking `["HR", "SuperAdmin"].includes(userRole)` — that would fix
  "unauthenticated access" but not "any employee, regardless of role, can
  generate HR-signed content."

---

### Step 20 — `candidates/[id]/action/route.ts`

**Goal:** Close the last, most important auth gap — this route changes a
candidate's status and sends them a real email, with **no authentication check
of any kind** today.

**File:** `src/app/api/candidates/[id]/action/route.ts` (existing file).

**Context:** This route has no `getDataFromToken` import at all right now.
Anyone who can reach this endpoint (no login required) can move a candidate
through the hiring pipeline and trigger real candidate-facing emails.

**The change:**

```ts
import { sendEmail } from "@/components/candidateEmail";
import Candidate from "@/models/candidate";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDb();

  try {
    const token = await getDataFromToken(request);
    const userRole = token.role as string;
    if (!["HR", "SuperAdmin"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Only HR and SuperAdmin can change a candidate's status." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const { status, selectionDetails, shortlistDetails, rejectionDetails, isTrainingDiscontinuation} =
      await request.json();
```

Then, further down, pass the token into the existing `sendEmail` call:

```ts
      try {
        await sendEmail(
          {
            to: candidate.email,
            candidateName: candidate.name,
            status: emailStatus as any,
            position: candidate.position,
            companyName: process.env.COMPANY_NAME || "Zairo International",
            selectionDetails: status === "selected" ? selectionDetails : undefined,
            rejectionReason:
              status === "rejected" ? rejectionDetails?.reason : undefined,
            shortlistRoles:
              status === "shortlisted"
                ? shortlistDetails?.suitableRoles
                : undefined,
            onboardingLink: status === "onboarding" ? ( candidate.onboardingDetails?.onboardingLink || "") as string | undefined : undefined,
            trainingAgreementLink: trainingAgreementLink || (status === "selected" ? candidate.trainingAgreementDetails?.signingLink || "" : undefined) as string | undefined,
          },
          token, // who actually changed this candidate's status
        );
```

**Why this way:** This is the highest-impact fix in the entire guide — it turns
a completely open endpoint into one that requires the exact same HR/SuperAdmin
guard clause you've now applied consistently everywhere else. This is what
"defense in depth done consistently" looks like: the same three-line check,
copy-pasted deliberately, rather than each route inventing its own variant.

**How to verify:** Call this route with no auth cookie — should now return 403
instead of successfully changing candidate status. As a logged-in HR employee,
change a candidate's status through the normal UI and confirm the resulting
email's signature reflects you.

**Common mistakes:**
- This route's `updateData` logic and status-branching are completely unrelated
  to this fix — resist the urge to "clean up" that code while you're in here;
  keep this change scoped to auth + passing `token` through.

---

### Step 21 — `schedule-interview`, `schedule-second-round`, `approve-reschedule`

**Goal:** These three routes already capture `token` at the top (unlike the ones
above) — the fix here is the smallest possible: pass it into the `sendEmail`
call that already exists.

**Files:**
- `src/app/api/candidates/[id]/schedule-interview/route.ts`
- `src/app/api/candidates/[id]/schedule-second-round/route.ts`
- `src/app/api/candidates/[id]/approve-reschedule/route.ts` (two call sites in
  this one file — approval and rejection)

**Context:** All three already do `const token = await getDataFromToken(request);`
near the top of their handlers. None of them currently pass anything to
`sendEmail(...)`.

**The change** — in `schedule-interview/route.ts`:

```ts
      await sendEmail({
        to: updatedCandidate.email,
        candidateName: updatedCandidate.name,
        status: "interview",
        position: updatedCandidate.position,
        companyName: process.env.COMPANY_NAME || "Zairo International",
        interviewDetails: {
          scheduledDate,
          scheduledTime,
          interviewMode,
          officeName: officeResolution.officeName || undefined,
          officeAddress: officeResolution.address,
          googleMapsLink:
            /* ...unchanged... */
        },
      }, token);
```

In `schedule-second-round/route.ts` — identical change, same closing
`}, token);`.

In `approve-reschedule/route.ts` — both the approval-branch `sendEmail(...)` call
and the rejection-branch `sendEmail(...)` call each get the same treatment:
`}, token);` instead of `});`.

**Why this way:** Once the shared function (Step 14/15) accepts an optional
second argument, every call site that already *has* a `token` in scope becomes a
one-token change. This step is intentionally the easiest one in the whole
guide — it's proof that the hard design work happened earlier (Steps 11–15), not
here.

**How to verify:** Schedule (or reschedule) an interview as a specific HR
employee and confirm the candidate's confirmation email is now signed by that
employee specifically, not a generic HR signature.

**Common mistakes:**
- Adding `token` as a *named* property inside the payload object (e.g.
  `{ ..., token }`) instead of as the function's second, separate argument
  (`}, token)`) — that would silently do nothing, since `sendEmail`'s first
  parameter is typed as `CandidateEmailPayload`, which has no `token` field, so
  it'd just be ignored (or, with strict object literal checks, cause a type
  error — either way, not what you want).

---

### Step 22 — `warnings`, `pip`, `appreciations`, `separation`, `exit` routes

**Goal:** These five routes have the *same* bug as `send-offer-letter` did in
Step 18 — they call `getDataFromToken(request)` but throw away the result. Fix
all five with the same two-line change.

**Files:**
- `src/app/api/employee/warnings/route.ts`
- `src/app/api/employee/pip/route.ts`
- `src/app/api/employee/appreciations/route.ts`
- `src/app/api/employee/separation/route.ts`
- `src/app/api/candidates/[id]/exit/route.ts`

**Context:** Each of these has a line like `await getDataFromToken(request);`
near the top of its `POST` handler — checked for validity, but the payload
itself was never kept. Each also calls one of the Part D wrapper functions
(`sendWarningEmail`, `sendPIPEmail`, `sendAppreciationEmail`, `sendSeparationEmail`
twice across two files) without a second argument.

**The change** — shown for `warnings/route.ts`, apply the same shape to the
other four:

```ts
export async function POST(request: NextRequest) {
  try {
    const token = await getDataFromToken(request);
    await connectDb();
```

*(was: `await getDataFromToken(request);` with no assignment)*

```ts
      } else {
        const emailResult = await sendWarningEmail({
          to: employee.email,
          employeeName: employee.name,
          warningType: warningType as WarningType,
          department,
          reportingManager,
          date,
          dateTime: date, // For combined warning
        }, token);
        emailSent = emailResult.success;
      }
```

Apply identically to:
- `pip/route.ts` → `sendPIPEmail({...}, token)`
- `appreciations/route.ts` → `sendAppreciationEmail({...}, token)`
- `separation/route.ts` → `sendSeparationEmail({...}, token)`
- `exit/route.ts` → `sendSeparationEmail({...}, token)`

**Why this way:** Same reasoning as Step 21 — this is deliberate, recognized
repetition of one small, well-understood fix across every file that has the
exact same shape of bug. Doing all five in one step (rather than five separate
guide entries) reflects that they really are one mechanical change, not five
different design decisions.

**How to verify:** Issue a warning (or PIP, appreciation, separation, or exit) to
an employee, with email sending enabled, as a specific logged-in HR employee.
Each resulting email's signature should reflect that specific person.

**Common mistakes:**
- `separation/route.ts` has a *second*, unrelated `GET` handler (for template
  previews) that has no auth at all and still calls `getActiveHREmployee()`
  directly — this step does **not** touch that; it's a separate, optional
  follow-up (see the note at the end of this guide) since it wasn't part of the
  originally agreed scope.

---

## Part F — contract hardening & rollout

### Step 23 — Tighten `actingUser` from optional to required

**Goal:** Now that every real call site (Steps 16–22) passes an `actingUser`,
close off the "someone forgets to pass it" escape hatch for good — the
"contract" half of the expand/contract migration started in Step 14.

**File:** `src/lib/email/index.ts` (same six functions from Steps 14–15).

**Context:** Right now, `actingUser?: ActingUser` (optional) with an internal
`actingUser ? ... : getActiveHREmployee()` fallback means a *future* new call
site could easily forget to pass it and silently regress back to a generic
signature, with no error to catch the mistake. Making it required turns that
mistake into a compile error instead.

**The change** — for each of the six functions, remove the `?` and the
fallback ternary:

```ts
export async function sendCandidateEmail(
  payload: CandidateEmailPayload,
  actingUser: ActingUser, // no longer optional — every caller must know who's acting
): Promise<EmailResponse> {
  try {
    const signature = await getActingUserSignature(actingUser);
    const { subject, html } = getCandidateEmailTemplate(payload, signature);
```

Repeat for `sendWarningEmail`, `sendPIPEmail`, `sendPIPCompletionEmail`,
`sendAppreciationEmail`, `sendSeparationEmail`, and the `sendEmail` alias.

**Why this way:** This is "make invalid states unrepresentable" — instead of a
runtime fallback quietly papering over a missing argument, TypeScript itself now
refuses to compile any code that omits it. This is exactly why Step 14 chose
*optional* first: doing this tightening as the *very last* step, once every real
caller has already been updated and verified working, means this change is
risk-free — it can only fail to compile if you missed one of Steps 16–22, which
is precisely the safety net you want.

**How to verify:** `npx tsc --noEmit`. If it fails, the error message will point
you at exactly which call site in Steps 16–22 you missed — that's the intended
behavior, not a bug in this step.

**Common mistakes:**
- Doing this step *before* Part E is fully done — that's the one ordering
  mistake this whole guide is structured to prevent. If you're tempted to jump
  ahead, don't; this step is deliberately last for a reason.

---

### Step 24 — Production rollout checklist

**Goal:** Ship all of the above safely to a real environment.

**File:** N/A — this step is deployment actions, not code.

**Context:** The unique indexes from Step 2 need to exist in the production
database before real traffic starts writing `officeDetails`, the same lesson
already applied for this project's `employeeCode` feature.

**The change** (commands to run against production, in order):

```bash
# 1. Deploy all the code from Steps 1–23.
# 2. Create the two new unique+sparse indexes in the production database:
npm run db:sync-indexes
# 3. Smoke test, in order:
#    a. Open any employed person's page → Employment tab → confirm the new
#       Office Details card renders ("Not set" is expected pre-rollout).
#    b. Fill in Office Details for one HR test account.
#    c. Trigger one real email from that account (e.g. a warning or a
#       document re-upload request) and confirm the signature/From/Reply-To
#       all reflect that specific account.
#    d. Confirm a *different* HR account, with no Office Details filled in
#       yet, still sends a working (personalized-by-name, generic-contact)
#       email — this is Step 12's fallback chain working as designed.
```

**Why this way:** Running the index sync *before* any real writes matches this
project's existing rollout convention exactly (see the `employeeCode` feature).
Smoke-testing both the "fully configured" and "not configured yet" paths
explicitly is what actually proves the fallback chain from Step 12 works, rather
than just assuming it does because the code looks right.

**How to verify:** All four smoke-test sub-steps above pass with no errors and
the signatures look correct in a real inbox (not just the JSON response).

**Common mistakes:**
- Only testing with one, fully-configured HR account — that's the *easy* path
  through Step 12's fallback chain. The account with nothing filled in is the
  one that actually proves the feature doesn't break anything for accounts that
  haven't adopted it yet.

---

## Optional follow-up (not part of this guide's scope)

While wiring Step 22, you'll notice `src/app/api/employee/separation/route.ts`
has a second handler — `GET`, used for template previews — with **no
authentication at all**, still calling `getActiveHREmployee()` directly. This is
the same class of gap Steps 19–20 closed elsewhere, but it wasn't part of what
you asked to bundle into this fix. Worth a follow-up guide of its own.

---

## Concepts used

A cheat sheet of every principle/pattern this guide applied, so you can
recognize them again elsewhere:

- **Guard clause** — return early on a failure condition (e.g. `if (deny) return deny;`) instead of nesting the rest of the function inside an `if (allowed)` block. Keeps the happy path flat and readable.
- **Additive / non-breaking change** — a change where every existing caller keeps working exactly as before, because you only ever *add* new optional things, never remove or repurpose existing ones (Steps 1, 3, 11, 14).
- **Expand/contract migration** — introduce a new parameter as optional with a safe fallback ("expand"), update every caller to use it, then finally make it required once nothing can omit it ("contract"). Lets a multi-file refactor stay shippable after every single step (Steps 14 → 22 → 23).
- **Sparse index** — a database unique index that ignores documents where the field is entirely absent, so "not yet set" doesn't collide with every other "not yet set" (Step 2).
- **Normalization (store a reference, not a copy)** — `officeAddressId` stores a link to the one canonical office record instead of copying its name/address, so there's exactly one place that data can ever get out of sync (Step 1).
- **Discriminated/union type modeling a real runtime shape** — typing `officeAddressId` as `string | { _id, name }` to honestly reflect that Mongoose's `.populate()` can return either shape, forcing every reader to check before use (Step 3).
- **Layered validation** — check cheap things first (auth, request shape via Zod) before expensive things (a database round-trip to confirm a referenced record exists) (Step 5).
- **Handle the error at the layer with enough context to act on it** — a raw database "duplicate key" error only means something useful once translated by the code that knows *which* field, for *which* feature, means *what* to a human (Step 6).
- **Side-effect import** — `import "@/models/officeAddress"` solely to register a Mongoose schema before `.populate()` can use it, even though nothing in the file directly references the imported value (Steps 7, 12).
- **Dependency injection via props** — a component takes what it needs (`employeeId`, `onSaved`) as parameters instead of assuming a specific page's global state, so it can be reused unmodified elsewhere (Step 9).
- **Observer/callback pattern** — a child component calls `onSaved()` to signal "something happened" without needing to know *how* the parent chooses to react (Step 10).
- **Graceful degradation / fallback chain** — try the best available data source first, degrade to a less-personalized-but-still-correct source, and only ever fail completely as an absolute last resort (Step 12).
- **DRY (Don't Repeat Yourself)** — reusing an already-resolved value (`userName`) instead of re-deriving the same fact a second time nearby (Step 16).
- **Defense in depth, applied consistently** — the same authorization check, deliberately repeated verbatim across every route that needs it, rather than each route inventing its own variant (Steps 18–20).
- **Make invalid states unrepresentable** — once every real caller supplies a value, tighten the type so the compiler — not a runtime fallback — rejects any future code that forgets it (Step 23).
