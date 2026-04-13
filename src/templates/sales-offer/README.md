# Sales offer email HTML (source files)

Patched templates with `{{ownerName}}`, `{{plan}}`, `{{effectivePrice}}`, and `{{payNowUrl}}` for [templateEngine.ts](../../util/templateEngine.ts).

Configure temporary pay-now links in env (replace later with production URLs):

```bash
VACATIONSAGA_PAY_NOW_URL=https://example.com/vacationsaga/pay-now
HOLIDAYSERA_PAY_NOW_URL=https://example.com/holidaysera/pay-now
HOUSINGSAGA_PAY_NOW_URL=https://example.com/housingsaga/pay-now
```

Import into MongoDB (requires `MONGODB_URI` in `.env`):

```bash
npx tsx src/scripts/importOfferTemplate.ts --org Holidaysera --name "Holidaysera Offer Template" src/templates/sales-offer/holidaysera-offer.html
npx tsx src/scripts/importOfferTemplate.ts --org HousingSaga --name "HousingSaga Offer Template" src/templates/sales-offer/housingsaga-offer.html
npx tsx src/scripts/importOfferTemplate.ts --org VacationSaga --name "VacationSaga Offer Template" src/templates/sales-offer/vacationsaga-offer.html
```

Seed company plans used by Sales Offer dropdown:

```bash
npm run seed-company-offer-plans
```

Add `--create-missing` to create company docs if one of the three orgs does not exist yet:

```bash
npx tsx src/scripts/seedCompanyOfferPlans.ts --create-missing
```

Each import deactivates other templates for that organization and sets this file as the single active template.
