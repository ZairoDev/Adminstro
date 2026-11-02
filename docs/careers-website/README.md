# Careers API for the Zairo International website

Adminstro is the source of open roles. The public website reads published jobs from these endpoints and does not need a login.

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

**List** (`/careers` on the marketing site)

1. `GET /api/job-openings?published=1`
2. Filters for department, employment type, and work mode can run in the page. The API does not filter those. Department options are the distinct `departmentName` values in the response.
3. Each card links to `/careers/{slug}`.

**Detail** (`/careers/{slug}`)

1. `GET /api/job-openings/by-slug/{slug}`
2. `404` is a missing or closed role. Show a not-found page and a link back to the list.

Apply stays on Adminstro until the marketing site hosts its own form:

`https://adminstro.in/careers/{slug}`

That page loads the same job and includes the application form (resume, photo, office, college).

## What not to call

| Route | Why |
| --- | --- |
| `GET /api/job-openings` without `published=1` | HR session. Returns every draft |
| `POST /api/job-openings` | Creates a posting. HR only |
| `PATCH /api/job-openings/{id}` | Edits a posting. HR only |

Cache with `no-store`, or revalidate on a short interval. HR publish and unpublish should show up without a redeploy.
