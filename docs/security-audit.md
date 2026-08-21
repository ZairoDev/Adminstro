# Security Audit — Authentication, Authorization & Data Exposure

**Scope:** Login/register flows, session/JWT handling, middleware, and the full `src/app/api/**` surface (382 route files).
**Method:** Manual source review (no live exploitation performed). All findings below are backed by exact file/line references so they can be reproduced and fixed directly.

**Summary of severity counts:**

| Severity | Count | Theme |
|---|---|---|
| Critical | 6 | Unauthenticated PII/financial data dump, plaintext passwords, privilege‑escalation account takeover |
| High | 6 | CSRF, unauthenticated writes, brute force, backdoor pattern, token exposure |
| Medium | 4 | Mass assignment, weak PIN, systemic inconsistency, info disclosure |

---

## CRITICAL

### C1. Entire Candidate/HR data & workflow API is unauthenticated

**Where:** `src/app/api/candidates/route.ts`, `src/app/api/candidates/[id]/route.ts`, `src/app/api/candidates/[id]/action/route.ts`, `src/app/api/candidates/offerLetter`, `letterOfIntent`, `trainingAgreement`, `hrPolicies`, `onboardingDocument`, and `src/app/api/hrportal/createCandidate`, `updateStatus`, `finalCandidate`, `changeState`. None of these call any auth helper — verified by direct code read, not just grep.

Confirmed by reading the code:

```8:23:src/app/api/candidates/route.ts
export async function GET(request: NextRequest) {
  await connectDb();
  try {
    const { searchParams } = new URL(request.url);
    ...
```
No token/role check anywhere in the function — this endpoint returns **every candidate record** matching arbitrary query params, and the `Candidate` schema stores highly sensitive PII/financial data:

```128:135:src/models/candidate.ts
      salary: { type: String, default: null },
...
        panNumber: { type: String, default: null },
      bankDetails: {
        accountNumber: { type: String, default: null },
        ifscCode: { type: String, default: null },
...
        aadharCard: { type: String, default: null },
        aadharCardFront: { type: String, default: null },
        aadharCardBack: { type: String, default: null },
```

`GET /api/candidates/[id]` also has zero auth and returns the full document (including the fields above) by ID.

`middleware.ts` makes this worse: `"/dashboard/candidatePortal"` and the onboarding/training-agreement sub-routes are explicitly whitelisted as **public pages** (lines 330, 338‑339), so the UI itself is reachable without login — and the API it calls has no protection either.

**How this can be broken (step by step):**
1. No login needed. Simply call:
   `curl "https://<host>/api/candidates?limit=1000&page=1"`
   → returns every candidate's name, email, phone, address, resume/photo URLs, Aadhar card images, PAN number, bank account number + IFSC code, salary, interview notes.
2. Enumerate individual records: `GET /api/candidates/<mongoId>` (Mongo ObjectIds are guessable/sequential enough to enumerate via the list endpoint above, so no guessing is even required — the list endpoint already leaks all IDs).
3. Tamper with data with no credentials: `PATCH /api/candidates/<id>` with `{"status":"selected","selectionDetails":{"salary":"999999"}}` — accepted with no auth, no role check. The PATCH handler also does this:
   ```92:97:src/app/api/candidates/[id]/route.ts
   Object.keys(body).forEach((key) => {
     if (key.includes(".")) {
       updateData[key] = body[key];
     }
   });
   ```
   → any dot-notation key from the request body is written directly into the Mongo update (mass assignment). An attacker can write to arbitrary nested paths of the candidate document.
4. Move a candidate through the entire hiring pipeline as an outsider: `POST /api/candidates/<id>/action` with `{"status":"selected", ...}` triggers real HR emails and generates onboarding/training-agreement links — impersonating HR with no credentials at all.

**Fix:**
- Add a mandatory auth+role check (reuse `getDataFromToken` + an allow-list of `["HR","SuperAdmin","Admin","HAdmin"]`) at the top of every handler in `candidates/*` and `hrportal/*`, the same way `employee/editEmployee` already does it correctly.
- Keep the small set of genuinely public, candidate-self-service endpoints (`validate-reupload`, `validate-resignature`, the public application form submission) but make sure those only ever operate through a **per-record random token** (they already do this correctly, e.g. `validate-reupload`), never through a bare Mongo `_id` with no secret.
- Replace the manual `key.includes(".")` mass-assignment logic in `candidates/[id]` PATCH with an explicit allow-list of updatable fields (or a Zod schema with `.strict()`), per the project's own rule requiring Zod validation on all API input.

---

### C2. `/api/public/[model]` — unauthenticated full-collection dump of Employees and Candidates

```32:68:src/app/api/public/[model]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ model: string }> },
) {
  await connectDb();
  ...
  const baseQuery =
    resolved.key === "employee"
      ? resolved.mongooseModel.find({}).select(employeeProjection()).lean()
      : resolved.mongooseModel.find({}).lean();   // <-- candidate: NO field exclusion at all
```

There is no authentication check in this file at all. `employee` requests strip password/token fields, but `candidate` requests strip **nothing** — meaning Aadhar images, PAN, bank details, and salary (see C1) are dumped in bulk with a single unauthenticated request.

**How to break it:**
```
curl "https://<host>/api/public/candidate?limit=5000"
curl "https://<host>/api/public/employee?limit=5000"
```
No cookie, no token, no role — full dataset returned in one call. Named `public`, deployed with `force-dynamic`, so it's actively served in production.

**Fix:**
- Delete this route, or if it's genuinely needed for some integration, put it behind server-to-server auth (a signed API key checked server-side, never a client-reachable path) and always apply the same field-exclusion projection used for `employee` to `candidate` as well.
- Never expose a "dump the whole collection" endpoint without pagination caps and auth — add a hard `limit` ceiling (e.g. 100) regardless of the caller-supplied value.

---

### C3. Passwords are stored and compared in plaintext

```259:270:src/app/api/employeelogin/route.ts
    } else {
      // const validPassword: boolean = await bcryptjs.compare(
      //   password,
      //   temp.password
      // );
      const validPassword: boolean = temp.password === trimmedPassword;
```

The bcrypt comparison is commented out and replaced with a raw string comparison. This is corroborated in `createnewEmployee`:

```86:124:src/app/api/user/createnewEmployee/route.ts
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);
    ...
      // password: hashedPassword,
      password,
```

The hash is computed and then **thrown away** — the plaintext password is what actually gets saved. `generateNewpassword` and `resetAllPasswords` also write `employee.password = newPassword` directly with no hashing.

**How to break it:**
1. Any read access to the `employees` collection (a DB leak, a backup exposed in S3/misconfigured storage, an internal analytics query, or — see C4/C5 below — any endpoint that returns full employee documents) instantly yields every employee's live, working password and mobile PIN — no cracking required.
2. Confirmed independently: `employee/getAllEmployee` returns full unfiltered documents (see below), so a "Sales-TeamLead" account (a normal employee, not an admin) can view the plaintext passwords of every Sales employee just by opening the employee list page and inspecting the network response.

**Fix:**
- Hash passwords with bcrypt (already a dependency) on every write path (`createnewEmployee`, `createnewuser`, `generateNewpassword`, `resetAllPasswords`, any "edit employee" path that changes password) and compare with `bcryptjs.compare()` in `employeelogin`.
- Write a one-time migration to hash all existing plaintext passwords, and invalidate all existing sessions (`tokenValidAfter`) so old plaintext-based sessions can't linger.
- Never `.select()`/return the `password` or `mobilePin` fields from any query that isn't the login handler itself.

---

### C4. `employee/getAllEmployee` leaks plaintext passwords & PINs to non-admin roles

```78:112:src/app/api/employee/getAllEmployee/route.ts
    if (userRole === "LeadGen-TeamLead") {
      allEmployees = (await Employees.find({ ...queryWithExclusion, role: "LeadGen" })
        .sort({ _id: -1 })
        .lean() as unknown) as EmployeeWithLock[];
    }
    ...
    else if (["HR", "Admin", "SuperAdmin", "Developer"].includes(userRole as string)) {
      allEmployees = (await Employees.find(queryWithExclusion)
        .sort({ _id: -1 })
        .lean() as unknown) as EmployeeWithLock[];
    }
```

None of these queries use `.select()` to exclude sensitive fields. Every document returned includes `password` (plaintext, per C3), `mobilePin`, `otpToken`, `forgotPasswordToken`, `aadhar`, `accountNo`, `ifsc`, and `salary`.

**How to break it:** Log in as a `Sales-TeamLead` or `LeadGen-TeamLead` (a normal, non-privileged employee role) and open the Employee list page in the dashboard (or call `GET /api/employee/getAllEmployee` directly). The JSON response contains the plaintext password and mobile PIN of every teammate returned by that role's filter — enough to log in as them directly, no cracking needed. Combined with C3, this is a direct path from "any low-privilege employee account" to "impersonate a co-worker or escalate further."

**Fix:** Add `.select("-password -mobilePin -otpToken -otpTokenExpiry -forgotPasswordToken -forgotPasswordTokenExpiry -verifyToken -verifyTokenExpiry -webSession -mobileSession")` to every query in this handler (mirror the projection already correctly used in `src/app/api/public/[model]/route.ts`'s `employeeProjection()`). Apply the same projection convention to every other endpoint that lists/returns Employee documents.

---

### C5. `POST /api/generateNewpassword` — any logged-in employee can take over any other account, including SuperAdmin

```21:47:src/app/api/generateNewpassword/route.ts
export async function POST(request: NextRequest): Promise<NextResponse> {
	try {
		await getDataFromToken(request);              // <-- return value discarded, no role check
		const reqBody = await request.json();
		const { employeeId } = reqBody;
		const employee = await Employees.findById(employeeId);
		...
    if (employee.role === "HAdmin") {                // <-- only HAdmin is protected
      return NextResponse.json(... 403);
    }
		const newPassword = generatePassword();
    const newMobilePin = generateMobilePin(4);
		employee.password = newPassword;
    employee.mobilePin = newMobilePin;
		await employee.save();
		return NextResponse.json({
				message: "New password generated and sent to employee",
				newPassword: newPassword,             // <-- new plaintext password returned in the response
        mobilePin: newMobilePin,
			}, { status: 200 });
```

`getDataFromToken(request)` is called only to confirm *some* valid session exists — the returned payload (which contains `role`) is never inspected. There is no `allowedRoles` check like the sibling endpoint `employee/editEmployee` has. The only role that's blocked from being targeted is `HAdmin` — **`SuperAdmin` is not protected**.

**How to break it, step by step:**
1. Log in with any low-privilege account (e.g. an `Intern` or `Guest` role — the weakest roles in `roleAccess`).
2. Find a target employee's Mongo `_id` (trivially available from any list/search endpoint, e.g. `employee/getAllEmployee`, activity logs, socket "employee-login" events, etc. — SuperAdmin accounts are visible in employee lists to many roles).
3. `POST /api/generateNewpassword` with body `{"employeeId": "<superAdminObjectId>"}`, using your own (low-privilege) session cookie.
4. Response returns the target's brand-new plaintext password and mobile PIN directly in the JSON body.
5. Log in as the SuperAdmin using the returned credentials. Full account takeover of the highest-privilege role in the system, performed entirely by an `Intern`-level account.

**Fix:**
- Restrict this endpoint to the same `allowedRoles` used elsewhere (`SuperAdmin`, and optionally `HR`/`Admin` for their own scope) exactly like `employee/editEmployee` already does — `if (data.role !== "SuperAdmin") return 403`.
- Add an explicit rule that no role may reset a password for a role equal to or higher than their own (defense in depth, in case new lower-privilege "admin-ish" roles are added later).
- Never return the new password in an API response — email it (the code already has commented-out `sendEmail` call) or force a "must change password on first login" flow instead.
- Hash the new password (see C3).

---

### C6. Auth token is duplicated into `localStorage`, defeating `httpOnly` cookie protection

```15:31:src/AuthStore.ts
export const useAuthStore = create<State & Actions>((set) => ({
  token: null,
  hydrateFromStorage: () => {
    ...
      const stored = localStorage.getItem("token");
  ...
  setToken: (token: TokenInterface) => {
    set({ token });
    if (typeof window !== "undefined") {
      localStorage.setItem("token", JSON.stringify(token));
    }
  },
```

The server correctly sets the JWT as an `httpOnly` cookie (good — see `employeelogin`), but the API response *also* returns the raw JWT string in the JSON body (`response.data.token` in `src/app/login/page.tsx`), and the client stores the decoded token payload (`tokenData`, including `role`, `sid`, `allotedArea`) into `localStorage` via `AuthStore`. `sessionStorage`/`localStorage` are fully readable by any JavaScript running on the page.

**How to break it:** A single XSS bug anywhere in the app (stored or reflected — this is a large surface with 380+ endpoints and many rich-text/PDF/HTML-rendering features) lets an attacker run `localStorage.getItem("token")` and exfiltrate the session/role data to an attacker server, fully bypassing the `httpOnly` protection that was supposed to make cookie theft impossible via script injection.

**Fix:**
- Stop storing the JWT/token payload in `localStorage`. Rely solely on the `httpOnly` cookie; derive UI state (role, name, etc.) from a `/api/employee/check-session`-style endpoint call instead of trusting client-stored data.
- Stop returning the raw JWT in the JSON response body for browser (`deviceType === "web"`) logins — only mobile/API clients that can't use cookies need the token in the body.

---

## HIGH

### H1. `GET /api/resetAllPasswords` — CSRF-able mass password reset for all employees

```11:23:src/app/api/resetAllPasswords/route.ts
export const GET = async (req: NextRequest) => {
  try {
    const authUser = await getDataFromToken(req);
    if (authUser.role !== "SuperAdmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    ...
    const employees = await Employees.find({
      role: { $nin: excludedRoles },
      email: { $nin: excludedEmails },
    });
```

This correctly checks for `SuperAdmin`, but it is a **`GET`** request that performs a destructive, wide-reaching mutation (resets the password + mobile PIN of every non-excluded employee). `GET` requests are not protected against CSRF the way `POST`/`PUT` with proper anti-CSRF tokens would be, and cookies are set with `sameSite: "lax"` (see `employeelogin.ts` cookie options), which still allows the cookie to be sent on a top-level cross-site **GET navigation**.

**How to break it:** Get a logged-in SuperAdmin to click a link (e.g. sent via email/chat: "check this dashboard export") pointing to `https://<host>/api/resetAllPasswords`. Because it's a same-origin `GET` reached via top-level navigation, the browser attaches the SuperAdmin's `httpOnly` session cookie automatically. The request succeeds, and every employee's password is silently rotated — a company-wide login lockout / denial of service triggered by one click, with no confirmation step and no CSRF token.

**Fix:**
- Convert to `POST` and require an explicit confirmation payload (e.g. `{"confirm": true}`).
- Add CSRF protection (custom header check, e.g. requiring `X-Requested-With` set by the SPA and rejecting requests without it, or a double-submit CSRF token) for all state-changing routes, not just this one.
- Never perform "reset everyone's password" as a single unconfirmed action; consider an audit-logged, two-step workflow.

---

### H2. Unauthenticated role-management endpoints

```7:9:src/app/api/addons/roles/addRole/route.ts
export async function POST(req: NextRequest) {
  try {
    await connectDb();
    let body: Record<string, unknown>;
```
No auth check anywhere in the file. Sibling routes `getRoleById`, `updateRole`, `deleteRoleById` show the same pattern (absent from the auth-helper grep as well).

**How to break it:** `POST /api/addons/roles/addRole` with `{"role":"anything","department":"anything"}` and no session — succeeds, writing directly into the `Role` collection with no authorization at all. Depending on how downstream UI trusts this collection (e.g. populating role dropdowns used elsewhere in HR/admin tooling), this is a foothold for polluting reference data used by higher-trust workflows.

**Fix:** Require an authenticated admin/HR role on all `addons/roles/*` and `addons/target/*` mutation endpoints, matching the pattern already used correctly in `employee/editEmployee`.

### H3. `POST /api/employee/deleteEmploye` — any authenticated employee can delete any other employee

```9:33:src/app/api/employee/deleteEmploye/route.ts
export async function POST(request: NextRequest) {
  try {
    await getDataFromToken(request);   // <-- confirms a session exists, but never checks role
    const reqBody: Employee = await request.json();
    const { _id } = reqBody;
    ...
    if (employee.role === "SuperAdmin") {
      return NextResponse.json({ error: "You can not delete the superadmin" }, { status: 403 });
    }
    await Employees.deleteOne({ _id });
```

Only the *target* being `SuperAdmin` is blocked — the *caller's* role is never checked. Any authenticated employee (`Intern`, `Guest`, `Agent`, etc.) can delete any other non-SuperAdmin employee record, including HR, Admin, or Developer accounts.

**How to break it:** Log in as any low-privilege employee, then `POST /api/employee/deleteEmploye` with `{"_id": "<any non-SuperAdmin employee id>"}` — the account is deleted immediately. Usable for sabotage (deleting a manager's account) or as a denial-of-service against the whole HR roster.

**Fix:** Add the same `allowedRoles` gate used in `employee/editEmployee` (`SuperAdmin`, `HR`, possibly `Admin`) before allowing deletion, and log the action (who deleted whom) for audit purposes.

### H4. No rate limiting / brute-force protection on login, OTP, or mobile PIN

- `POST /api/employeelogin`: no attempt counter, no lockout, no delay — password comparison is a simple string equality (C3) with no timing-safe compare either.
- `POST /api/verify-otp`: OTP is compared with `!=` against a stored value with no attempt counter (`otpToken != otp`), no lockout after N wrong guesses, and no IP/account throttling. If OTP is numeric and short (commonly 4–6 digits, generated in `sendEmail`/mailer), brute forcing all combinations before `otpTokenExpiry` is feasible without any request throttling in front of it.
- Mobile login PIN is 4 digits (`generateMobilePin(4)`), compared with `===`, no lockout — only 10,000 possible values.

**How to break it:** Script repeated `POST /api/employeelogin` or `POST /api/verify-otp` requests (no CAPTCHA, no delay, no IP ban) to brute force weak/reused passwords or guess a 4–6 digit OTP/PIN within its validity window.

**Fix:** Add per-account and per-IP rate limiting (there's already a `NotificationRateLimiter` pattern in `src/lib/notifications/rateLimiter.ts` that can be adapted, or use a proper store like Redis for multi-instance deployments) on `employeelogin`, `verify-otp`, and `resend-otp`. Add a lockout/backoff after N consecutive failures (the `isLocked` field already exists on the Employee schema — actually use it for automatic lockout, not just manual admin action).

### H5. Hardcoded SuperAdmin OTP-bypass backdoor pattern left in source

```6:8:src/util/employeeConstants.ts
export const TEST_SUPERADMIN_EMAIL = "";
export const TEST_SUPERADMIN_PASSWORD = "784512";
```
```357:444:src/app/api/employeelogin/route.ts
    if (temp.role === "SuperAdmin") {
      // SuperAdmin OTP bypass for specific accounts
      if ( temp.email === TEST_SUPERADMIN_EMAIL) {
        ...
        const token = jwt.sign(tokenPayload, tokenSecret, ...);
        ...
        return response;   // full SuperAdmin session issued, OTP entirely skipped
```
`getDataFromToken.ts` also special-cases this account:
```41:44:src/util/getDataFromToken.ts
    // Test SuperAdmin has no DB record; accept token as-is
    if (employeeId === "test-superadmin") {
      return payload;
    }
```

Today `TEST_SUPERADMIN_EMAIL` is `""`, so it's not exploitable unless an employee record with an empty-string email exists. But this is a live code path, not just a comment: if anyone re-populates that constant (or an environment-specific build does), it becomes a full, unauditable OTP-skip backdoor for SuperAdmin — and `getDataFromToken` will happily accept a forged `test-superadmin` token **without ever checking the database**, meaning session revocation/lockout/deactivation can't touch it either.

**How to break it (if the constant is ever set, e.g. in a staging config that leaks, or reused by mistake in prod):** Sign a JWT with `{"id":"test-superadmin","sid":"anything","role":"SuperAdmin", ...}` using the known `TOKEN_SECRET`, or simply log in with the matching email/password (`784512`, hardcoded in the repo) — no OTP required, and the session bypasses the normal DB-backed session/lockout checks entirely.

**Fix:** Delete this bypass code path entirely (both in `employeelogin.ts` and the `test-superadmin` special case in `getDataFromToken.ts`). If a QA/test account is genuinely needed, it must go through the exact same OTP + DB-session-validated path as every other account — no special-cased `id`, no hardcoded password committed to source control.

### H6. `middleware.ts` never runs on `/api/**`, so every API route is self-responsible for auth — and many aren't

```476:481:src/middleware.ts
export const config = {
  matcher: [
    // Run middleware on everything except API routes, Next.js internals, favicon, and static files
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|pdf)).*)",
  ],
};
```

This is a common Next.js pattern and not wrong by itself, but it means the role/route matrix built in `roleAccess` only protects **pages**, not the underlying data APIs. Directly calling an API (via `curl`/Postman/browser devtools) bypasses all of that page-level logic completely. Combined with the findings above, this is exactly how a logged-out or low-privilege user reaches `/api/candidates`, `/api/public/[model]`, `/api/debug-db`, etc., even though the *pages* that normally surface that data are behind a login wall.

**Fix:** Treat the API layer as the actual trust boundary — every route must independently authenticate and authorize (never rely on "the page in front of it is protected"). Consider adding a lightweight shared wrapper/helper (e.g. `withAuth(handler, allowedRoles)`) and enforcing via lint/CI that all files under `src/app/api/**/route.ts` import it, to prevent this class of bug from recurring as new routes are added.

---

## MEDIUM

### M1. Mass assignment via dot-notation keys in `PATCH /api/candidates/[id]`
Already detailed in C1, step 3 — repeated here because it's independently exploitable even after C1's auth is fixed, if the fix isn't paired with a strict schema. **Fix:** validate `body` with a Zod schema listing exactly the updatable paths; reject anything else.

### M2. `/api/debug-db` — unauthenticated internal diagnostics endpoint
```4:17:src/app/api/debug-db/route.ts
export async function GET() {
  try {
    return Response.json({
      mongooseType: typeof mongoose,
      mongooseKeys: Object.keys(mongoose),
      ...
```
No auth, no role check. Low direct impact (doesn't leak data), but it confirms internal implementation details (mongoose version behavior, model wiring) to any unauthenticated caller and signals the presence of debug scaffolding left reachable in production. **Fix:** delete this route from production builds, or gate it behind `NODE_ENV !== "production"` and an admin auth check.

### M3. `debug-db`/`testing` style routes as a pattern
`src/app/api/testing/route.ts` exists alongside `debug-db`. **Fix:** audit for any other `debug*`/`test*` routes and remove them from the deployed build (e.g. via a build-time check or simply not shipping them).

### M4. Systemic inconsistency between "authenticated" and "authorized"
Several endpoints call `getDataFromToken` (proving *someone* is logged in) but never check *what role* that someone has, while sibling endpoints for the same resource do it correctly (e.g. `employee/editEmployee` checks role; `employee/deleteEmploye` and `generateNewpassword` do not). This is the root cause of C5 and H3, and is very likely to recur elsewhere in the ~275 routes that were not individually re-verified in this pass (107 files had no recognizable auth helper call at all in a full-codebase scan; some of those are legitimate webhooks/public forms, but the list should be triaged). **Fix:** introduce one shared `requireRole(request, allowedRoles)` helper used everywhere, and add a CI check/lint rule that flags any `route.ts` file with a mutating HTTP method (`POST`/`PUT`/`PATCH`/`DELETE`) that doesn't call it.

---

## Suggested remediation order

1. **C1–C5** (unauthenticated PII dump, plaintext passwords, full account-takeover via `generateNewpassword`) — fix immediately; these allow anyone on the internet to read Aadhar/PAN/bank data and allow any employee to take over the SuperAdmin account.
2. **C6, H1, H3** — token storage, CSRF-able mass reset, employee deletion.
3. **H2, H4, H5, H6** — role-management auth, rate limiting, backdoor cleanup, and the systemic self-auth pattern.
4. **M1–M4** — schema hardening and debug-route cleanup.

A follow-up pass should specifically re-triage the 107 route files with no detected auth helper (listed during this audit) against a maintained allow-list of intentionally-public endpoints (webhooks with signature verification, the public job application form, token-gated candidate self-service links) — anything not on that list should get an explicit `requireRole` check.
