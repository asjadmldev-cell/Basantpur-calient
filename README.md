# Computer Gear workspace

React + TypeScript hardware catalog, dashboard and local billing workspace.

## Run

```sh
npm install
npm run dev
```

Local preview: http://localhost:5173

## Build and validation

```sh
npm run build
node tests/receipt.test.mjs
```

Receipt tests cover exact currency totals, split CGST/SGST and IGST, discount-before-tax, payments, invalid inputs, legacy no-tax receipts, amount in words and ID uniqueness.

## Pages

- `#/dashboard`: summary cards, recent activity and billing trends. Chart data is clearly labeled as sample data until receipts exist.
- `#/products`: image catalog with search, categories, sorting, favorites and cart.
- `#/products/new`: add a product with category, brand, unique optional SKU, price, MRP, description and optional image (PNG/JPG/WebP up to 2 MB).
- `#/billing/new`: dedicated receipt editor with editable business identity, customer details, catalog/custom line items, discount, optional tax, payments and notes.
- `#/receipt/<id>`: saved bill editing and A4 printing.
- `#/receipt-preview/<id>`: standalone invoice preview. Open / Print in receipt history opens this page in a new tab, with Edit bill and Print / Save PDF actions. Printing waits for the logo and fonts to load.
- `#/receipts`: searchable history and JSON backup download containing receipts and custom products.

Generate & save receipt commits the complete bill to IndexedDB before showing success. A new bill receives a unique ID; saving edits updates the existing bill. The blue-and-green invoice layout includes the supplied logo, contact details, customer block, item table, watermark, tax breakdown, totals, amount in words and signature area. Print / Save PDF opens the browser print dialog. Disable browser headers and footers for a clean A4 document.

## Local persistence

Receipts and user-added products are stored in the `computer-gear-workspace` IndexedDB database. Earlier receipts in `techstore-receipts` local storage migrate without overwriting newer records. Cart and remembered shop details retain their original local-storage keys. Storage failures are reported instead of claiming a successful save.

Data persists across reloads in the same browser and origin. It does not sync between browsers or devices; private browsing and clearing site data remove local records. Download backups from Receipts before clearing browser data. There is no arbitrary receipt-count limit, but browser storage quotas apply.

The starter catalog contains 36 sample products in 20 categories with local photos. Image source URLs are recorded in `product-image-sources.json`. Product prices, reviews and availability are sample content. Added products do not receive sample ratings. Shop contact fields default to the latest supplied invoice reference and remain editable.

There is no server, authentication, payment processing, inventory transaction engine, or government filing integration. Optional tax arithmetic uses the manually selected rate for the whole bill, with each component rounded to paise. Receipt payment details are entered manually.
