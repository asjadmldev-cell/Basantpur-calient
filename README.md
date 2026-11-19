# Computer Care workspace

React + TypeScript hardware catalog, dashboard and billing workspace with Supabase account storage.

## Cloud setup

Follow [supabase/SETUP.md](supabase/SETUP.md). Run [supabase/setup.sql](supabase/setup.sql) in Supabase and create the store login before signing in. Local configuration uses `.env.local` (ignored by Git); use `.env.example` as the template. Production builds require both cloud environment variables.

## Run

```sh
npm install
npm run dev
```

Local preview: http://127.0.0.1:5173

## Build and validation

```sh
npm run build
node tests/receipt.test.mjs
node tests/storage.test.mjs
node tests/catalog-photos.test.mjs
node tests/cloud.test.mjs
node tests/accounts.test.mjs
```

Receipt tests cover exact currency totals, split CGST/SGST and IGST, discount-before-tax, payments, invalid inputs, legacy no-tax receipts, amount in words and ID uniqueness.

## Pages

- `#/dashboard`: summary cards, recent activity and billing trends. The chart stays at zero until receipts exist. Received payments and due balances use saved receipt data.
- `#/statistics`: Hisaab / Statistics shows exact billed, received and due amounts, customer/bill search, paid/due filters and links to update payments. Older summaries without payment information are shown as unknown and excluded from received/due totals. This is a receipt ledger; expenses and profit are not recorded.
- `#/products`: image catalog with search, categories, sorting, favorites and cart.
- `#/products/new`: add a product with category, brand, quantity/stock, unique optional SKU, price, MRP, description and optional image (PNG/JPG/WebP up to 2 MB).
- `#/billing/new`: dedicated receipt editor with editable business identity, customer details, catalog/custom line items, discount, optional tax, payments and notes.
- `#/receipt/<id>`: saved bill editing, receipt removal, and A4 printing.
- `#/receipt-preview/<id>`: standalone invoice preview. Open / Print in receipt history opens this page in a new tab, with Edit bill, Remove receipt, and Print / Save PDF actions. Printing waits for the logo and fonts to load.
- `#/receipts`: searchable history, receipt deletion/removal, and JSON backup download containing receipts and custom products.

Generate & save receipt waits for the complete bill to save to the configured backend before showing success. A new bill receives a unique ID; saving edits updates the existing bill. The blue-and-green invoice layout includes the supplied logo, contact details, customer block, item table, watermark, tax breakdown, totals, amount in words and signature area. Print / Save PDF opens the browser print dialog. Disable browser headers and footers for a clean A4 document.

## Local development fallback

When Supabase environment variables are absent in development, products and receipts are stored in browser `localStorage` under `computer-care-local-workspace`. No backend or database is needed for new data. On the first load, previously saved receipts and custom products are copied from the old IndexedDB stores and legacy local-storage receipts. Migration runs only once so deleted receipts do not reappear. The old sources are left intact; save and migration failures are shown instead of reporting success.

Receipt drafts, product form drafts and store details save automatically as you type. Drafts return after reload; generating a receipt saves the completed bill in Receipts and clears its draft. Product forms require a name, brand and price. Saving a product adds it to its selected category and clears the draft.

The catalog imports the 67 products from the four handwritten lists supplied on 19 November 2026, including Camera. Desktop, Laptop, Epson, HP 1005, Canon, Cartridges and Cameras retain separate categories. Model labels such as H80, 500 and 550 are preserved as supplied. No sample products are loaded. The import runs once per workspace and preserves existing products, receipts and later edits. Prices and stock were not supplied: prices display as unset and must be entered before generating a receipt; no stock is invented. Unspecified brands can be entered in the receipt item’s Brand / company field. The receipt product picker opens all saved products, searches by product name, brand, category or SKU, and supports mouse or arrow-key/Enter selection. Selection fills the product name with its brand and price, closes the popup, and focuses quantity. Adding the same product again increases its quantity.

Data persists across reloads and browser restarts at the same origin. Use the same local link (`http://127.0.0.1:5173/`); `localhost` and a different port use different storage. Private browsing or clearing site data removes local records. Browser local-storage quotas apply, particularly with uploaded images. Download backups from Receipts before clearing browser data.

Supabase provides authentication and protected cloud persistence when configured. There is no payment processing, inventory transaction engine, or government filing integration. Optional tax arithmetic uses the manually selected rate for the whole bill, with each component rounded to paise. Receipt payment details are entered manually.

## Catalog photos

All 67 supplied products have downloaded reference photographs in `public/catalog-photos/`. The app uses `src/catalog-photos.json` to resolve photos by stable product ID, including already-saved browser records. User-uploaded product photos take priority. No runtime image requests go to supplier websites.

`catalog-photo-sources.json` records each source page, original image URL and dimensions. The photos show representative products/parts; they do not establish the brand, exact model, compatibility or availability of the store’s stock. Ambiguous handwritten model names remain unchanged. Reference-image notes appear in the catalog and product detail dialog.

Product cards, category tiles, the dashboard, cart and receipt product picker share the same photos. Images preserve their aspect ratio, load lazily and have an icon fallback on failure. `scripts/download-catalog-photos.py` restores missing image files from the recorded URLs.
