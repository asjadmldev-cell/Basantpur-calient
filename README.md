# TechStore UI

Responsive React + TypeScript hardware storefront based on the supplied design reference.

## Run

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
npm run preview
```

Includes category and product search, featured/new/bestseller/offer filters, sorting, product details, cart quantity editing, favorites, a PC component picker, and a receipt composer with print-to-PDF. Cart and receipt summaries are saved in this browser's local storage.

This deliverable is a UI design prototype, matching the user's request. Catalog, ratings, availability, prices, and store contact information are illustrative. It does not implement authentication, a backend/database, inventory transactions, payment processing, or GST tax invoicing. The receipt is explicitly labeled as a preview. Receipt tax configuration and production services require a separate implementation.

The supplied reference image is used as a visual sprite for hardware photography via SVG viewports. Replace it with individual licensed product photos when connecting a real catalog.
