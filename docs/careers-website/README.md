# Careers API for the Zairo International website

Adminstro is the source of open roles and of the application that HR receives. The public website reads published jobs from the endpoints below, uploads the photo and resume to Bunny, then posts the application as JSON. None of these calls need a login.

Base URL: `https://adminstro.in`

Call these from the website server (a Next.js server component, route handler, or other backend). The browser on `zairointernational.com` cannot call Adminstro directly: these routes do not send CORS headers.

Only published jobs are returned. Drafts stay on the HR dashboard.

## 1. List open roles

```http
GET /api/job-openings?published=1
```

No auth. `published=1` is required. Without it the route expects an HR session and returns 401.

```bash
curl -sS "https://adminstro.in/api/job-openings?published=1"
```

```ts
const response = await fetch("https://adminstro.in/api/job-openings?published=1", {
  cache: "no-store",
});
const body = (await response.json()) as {
  success: boolean;
  data?: JobOpening[];
  error?: string;
};

if (!response.ok || !body.success || !Array.isArray(body.data)) {
  throw new Error(body.error || "Failed to fetch jobs");
}

const jobs = body.data;
```

`200`

```json
{
  "success": true,
  "data": [
    {
      "_id": "6740f0a1c2b3d4e5f6789012",
      "title": "Sales Executive",
      "slug": "sales-executive",
      "departmentId": "6740aa11c2b3d4e5f6789001",
      "jobPositionId": "6740bb22c2b3d4e5f6789002",
      "departmentName": "Sales",
      "positionName": "Sales Executive",
      "summary": "Talk to property owners and close listings in Kanpur.",
      "description": "Full role description.",
      "responsibilities": "Call owners\nUpdate the CRM",
      "requirements": "Clear English\nLaptop",
      "location": "Kanpur",
      "employmentType": "fulltime",
      "workMode": "onsite",
      "experienceLevel": "fresher",
      "experienceMin": null,
      "experienceMax": null,
      "isPublished": true
    }
  ]
}
```

The array is already newest first. An empty list is `{ "success": true, "data": [] }`.

`500`

```json
{ "success": false, "error": "Failed to fetch jobs" }
```

## 2. One role by slug

Use `slug` from the list. Do not build public URLs from `_id`.

```http
GET /api/job-openings/by-slug/{slug}
```

```bash
curl -sS "https://adminstro.in/api/job-openings/by-slug/sales-executive"
```

```ts
const slug = "sales-executive";
const response = await fetch(
  `https://adminstro.in/api/job-openings/by-slug/${encodeURIComponent(slug)}`,
  { cache: "no-store" },
);

if (response.status === 404) {
  // job was unpublished or the slug is wrong
}

const body = (await response.json()) as {
  success: boolean;
  data?: JobOpening;
  error?: string;
};
```

`200` is the same job object as one item in the list, wrapped as `{ "success": true, "data": { ... } }`.

`404`

```json
{ "success": false, "error": "Job not found" }
```

`500`

```json
{ "success": false, "error": "Failed to fetch job" }
```

## Job fields

| Field | Use on the site |
| --- | --- |
| `title` | Heading |
| `slug` | Public path, for example `/careers/sales-executive` |
| `summary` | Card text on the list |
| `description` | Detail page body |
| `responsibilities` | Detail page. Split on newlines. Blank lines are separators, not bullets stored in the API |
| `requirements` | Same as responsibilities |
| `departmentName` | Department filter and card label |
| `positionName` | Job title on the position record. `title` is what HR wrote for the posting |
| `location` | City or office label. May be empty |
| `employmentType` | See labels below. May be `null` |
| `workMode` | See labels below. May be `null` |
| `experienceLevel` | `fresher`, `range`, or `null` |
| `experienceMin` / `experienceMax` | Whole years when `experienceLevel` is `range`. Otherwise `null` |
| `isPublished` | Always `true` on these two routes |
| `_id` | Send this only if the site submits an application. Do not show it |

`responsibilities` and `requirements` are plain text. Render each non-empty line as its own item.

## Labels

Show these words. The API returns the value on the left.

| `employmentType` | Label |
| --- | --- |
| `fulltime` | Full time |
| `parttime` | Part time |
| `intern` | Internship |
| `contract` | Contract |
| `null` | hide the field |

| `workMode` | Label |
| --- | --- |
| `onsite` | On-site |
| `hybrid` | Hybrid |
| `remote` | Work from home |
| `null` | hide the field |

Experience:

- `employmentType` is `intern`, or `experienceLevel` is `fresher`: show **Fresher**
- `experienceLevel` is `range` and min equals max: show `1 year` or `3 years`
- `experienceLevel` is `range` and min differs from max: show `1–3 years`
- otherwise hide it

## Suggested pages

**List** (`/careers` on the company site)

1. `GET /api/job-openings?published=1`
2. Filters for department, employment type, and work mode can run in the page. The API does not filter those. Department options are the distinct `departmentName` values in the response.
3. Each card links to `/careers/{slug}`.

**Detail** (`/careers/{slug}`)

1. `GET /api/job-openings/by-slug/{slug}`
2. `404` is a missing or closed role. Show a not-found page and a link back to the list.
3. The apply form on that page uses `_id`, then the steps in **Apply for a role**.

## Apply for a role

`POST /api/job-application/setInterview` does not accept a file. It stores two strings: `photo` and `resume`. Those strings must already be public Bunny URLs. The company site uploads the files first, then sends the URLs with the rest of the form.

Do this in order:

1. Load the job with `GET /api/job-openings/by-slug/{slug}`. Keep `_id`. That value is `jobOpeningId`.
2. Load offices with `GET /api/office-addresses?active=1`.
3. Upload the photo to Bunny. Keep the CDN URL.
4. Upload the resume to Bunny. Keep the CDN URL.
5. `POST /api/job-application/setInterview` with JSON.

Call Adminstro from the company site’s server. The browser on the company domain cannot call `adminstro.in` directly, because these routes do not send CORS headers. The form can post to a route on the company site, and that route calls Adminstro.

### Offices for the form

```http
GET /api/office-addresses?active=1
```

No auth. Without `active=1` the route expects an HR session.

```bash
curl -sS "https://adminstro.in/api/office-addresses?active=1"
```

`200`

```json
{
  "success": true,
  "data": [
    {
      "_id": "6740cc33c2b3d4e5f6789003",
      "name": "Kanpur Office",
      "city": "Kanpur",
      "formattedAddress": "123 Mall Road, Kanpur, Uttar Pradesh, 208001, India",
      "isActive": true
    }
  ]
}
```

Show one option per city. If two offices share a city, keep the first. Sort by city. The option label is `city`, or `name` when city is empty. The option value is `_id`. Send that `_id` as `officeAddressId`.

### Upload the photo and the resume

Bunny credentials live in Adminstro’s environment. Copy these three onto the company site server. Do not put the access key in browser JavaScript.

| Variable | Use |
| --- | --- |
| `NEXT_PUBLIC_BUNNY_STORAGE_URL` | Host of the storage API, no trailing slash |
| `NEXT_PUBLIC_BUNNY_STORAGE_ZONE` | Storage zone name |
| `NEXT_PUBLIC_BUNNY_ACCESS_KEY` | `AccessKey` header |

File rules, matching the current careers form:

| File | Folder | Allowed types | Max size |
| --- | --- | --- | --- |
| Photo | `Photos` | JPEG, PNG, WebP | 5MB |
| Resume | `Resumes` | PDF | 10MB |

Build a file name from 7 random letters or digits plus the original file name, for example `a8Kd2pQresume.pdf`.

Upload with `PUT`. The body is the raw file, not form data.

```http
PUT {STORAGE_URL}/{STORAGE_ZONE}/{folder}/{fileName}
AccessKey: {ACCESS_KEY}
Content-Type: {file mime type}
```

```ts
const fileName = `${randomId(7)}${file.name}`;
const uploadUrl = `${storageUrl}/${storageZone}/${folder}/${fileName}`;

const upload = await fetch(uploadUrl, {
  method: "PUT",
  headers: {
    AccessKey: accessKey,
    "Content-Type": file.type,
  },
  body: file,
});

if (!upload.ok) {
  throw new Error("Upload failed");
}

const publicUrl = `https://vacationsaga.b-cdn.net/${folder}/${fileName}`;
```

`publicUrl` is what the application API stores. A photo URL starts with `https://vacationsaga.b-cdn.net/Photos/`. A resume URL starts with `https://vacationsaga.b-cdn.net/Resumes/`.

Upload both files before calling the application API. If either upload fails, do not submit the form.

### Submit the application

```http
POST /api/job-application/setInterview
Content-Type: application/json
```

```bash
curl -sS -X POST "https://adminstro.in/api/job-application/setInterview" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Asha Verma",
    "email": "asha@example.com",
    "phone": "+919876543210",
    "experience": "2",
    "address": "12 Mall Road",
    "city": "Kanpur",
    "country": "India",
    "gender": "Female",
    "college": "Pranveer Singh Institute of Technology (PSIT)",
    "officeAddressId": "6740cc33c2b3d4e5f6789003",
    "jobOpeningId": "6740f0a1c2b3d4e5f6789012",
    "coverLetter": "I have two years in field sales.",
    "linkedin": "https://www.linkedin.com/in/asha",
    "portfolio": "https://asha.example.com",
    "socials": "GitHub: https://github.com/asha\nInstagram: https://instagram.com/asha",
    "referralSource": "Company website",
    "resume": "https://vacationsaga.b-cdn.net/Resumes/a8Kd2pQresume.pdf",
    "photo": "https://vacationsaga.b-cdn.net/Photos/b9Le3qRphoto.jpg"
  }'
```

`jobOpeningId` is the job `_id` from the detail call. The API reads the department and job title from that published opening. Do not ask the applicant to pick a department.

`201` is not used. A saved application returns `200`:

```json
{
  "success": true,
  "applicationId": "6740dd44c2b3d4e5f6789004"
}
```

Show a confirmation after `success: true`. HR also gets an email when `email` is present. The applicant does not get a mail from this call.

Errors use `error`, not the `success` wrapper:

| Status | Body | When |
| --- | --- | --- |
| 400 | `{ "error": "Please provide a valid college/university name" }` | College is missing, `Select College`, or `Other` with no real name |
| 400 | `{ "error": "Please select a preferred office address" }` | `officeAddressId` is missing or not an id |
| 400 | `{ "error": "Selected office address is invalid or inactive" }` | That office is not active |
| 400 | `{ "error": "Choose a job from the careers page before applying" }` | `jobOpeningId` is missing or not an id |
| 404 | `{ "error": "This job is no longer open" }` | The job was unpublished |
| 400 | `{ "error": "This job is missing a department or job title" }` | The opening has no active department or position |
| 500 | `{ "error": "Failed to save job application" }` | Save failed |

### Fields to collect

Check these on the company site before upload and before submit. The API only rejects college, office, and job. The rest are what the current form requires so HR gets a complete application.

| Field | Required | Send as |
| --- | --- | --- |
| Full name | yes | `name` |
| Email | yes, must contain `@` and a domain | `email` |
| Country code + phone | yes, phone is 10 digits | `phone`, one string, for example `+919876543210` |
| City | yes | `city` |
| Country | yes | `country` |
| Gender | yes | `gender`: `Male`, `Female`, `Other`, or `Prefer not to say` |
| Address | yes | `address` |
| College | yes | `college`. If the applicant picks Other, send the name they typed, not the word `Other` |
| Office | yes | `officeAddressId` |
| Years of experience | yes, whole number from 0 to 50 | `experience` as a string |
| Resume URL | yes | `resume` |
| Photo URL | yes | `photo` |
| Where they heard about the role | yes | `referralSource` |
| Cover letter | no | `coverLetter` |
| LinkedIn | no | `linkedin`. If present, it must contain `linkedin.com` |
| Portfolio | no | `portfolio`. If present, it must start with `http://` or `https://` |
| GitHub, Instagram, X | no | one `socials` string, see below |

Country codes used on the current form: `+91`, `+1`, `+44`, `+61`, `+971`, `+65`, `+49`, `+33`, `+81`, `+86`. Default is `+91`.

College options, in this order. `Select College` is the empty state and must not be submitted.

- Indian Institute of Technology Kanpur (IIT Kanpur)
- Harcourt Butler Technical University (HBTU)
- Chhatrapati Shahu Ji Maharaj University (CSJMU / Kanpur University)
- Rama University
- Pranveer Singh Institute of Technology (PSIT)
- Maharana Pratap Group Of Institutions
- Axis Colleges
- Allenhouse Institute of Technology
- Naraina Group of Institutions
- Krishna Institute of Technology
- Vision Group of Institutions
- Kanpur Institute of Technology (KIT)
- Banshi College of Engineering
- Dr. Gaur Hari Singhania Institute of Management and Research
- Dr Virendra Swarup Institute of Computer Studies (VSICS)
- DAV College
- Christ Church College
- Dayanand Anglo Vedic College
- BNSD Degree College
- PPN Degree College
- DG College
- Brahmanand College
- Jagran College of Arts Science and Commerce
- DAMS Kanpur
- Other

Referral options:

- A member of our HR team contacted me
- LinkedIn
- Instagram
- Friend or colleague
- College
- Job board
- Company website
- Other

When they pick Other, require a short note and send `referralSource` as `Other: {that note}`.

`socials` is optional. Join only the links they filled, one per line:

```text
GitHub: https://github.com/name
Instagram: https://instagram.com/name
X: https://x.com/name
```

GitHub must contain `github.com/`. Instagram must contain `instagram.com/`. X must contain `x.com/` or `twitter.com/`.

### What the company site sends

```ts
await fetch("https://adminstro.in/api/job-application/setInterview", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name,
    email,
    phone: `${countryCode}${phoneDigits}`,
    experience,
    address,
    city,
    country,
    gender,
    college,
    officeAddressId,
    jobOpeningId,
    coverLetter,
    linkedin,
    portfolio,
    socials,
    referralSource,
    resume: resumeUrl,
    photo: photoUrl,
  }),
});
```

Run that on the company site server, after the two Bunny uploads. `resume` and `photo` are the CDN URLs, not the files.

## What not to call

| Route | Why |
| --- | --- |
| `GET /api/job-openings` without `published=1` | HR session. Returns every draft |
| `POST /api/job-openings` | Creates a posting. HR only |
| `PATCH /api/job-openings/{id}` | Edits a posting. HR only |

Cache with `no-store`, or revalidate on a short interval. HR publish and unpublish should show up without a redeploy.
