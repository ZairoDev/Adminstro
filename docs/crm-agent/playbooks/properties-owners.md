# Properties and owners

## VSID lookup

Properties are stored with a `VSID` field. Staff and Copilot can look up a property via `POST /api/property/getPropertyByVSID`. Dashboard: `/dashboard/property`, listing wizard `/dashboard/add-listing`, geo tools `/dashboard/geo-search`.

## Owner sheets

- Long-term owner sheet: `/spreadsheet`
- Short-term owner sheet: `/spreadsheet-short-term`
- Access depends on employee `rentalType` and role (`canAccessOwnerSheetVariant`).

Registered owners live in Owners / Users models. Unregistered owners have separate long-term and short-term collections with nearby/geo search APIs.

## Boost and catalogue

Property boost: `/dashboard/propertyBoost`. Catalogue: `/dashboard/catalogue`. Aliases for listing emails: `/dashboard/aliases`.

## Phone check

`POST /api/owner/checkNumberInOwners` returns whether a phone already exists as an owner.

## Visibility rules

Employees may have property visibility, owner visibility, pricing bands, and location blocks. These filter what they see on lead/property boards — Copilot tools respect role gates; detailed rule editing is on employee detail pages.
