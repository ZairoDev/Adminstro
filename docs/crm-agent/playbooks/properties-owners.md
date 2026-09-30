# Properties and owners

## Look up by VSID

**Example questions**

- How do I look up a property by VSID?
- What is property for VSID …?

**Answer in brief**

- Properties have a `VSID` field. Ask with a VSID for live lookup.
- API: `POST /api/property/getPropertyByVSID`.

**Open in dashboard**

- `/dashboard/property`, `/dashboard/add-listing`, `/dashboard/geo-search`

**Live Ask tools**

- `findPropertyByVsid`

## Owner sheets and phone check

**Example questions**

- Difference between long-term and short-term owner sheet?
- Is this phone already an owner?

**Answer in brief**

- Long-term sheet `/spreadsheet`, short-term `/spreadsheet-short-term` (depends on rentalType/role).
- Registered owners in Owners/Users; unregistered have separate collections.
- Phone check: `POST /api/owner/checkNumberInOwners`. Ask can use `findOwnerByPhone`.

**Live Ask tools**

- `findOwnerByPhone`

## Boost and catalogue

**Example questions**

- What is property boost?
- Where is the catalogue?

**Answer in brief**

- Boost `/dashboard/propertyBoost`
- Catalogue `/dashboard/catalogue`
- Listing email aliases `/dashboard/aliases`

## Visibility rules

**Example questions**

- Why can’t I see some properties?

**Answer in brief**

- Employees may have property/owner visibility, pricing bands, and location blocks.
- Copilot tools respect role gates; edit rules on employee detail pages.
