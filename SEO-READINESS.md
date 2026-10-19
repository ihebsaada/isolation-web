# SEO/indexation readiness

## Existing state found

- Two real public routes: `/` and `/isolation/estimation`.
- Root metadata supplied title/description and `noindex,nofollow`; estimation also explicitly used `noindex,nofollow`. The homepage inherited the root blocker.
- No sitemap, robots file, canonical tags, metadataBase, Open Graph, Twitter metadata, manifest/favicon reference or JSON-LD. No duplicate static SEO files or crawler middleware found.
- Existing `lang="fr-CA"`, `/leads` noindex/nofollow metadata, authentication and protected lead-data APIs.

## Files created

- `src/app/sitemap.ts`: native Next.js `MetadataRoute.Sitemap`.
- `src/app/robots.ts`: native Next.js `MetadataRoute.Robots`.
- `src/lib/seo.ts`: fixed production origin, public-page metadata and sitemap entries.
- `tests/seo.test.mjs`: sitemap, crawler rules, canonical/metadata/image assertions.
- `scripts/check-seo.mjs`: read-only checks against an owned local production server, stopped automatically afterward.
- This report.

## Files modified

- `src/app/layout.tsx`: metadataBase, existing-logo favicon reference, removal of inherited public noindex blocker. No root canonical/OG values are imposed on private pages.
- `src/app/page.tsx`: homepage metadata export only.
- `src/app/isolation/estimation/page.tsx`: unique estimation metadata replacing noindex.

Form, qualification, Sheet integration, viewer/authentication, exports, Meta code and DNS are unchanged. No dependencies were added. No deployment management or manual deployment was performed.

## Sitemap and canonicals

Only the two existing public routes are listed:

| Page | Canonical / sitemap URL | Change frequency | Priority | Last modified |
| --- | --- | --- | --- | --- |
| Homepage | `https://isolationquebec.eu.cc` | monthly | 1 | 2026-10-19 |
| Estimation | `https://isolationquebec.eu.cc/isolation/estimation` | monthly | 0.8 | 2026-10-19 |

The stable last-modified date records this metadata update, not each request or build. Canonicals use the fixed HTTPS production origin, omit tracking queries, and have no trailing slash. This matches rendered Next.js metadata, including its normalization of the homepage canonical. There are no www, localhost or preview-domain canonical values.

Excluded: `/leads`, every `/api/*` route, login/logout, errors, internal/test/debug routes and assets. No nonexistent service/location pages were added.

## Metadata and identity

Each public page has its own title, description, index/follow directives, canonical, OG title/description/URL/site name, `fr_CA` locale and Twitter large-image card. Metadata describes residential insulation, project verification and estimates without adding claims about certifications, subsidies, savings, ratings or response times.

The OG/Twitter image is the existing `/assets/homes/isolation-maison-hiver.png` (1122 × 1402); favicon points to the existing PNG logo. Both assets return 200 locally. No fabricated images, social handles, manifest or alternate-language URLs were added. HTML remains `fr-CA`.

Structured data is intentionally omitted: the repository does not establish enough verified business identity details for an accurate Organization/LocalBusiness representation. No address, phone, legal identity, reviews, hours or extra service coverage was invented.

## Private-route safeguards

- `/leads` keeps its independent `noindex,nofollow` metadata and session check.
- Unauthenticated HTML contains the access-code screen, no lead rows/phone links and no inherited public canonical.
- Unauthenticated lead-list and both export requests return 401 with `X-Robots-Tag: noindex, nofollow`.
- Robots allows `/` and disallows `/leads` and `/api/`; it declares the production sitemap URL.
- Robots exclusion supplements existing authentication and noindex metadata; it is not an access control.

## Verification

- `npm.cmd test`: PASS, 58 tests including three focused SEO tests and all existing qualification/auth/export/Meta tests.
- `npm.cmd run lint`: PASS, no warnings.
- `npm.cmd run typecheck`: PASS.
- `npm.cmd run build`: PASS; static `/robots.txt` and `/sitemap.xml` generated.
- `node scripts/check-seo.mjs`: PASS against the local production build. Checks sitemap XML, public 200 responses, robots, actual rendered canonicals/metadata/lang, unique titles, no public noindex/header blockers, image 200s, private noindex/access screen and unauthorized API/export responses.
- Git: intended SEO source/test/report changes only; no generated files; `.env.local` remains ignored. Secret checks performed before commit.

Production serving state and actual Google indexing are not certified by these local checks. Google may take time to crawl/index and may choose a different canonical.

## Exact Search Console follow-up

Once these files are available on the existing live site:

1. Open `https://isolationquebec.eu.cc/robots.txt` and `https://isolationquebec.eu.cc/sitemap.xml`; confirm the expected rules and two public URLs.
2. Select the verified `isolationquebec.eu.cc` property in Search Console. Under **Sitemaps**, submit `https://isolationquebec.eu.cc/sitemap.xml`, then check its processing status.
3. Use **URL Inspection → Test live URL** for `https://isolationquebec.eu.cc/` and `https://isolationquebec.eu.cc/isolation/estimation`. Confirm successful fetch, indexing allowed and the expected declared canonical, then choose **Request indexing** for each public page.
4. Monitor the Sitemaps and Page indexing reports. Never request indexing for `/leads` or API URLs.

References: [Next.js metadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata), [Google Sitemaps report](https://support.google.com/webmasters/answer/7451001), [Google URL Inspection](https://support.google.com/webmasters/answer/9012289?hl=en).

Commit SHA and push result are reported in the final task response to avoid embedding a self-referential commit ID in this file.
