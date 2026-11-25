# PharmaStudents — Project Analysis & Security Audit

Date: 2026-11-25 · Branch: `arena/e8b31734-website` (base `885ef1a`) · Scope: full repo + live Supabase project `tfganiacycmmnorfyqam` (PharmaStudents, ACTIVE_HEALTHY)

---

## 1. What this project is

A **B.Pharm digital learning storefront**: semester-wise notes (PDF) behind a paywall, student accounts, an admin console for publishing material, and a Razorpay checkout.

| Aspect | Detail |
| --- | --- |
| Stack | React 19 + TanStack Start (SSR) + TanStack Router 1.170 + TanStack Query, Vite 8 (rolldown), Tailwind v4, shadcn/ui (New York, 46 primitives), lucide icons |
| Backend | Supabase (Postgres 17 + Auth + Storage + 7 Deno Edge Functions), Razorpay payments |
| Data access | Directly from the browser with the **anon/publishable key** — no server API layer of its own (only `src/server.ts` as an SSR error wrapper); authorization relies entirely on Postgres RLS |
| Toolchain | npm ``build`` → nitro → Cloudflare worker target; `tsc --noEmit` + `eslint` (prettier enforced); **no test suite, no CI** |
| Size | ~30k LOC across 123 TS/TSX files, 40 route files, 46 UI primitives |
| History | Single import commit (`change combo`, Oct 2026) — i.e. the whole app landed in one squashed commit |

**Routing map (40 routes)** — public: `/`, `/bpharm`, `/resources`, `/resources/$materialId`, `/packages`, `/why`, `/about`, `/contact`, `/privacy`, `/terms`, `/refund`, `/shipping`; auth: `/login`, `/register`, `/admin/login`; commerce: `/cart`, `/checkout`, `/viewer/$materialId`; student: `/dashboard`, `/dashboard/my-resources`, `/dashboard/orders`, `/dashboard/profile`, `/student/combos`; admin: `/admin`, `/admin/students`, `/admin/courses`, `/admin/subjects`, `/admin/materials`, `/admin/orders`, `/admin/reports`, `/admin/settings`, `/admin/settings/payment`.

**Domain model (live DB counts)**

| Table | Rows | Notes |
| --- | --- | --- |
| `profiles` | 715 | student roster; 687 of them Year 1 / Sem 1 |
| `auth.users` | 715 | 1:1 with profiles, no orphans |
| `courses` | 1 | B.Pharm |
| `semesters` | 8 | schema ready |
| `subjects` | **6** | only Semester 1 populated |
| `units` | 30 | 5 per subject |
| `materials` | 30 | 24 paid (₹99), 6 free, **all Semester 1** |
| `packages` | 8 | semester/year bundles |
| `orders` | 198 | 82 Paid (₹7,327), 70 Pending, 46 Failed |
| `purchases` | 721 | entitlements |
| `admins` | 1 | `siddu` |

**Architecture as built:** `src/lib/store.tsx` (1,125 lines) is the de-facto app shell — a React context holding `db` (subjects/materials/students/orders/packages/settings), session, auth actions, purchases, favourites, access checks and admin metrics. It hydrates from `localStorage` first (demo seed of 36 subjects / 108 materials), then asynchronously overwrites with live Supabase data. `src/lib/academicService.ts` (1,676 lines) is the real CRUD layer for courses → semesters → subjects → units → materials, including storage uploads with progress and Drive-link parsing. `AcademicService.loadAll()` is called independently by **13 components**, i.e. the same 8-table fetch runs on nearly every page.

---

## 2. Does it work?

Yes — it boots, builds and serves.

* `npm ci` → clean (451 packages).
* `npm run dev` → Vite ready in ~1s; `/` renders SSR HTML (63 KB) with live 200s on public routes.
* `npm run build` → succeeds (nitro/Cloudflare output), client JS ~1.5 MB.
* Live data is real: 715 students, 721 purchases, 30 PDFs in the private `notes` bucket.

**Fix applied in this session:** the dev server rejected the platform's preview host (`Blocked request. This host … is not allowed`). Added `vite.server = { host: "0.0.0.0", allowedHosts: true }` in `vite.config.ts` and committed it; preview now loads. Dev server is running on port 8080.

---

## 3. Findings, by severity

### 🔴 Critical — the paywall and the admin area are effectively open

I verified these against the **live** database, not just the migration files.

1. **Anyone (unauthenticated, anon key) can read the admin credential hash.**
   `admins` has `"Allow read admins for login" FOR SELECT USING (true)` and `GRANT … TO anon`
   (`supabase/migrations/20260301_init_pharmastudents.sql:125-135`, unchanged by later migrations).
   Live proof: as role `anon`, `select username,email,password_hash from public.admins` returned the `siddu` row.
   The hash is a single salted SHA-256 (`src/lib/hash.ts`) — offline brute-forcing of a weak password is trivial.

2. **Anyone (unauthenticated) can rewrite curriculum.**
   `subjects`, `materials`, `courses`, `units`, `semesters`, `packages` all carry `FOR ALL USING (true) WITH CHECK (true)`
   (`20260302_fix_rls_and_academic_policies.sql:60-99`, `20260305_material_management_policies.sql:60-91`).
   Live proof: as `anon`, `insert into public.subjects …` succeeded (rolled back). Anonymous users can delete or price-tamper the catalogue.

3. **Any student can make themselves admin.**
   `profiles` is `SELECT/INSERT/UPDATE USING (true)` with `GRANT ALL … TO anon`
   (`20260303_fix_profiles_recursion.sql:22-36`).
   Live proof: as `anon`, `update public.profiles set role='admin'` updated a row.

4. **Every premium PDF is readable without buying it, and any user can publish/delete files.**
   Bucket `notes` is `public=false`, but its storage policies are `USING (bucket_id='notes')` for SELECT/INSERT/UPDATE/DELETE granted to `public`
   (`20260305_material_management_policies.sql:109-124`).
   Live proof: as `anon`, `select count(*) from storage.objects where bucket_id='notes'` → **39 objects visible** (all 30 premium files).

5. **All 715 students' personal data is world-readable.**
   `profiles_select_all USING (true)` exposes name, email, mobile, college. Same for `orders`/`purchases` select policies in the 20260302 set. Combined with (1), the whole roster (email + phone) is scrapeable.

> These four items mean the current production DB should be treated as compromised-by-design: **rotate the admin password, add a migration that drops the `true` policies, and replace the browser-side admin login.**

6. **The client has a self-granting "unlock".**
   `src/lib/store.tsx:1043` `unlock()` writes a `purchases` row with `status:"unlocked"` and an order with `status:"Paid"` and a fake `transactionId` — "Demo simulation completes payment immediately" (`store.tsx:965`). It is currently unreferenced from any route (only defined), and `createOrder` (also demo-simulating) is likewise unused — so it's dead code today, but it is exactly the bypass that becomes reachable the moment someone wires a "demo" button back in. Delete both.

### 🟠 High

7. **Admin authentication happens in the browser.** `adminLogin` (`src/lib/store.tsx:738`) queries `admins`, compares a SHA-256 client-side, then optionally `signInWithPassword`. Passwords are verified with a client-side hash and a **global static salt**; there is no server function, no rate limit, no session hardening. This must move to a server-side/Edge Function or Supabase Auth with a `role` claim.

8. **`handle_new_user()` trusts user metadata.** The signup trigger copies `raw_user_meta_data->>'role'` into `profiles.role` (`20260301_init_pharmastudents.sql:48-74`). `supabase.auth.signUp({options:{data:{role:"admin"}}})` from the browser is enough. Force `role='student'` in the trigger (and see fix migration below).

9. **Two conflicting admin password hashes in the repo.** `src/lib/seed.ts:589` stores the hash of `@2026`; `20260301_init_pharmastudents.sql:137+` stores the hash of `Siddu@2026` for the same `siddu@gmail.com`. I confirmed both by reproducing the salted SHA-256. Whichever path you log in through, one of the documented credentials is wrong — and both are in git history, so the demo credential must be rotated before launch.

10. **Duplicated, half-broken admin material flows.** `admin/materials/add.tsx` (539 lines, orphaned — nothing links to it) saves to `localStorage` only, and its "upload" is a simulated progress bar (`add.tsx:82-95`) that stores no file. `admin/materials/create.tsx` (697 lines) is the real one (uploads to `notes`, inserts into `materials`). Two nearly-identical pages for the same job is the most likely source of "admin added material but students can't see it" bugs.

11. **`loadAll()` fan-out + no pagination.** 8 parallel table reads × 13 call sites, each time a page mounts; `materials.sampleContent` and `fileDataUrl` blobs are kept in the store; the whole 641-line seed module is bundled for the client as a fallback. Every page load is an N×8 query burst against a 715-row roster.

12. **The `store` merges demo seed and live data silently.** `store.tsx:247` uses live rows only when `length > 0`, otherwise falls back to the seeded 36-subject/108-material demo catalogue (`prev.*`). So a DB that legitimately has zero materials or zero subjects silently renders *demo* content, and admin metrics (`metrics`, `store.tsx:487`) mix seed orders with real ones. "No data" and "demo data" must not be indistinguishable.

### 🟡 Medium

13. **Type safety is off in practice.** 62 `tsc` errors — all currently unchecked at build time because `vite build` does not type-check (`tsc` exits 1 but nothing gates on it). Worst offenders: `academicService.ts` (21), `admin/subjects/create.tsx` (8), `purchaseDetection.ts` (6), and **two calls to methods that don't exist**: `AcademicService.checkSubjectDependencies` (`admin/subjects/index.tsx:86`) and `AcademicService.uploadSubjectThumbnail` (`admin/subjects/create.tsx:180`) — those code paths throw at runtime.

14. **Lint is effectively unusable.** 2,415 problems (2,390 errors): 2,120 are `prettier/prettier`, 252 `no-explicit-any`, 14 `no-empty`, 4 `prefer-const`. Nothing can be "green" so linting is ignored — and the 168 `as any` casts hide real breakage (e.g. `materials` rows are read with fields `file_name`/`file_size`/`year`/`semester`/`drive_url` that the generated `types.ts` for `materials` doesn't even declare; only 10 of ~37 live columns are typed). Regenerating `src/integrations/supabase/types.ts` from the live DB is a prerequisite for any real type-checking.

15. **`notes` bucket file layout is inconsistent with the code's own convention.** `academicService.addMaterial` writes `${course_id}/${semester_id}/${subject_id}/unit-N/${ts}_${file}`, while live rows look like `${uuid}/${uuid}/unit-N/${file}` — and 30 materials point at 30 distinct objects, but the folder names contain no readable year/semester. Any external Drive/Storage browser will be unusable until paths are normalised (docs say `Student Pharma/Year N/Semester N/...`).

16. **Google Drive is still a documentation stub, not an integration.** There is link parsing (`extractGoogleDriveId`) and two URL fields, but no OAuth, no Drive API, no folder browsing, no "upload the PDF to Drive when the admin adds material" — despite the README's closing requirement. Admin "Google Drive" settings (`admin/settings/index.tsx`) only store a folder name/ID in `localStorage`.

17. **Storage security settings are not enforced.** `allow_download`, `allow_print`, `add_watermark`, `visible_to` columns exist on `materials` and the viewer reads `add_watermark`, but downloads are a plain signed URL (`createSignedUrl`, 1 h) that the browser then fetches — nothing stops copying that URL. The "watermark" is a DOM overlay (`viewer/$materialId.tsx:705`), not in the PDF.

18. **README's content promise ≠ seeded data.** The README specifies 27+ subjects across Years 1–4 with prices ₹149–₹299; the DB has 6 subjects, Semester 1 only, all ₹99. 687 of 715 students are sitting in Sem 1, so the rest of the catalogue is empty-state everywhere.

19. **SEO/metadata is thin.** Only `__root.tsx` defines `<head>` — every route shares one title/description. No `sitemap.xml`, no route-level OG tags, no canonical. `robots.txt` allows everything including `/dashboard`, `/admin`, `/viewer`.

20. **Edge functions duplicate each other.** `create-order` (29 KB) and `create-razorpay-order` (28 KB), `verify-payment` (13 KB) and `verify-razorpay-payment` (13 KB) are near-copies with a client-side fallback in `paymentService.ts`. Two code paths to keep in sync for money handling.

### 🟢 Low / hygiene

21. `scratch_inspect_real_db.mjs` is tracked and contains the live project URL + a hardcoded anon JWT. (Anon keys are public by design, but shipping a "scratch" script pointing at prod is sloppy — delete it.)
22. `scripts/*.mjs` (10 files) are one-off DB probes with no README; `supabase/.temp/cli-latest` is committed; both `bun.lock` and `package-lock.json` are tracked (pick one).
23. `.env.example` is empty (0 bytes) though the client requires `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` or it throws at boot.
24. `drizzle/` is an empty remnant (blank schema + one journal entry) while the real schema lives in `supabase/migrations`; `drizzle-orm`, `postgres`, `drizzle-kit`, `nitro` sit in `devDependencies` unused.
25. `viewer/$studentId/$materialId` and the `?studentId=` search param let a URL carry another student's id; the viewer then trusts `routeStudentId` for entitlement lookups (`viewer/$materialId.tsx:95-100`). With correct RLS this fails closed; today it fails open. Remove the param.
26. `hooks/use-mobile.tsx`, 46 shadcn primitives and several deps (input-otp, carousel, command palette) are shipped but largely unused — dead weight in a 1.5 MB client bundle.
27. Copy/branding drifts: "Student Pharma B.Pharm" (README), "PharmaStudents.com" (root metadata, footer), "Pharma Compass" (README h1). Pick one.
28. `materials` in `types.ts` declares 10 columns; the table has 37. Same pattern for most tables — see #14.

---

## 4. Fix order I'd recommend

1. **Stop the bleeding (DB-only, ~1 migration):** a `20260311_lock_down_rls.sql` that
   - drops every `USING (true)`/`WITH CHECK (true)` policy on `profiles`, `subjects`, `materials`, `courses`, `units`, `semesters`, `packages`;
   - drops `"Allow read admins for login"` and `"Allow admin management"` on `admins`, and revokes `anon` from it entirely (admin login then goes through an Edge Function using the service role);
   - scopes `profiles` to `auth.uid() = id` for select/update, admin-only otherwise; forces `role='student'` in `handle_new_user()`;
   - replaces `notes_storage_*` with: SELECT/INSERT/UPDATE/DELETE restricted to `public.is_admin()`, plus SELECT for a student only when a `purchases` row or a `Paid` order covers that material;
   - keeps `materials`/`subjects` public SELECT but only for `published` rows.
   I can write and apply this migration for you — it will change behaviour (e.g. the admin roster, and the `store`'s "read everything, filter client-side" pattern), so review first.

2. **Rotate credentials:** new admin password (both hashes), confirm `RAZORPAY_*` secrets are live-mode or intentionally test.

3. **Delete the demo-mode code paths:** `store.unlock`, `store.createOrder`, `admin/materials/add.tsx`, `scratch_inspect_real_db.mjs`; make seed fallback explicit/demo-labelled.

4. **Regenerate Supabase types, then fix the 62 `tsc` errors** (the two missing `AcademicService` methods first), gate CI on `tsc` + `lint`, and set the prettier pass loose once so lint becomes meaningful.

5. **Consolidate data loading:** one `loadAll` (TanStack Query cache) shared by pages, paginate `orders`/`students`, drop seed blobs from the client path.

6. **Then features:** real Google Drive integration (OAuth + folder tree + upload-on-publish), per-route `<head>`, sitemap, and the Year 2–4 catalogue from the README.
