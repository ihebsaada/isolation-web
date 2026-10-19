# Lead capture implementation and release report

Recommendation: **NO-GO for production deployment and advertising activation** until the external configuration and live checks below pass. No deployment, DNS change, Google resource creation, or advertising-account change was performed.

## 1. Files changed

- `.env.example`: server secrets and public Pixel configuration template.
- `src/app/layout.tsx`: public tracking component.
- `src/components/lead-form.tsx`: real submission, honeypot, attribution context, post-receipt conversions.
- `src/lib/lead-submission.ts`: same-origin receiver and confirmed receipt contract.
- `src/lib/lead-record.ts`: server validation, qualification mapping, stable schema, filtering and safe CSV.
- `src/lib/lead-server.ts`: Sheet transport, origin checks, session access and no-store headers.
- `src/lib/lead-session.ts`: signed, expiring sessions and code comparison.
- `src/lib/meta.ts`, `src/components/public-tracking.tsx`: one direct Pixel path and session attribution.
- `src/app/api/leads/route.ts`: submit, list and basic status/note updates.
- `src/app/api/leads/{login,logout,export}/route.ts`: authentication, logout and protected CSV.
- `src/app/leads/{page.tsx,viewer.tsx,viewer.css}`: private responsive viewer.
- `scripts/google-apps-script.gs`: append-only persistence, ID-based updates, retry deduplication and shared login limiting.
- `tests/{leads,lead-record,lead-session,apps-script}.test.mjs`: submission, data, session, tracking and storage tests.
- This report.

No packages were added. Existing public styling, qualification rules, copy and early exclusion screens were preserved.

## 2. Exact Google Sheet columns

Worksheet name: `Leads`. Order is fixed, left to right:

```text
lead_id,submitted_at,name,phone,email,city,postal_code,homeowner,property_type,insulation_need,project_timeline,intent,qualification_status,qualification_pending,consent,utm_source,utm_medium,utm_campaign,utm_content,utm_term,fbclid,gclid,landing_path,referrer,source,campaign,ad,creative,utm_id,call_status,notes
```

The extra `qualification_pending` preserves the existing unconfirmed-coverage state. Legacy source/campaign/ad/creative/utm_id fields are retained. Consent is stored as `true` for completed accepted submissions. Submission time is generated server-side, in UTC; the viewer displays America/Toronto time.

The script initializes headers only on an empty worksheet and refuses mismatched headers. A script-wide lock serializes appends, duplicate-ID checks and updates. Appends allocate the next unused row; updates locate a unique lead ID every time and change only `call_status` and `notes`. Missing/ambiguous IDs fail. Cell text and CSV formula prefixes are escaped. Restrict manual editing access; do not delete lead IDs or change schema headers. Apps Script locks do not serialize human edits made directly in Google Sheets.

## 3. Environment variables

Vercel server-only:

| Variable | Value |
| --- | --- |
| `LEADS_ACCESS_CODE` | Random access code, at least 16 characters; communicate privately to staff |
| `GOOGLE_APPS_SCRIPT_URL` | Deployed `https://script.google.com/macros/s/.../exec` URL |
| `GOOGLE_APPS_SCRIPT_SECRET` | Independent random integration secret, matching Script Property |

Public build configuration:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_META_PIXEL_ID` | Numeric Pixel ID; not a secret |
| `NEXT_PUBLIC_META_PIXEL_ENABLED` | `false` until tracking is approved and tested; `true` enables Pixel |

Apps Script **Script Properties**, never public frontend variables:

- `SHEET_ID`: spreadsheet ID.
- `INTEGRATION_SECRET`: same value as `GOOGLE_APPS_SCRIPT_SECRET`.
- `LOGIN_WINDOW`: managed automatically by the script; do not configure manually.

No Google credential is sent to the browser. Google authorization belongs to the Apps Script owner. No GTM variable is required because GTM was deliberately omitted.

## 4. Access/session flow

`/leads` checks a signed cookie server-side before showing the viewer. Without it, only the access-code form renders and no lead fetch runs. Login verifies code server-side with constant-size HMAC comparisons, issues `leads_session` for eight hours with HttpOnly, Secure, SameSite=Strict and Path=/, and survives refreshes. Logout expires it. Rotating the access code invalidates all existing sessions.

Code never appears in a URL or frontend source. Login, submissions and updates reject foreign/missing Origin headers. Read, update and export APIs require authentication; the public POST is intentionally available to the qualification form. Private responses disable caching and indexing; `/leads` has noindex/nofollow metadata.

Shared login limiting under the Apps Script lock allows five attempts per address and 100 total attempts per fixed 15-minute UTC window. Both successful and failed attempts count. Limit state persists in Script Properties across Vercel instances; unavailable limiter/storage fails closed. On Vercel the trusted forwarded client address is used; if deploying elsewhere, verify the host sanitizes forwarding headers. Fixed windows can allow another attempt immediately after a window boundary.

## 5. Form submission flow

Existing step validation → existing exclusion decisions → completed contact form → same-origin POST → full server validation and server classification → locked Google Sheet append/deduplication → explicit matching receipt → success screen and conversions.

The synchronous form lock prevents double clicks; loading disables controls. A retry of unchanged answers reuses its lead ID; the script returns the original receipt without appending a second row. Persistence/network/timeout failures show an error and retain answers on the page. If a timed-out write actually completed, retry safely discovers the existing ID. The honeypot rejects filled bot submissions. It is basic spam protection, not a full abuse prevention service.

## 6. Qualification mapping and current blocker

| Existing result | Stored status | QualifiedLead |
| --- | --- | --- |
| `qualified` | `qualified` | Yes, after persistence only |
| `low_intent` | `low_intent` | No |
| `unqualified_owner`, `unqualified_property_type`, `out_of_area` | `rejected` | No |
| `null` / coverage pending | `low_intent`, `qualification_pending=true` | No |

**Current `serviceCoverage` in `src/data/isolation.ts` is `{validated:false,postalCodes:[]}`. No current submission can truthfully become qualified.** Provide an approved exact postal-code list before enabling qualified-lead campaigns. No coverage was invented.

The preserved UX ends non-homeowner/property/out-of-area and low-intent journeys before collecting contact details and consent. These exits are not submitted or tracked as leads. Server mapping of completed low-intent/rejected inputs is tested defensively, but storing every excluded journey would require changing that UX and deciding what data/consent to collect. This remains a scope decision if exhaustive capture is required.

## 7. Attribution mapping

Query values map directly into identically named Sheet columns: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `fbclid`, `gclid`, plus legacy source/campaign/ad/creative/utm_id. Values are length-limited. Session storage keeps acquisition context across the form flow; a new query with attribution starts a new context. Existing attributed links still preserve query values. First acquisition pathname and referrer are recorded; no extra URL query fields are copied. Storage-disabled browsers retain current-query attribution and form-page pathname/referrer, but cannot retain context across unrelated navigation.

Viewer source/campaign use UTM values first, then legacy fallbacks; ad/content shows legacy ad/creative and utm_content. Click IDs remain in storage and CSV. Conversion calls do not explicitly send contact information or raw click identifiers; Pixel handles browser attribution itself when permitted.

## 8. Meta event mapping

| Event | Method | Trigger |
| --- | --- | --- |
| `PageView` | `track` | Once per public pathname visit in mounted layout |
| `ViewContent` | `track` | Same public acquisition-page visit |
| `Lead` | `track` | Only confirmed persistence receipt |
| `QualifiedLead` | `trackCustom` | Only confirmed receipt with stored `qualified` status |

`QualifiedLead` uses the custom-event method rather than assuming browser standard-event support. Reference for release verification: https://developers.facebook.com/docs/meta-pixel/implementation/conversion-tracking/ . The official page returned HTTP 429 during research, so current Meta-account recommendation and Test Events acceptance remain unverified. Confirm the desired custom conversion/event setup in the account before ad activation.

Conversion event IDs derive from stable lead ID plus event name. Session storage suppresses repeated receipts; form lock and Sheet deduplication prevent duplicate clicks/writes. Refresh does not replay a success event. With session storage unavailable, the form lock still blocks double clicks but cross-remount suppression is best-effort. Pixel automatic event configuration is disabled; no automatic form matching is configured. Analytics exceptions cannot turn a confirmed persistence into form failure.

The Pixel library loads after interaction/hydration through Next Script and only on public pages, when enabled. No noscript beacon duplicates page events. Browser ad blockers may prevent delivery; persisted leads remain successful. Client navigation from a public page can retain an already-loaded Pixel library in memory, but the application fires no events for `/leads`.

## 9. GTM approach

Omitted: it adds no required function here. Direct Pixel is the sole event authority. Do not add duplicate Meta tags or automatic lead triggers through an existing external GTM container or Meta Event Setup Tool.

## 10. Viewer capabilities

Newest first; responsive cards; name/phone search; qualification and call-status filters; click-to-call; date, contact, city/postcode, ownership, qualification, pending sector, timing, need, source/campaign/content details; five allowed call statuses; notes limited to 1,000 characters; explicit Save; Logout; server-protected export using the same current filters. All lead identifiers and attribution columns are included in CSV. No CRM, charts, user management or pipeline was added.

## 11. Verification results

- `npm.cmd run build`: PASS.
- `npm.cmd run lint`: PASS, no warnings.
- `npm.cmd test`: PASS, 25 tests.
- TypeScript: PASS, including final build type checking.
- Local production HTTP smoke checks: `/leads` serves access screen without phone/lead content; unauthenticated list/update/export return 401; login without Origin returns 403.
- Automated tests cover validation, qualified/low/rejected classification logic, missing consent, honeypot, normalization, all attribution keys, stable schema, filtering/search/order, CSV escaping, signed session/tamper/rotation, matching receipt/failure/timeout/abort, custom qualified conversion and deduplication.
- Apps Script simulated runtime tests cover append, duplicate retry, row reorder and targeted update, unknown ID, unauthorized/malformed/schema mismatch and shared login limit. These are not live Google tests.
- Not yet verified: real correct/incorrect access-code HTTP flow with configured backend, Secure-cookie refresh/logout over HTTPS, live Sheet append/list/update/export, real mobile submission and responsive visual QA, Meta PageView/ViewContent network counts and Test Events, real failure/no-conversion behavior in-browser, hydration console and measured LCP/CLS.

## 12. Performance and optional analytics

No new dependencies, images, fonts, public layout elements or CTA changes. Attribution uses a small client effect. The private viewer is isolated in its route; the Pixel library is asynchronous and disabled by default. No measured mobile performance baseline or LCP/CLS comparison is available, so absence of a regression cannot yet be certified.

Vercel Analytics and Speed Insights could be useful low-overhead additions after a baseline exists. Neither was installed or enabled.

## 13. Remaining blockers

1. Actual Google Sheet, owner-authorized Apps Script deployment and secret configuration.
2. Approved postal-code coverage; exhaustive excluded-journey capture decision if required.
3. Pixel ID, tracking activation/privacy requirements and Meta account verification.
4. HTTPS preview/browser/mobile/performance checks and real-service acceptance tests.
5. Explicit production deployment authorization after all checks pass.

## 14. Setup and deployment steps

1. Create a restricted spreadsheet and Apps Script project. Paste `scripts/google-apps-script.gs`; set `SHEET_ID` and independent random `INTEGRATION_SECRET` in Script Properties. Deploy a Web App executing as the owner, accessible to Anyone. The endpoint authenticates every request using its server-held token; do not share it or the secret publicly. Authorize only the necessary spreadsheet access.
2. Configure the three server-only Vercel variables. Match the integration secret. Keep Pixel disabled initially. Secrets must not be placed in NEXT_PUBLIC variables or committed files.
3. Approve exact service-area postcodes and update `serviceCoverage` in `src/data/isolation.ts`. Re-run tests/build. Confirm the existing qualification rules and pending mapping meet campaign requirements.
4. On an explicitly authorized HTTPS preview, run the mission's full 32-item checklist against a test Sheet. Verify append, duplicate retries, row movement, status/notes updates, filtered CSV, correct/wrong login, rate limits, refresh, logout and unauthenticated APIs. Simulate Google failure and confirm no success/conversion.
5. Configure Pixel ID and enable only when ready; rebuild the preview because NEXT_PUBLIC values are compiled into the client. Verify PageView and ViewContent exactly once per page visit, Lead only after persistence, QualifiedLead only for qualified, and no duplicates on refresh/double-click in Meta Test Events. Confirm no external GTM/Event Setup Tool duplicates.
6. Perform mobile submission, desktop/mobile viewer checks, console hydration check and before/after Lighthouse/Web Vitals comparison. Resolve issues and rerun required checks.
7. Obtain explicit production deployment authorization; deploy through the existing Vercel project. Do not modify DNS. Verify production auth, submission, Sheet receipt and tracking using clearly labeled test records. Keep a previous deployment available for rollback.

## 15. GO / NO-GO

**Local implementation checks: GO. Production deployment/advertising readiness: NO-GO** until the blockers and live acceptance checks above are resolved. Nothing was deployed.
