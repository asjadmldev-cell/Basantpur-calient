# Computer Care cloud setup

1. In the **Computer Care** Supabase project, open **SQL Editor → New query**. Paste all of `setup.sql` from this folder and press **Run**. It creates the table, unique product codes and owner-only row access. It is safe to run again.
2. Open **Authentication → Users → Add user → Create new user**. Enter the store owner's email and a strong password. Enable **Auto Confirm User** when offered. Keep the password private. This is the website login, separate from your Supabase dashboard login and database password.
3. Open http://127.0.0.1:5173/ and sign in with that store account. The 67 catalog products are added once without overwriting existing records.
4. In the same browser/origin where old bills were saved, click **Import browser data** and confirm the destination email. Existing cloud bills and edited products are preserved; unchanged catalog defaults can receive old local prices. Original local data remains intact. The import can be retried after a connection failure.
5. Add a product and generate a test receipt. Sign in to the same URL with the same account in a second browser and verify both records. Delete the test receipt afterward if desired.

## Vercel

- Import this repository, select **Vite**, and use `techstore` as Root Directory if the repository root is its parent folder.
- Build command: `npm run build`. Output directory: `dist`.
- Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from your local `.env.local` to the production environment. Add them to preview environments too if needed. Redeploy after changing variables.
- Only the publishable key belongs in a browser app. Never add a secret key, service-role key or database password to any `VITE_` variable. Revoke any secret shared in chat from Supabase's API Keys page.
- This app uses email/password login and hash routes; no OAuth/email-link callback is needed. If adding password-reset or email-confirmation links later, configure the production Site URL and exact allowed redirect URLs in Supabase first.

## What is saved where

Products, uploaded product images, completed receipts (including payment, due balance and tax fields), shop details and logo are saved in Supabase. Uploaded images are currently stored as data URLs within their protected records (2 MB per product image, 1 MB per logo), so another device can display them. Bundled catalog reference photos are served with the website.

Each login owns a private workspace. Use the **same account** on all devices for this shop. A different account sees a separate catalog and cannot read the owner's receipts. This is not a multi-staff shared-access model.

Unfinished bill/product drafts and cart are browser-local and isolated by project/account. Generate the receipt or save the product to make it available on another device. Internet is required for cloud writes; failed writes show errors instead of pretending to save. Lists refresh on focus, manually, and every 15 seconds while the page is visible. Shop details use the latest successful save; receipt edits reject stale versions so another device cannot silently overwrite a newer bill.

Use **Download backup** in Receipts to export products and receipts. Browser data import applies to this exact browser origin; `localhost` and `127.0.0.1` are separate. Cloud credentials being configured does not run SQL or create the login user automatically.

## Verification status

Build, receipt arithmetic, local migration, catalog assets, mocked cloud persistence/concurrency and UI flows are checked locally. The owner has run the SQL, created a login and reported a successful data import. An anonymous REST read was verified to return HTTP 401 / permission denied. Two-account live RLS testing and authenticated save testing by the assistant remain unverified because browser access is unavailable; the automated cloud UI tests use a simulated API. Hisaab totals and payment editing have automated arithmetic and UI coverage. No secret/admin key is required by the app.
