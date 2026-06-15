# @copperdesign/gsheets

[![npm version](https://img.shields.io/npm/v/@copperdesign/gsheets.svg)](https://www.npmjs.com/package/@copperdesign/gsheets)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@copperdesign/gsheets)](https://bundlephobia.com/package/@copperdesign/gsheets)
[![license](https://img.shields.io/npm/l/@copperdesign/gsheets.svg)](./LICENSE)

Render a published Google Sheet through an HTML `<template>`. Point it at a sheet, an API key, and a template with `data-column-name` slots — it fetches the rows and stamps them into the DOM. Zero dependencies, ESM only. ~3 KB unminified.

```html
<section>
  <template id="article">
    <article>
      <h3 data-column-name="titel"></h3>
      <p  data-column-name="inhalt" data-html></p>
    </article>
  </template>
  <div class="articles"></div>
</section>

<script type="module">
  import gSheets from '@copperdesign/gsheets';

  gSheets({
    target:   '.articles',
    template: '#article',
    sheetId:  '1t6WRNO0Swv844uWZKkqC3Ot-0r67CI9kzKs5lZ7gNzg',
    apiKey:   'YOUR_GOOGLE_API_KEY',
  });
</script>
```

That's the whole API.

## What it does

- **Reads any web-published Google Sheet.** First row is treated as column headers; every subsequent row becomes a clone of the template, with `data-column-name="<header>"` slots filled in. Header matching is case-insensitive.
- **Renders into a `<template>`, not a hardcoded layout.** You own the markup.
- **Escapes by default.** `textContent` is the default; opt into `innerHTML` per-slot with `data-html` for cells you trust (your own sheet).
- **Optional consent gate.** Provide a `consent` adapter and the library paints a click-to-load CTA first, fetching only after opt-in.
- **State templates.** Provide `loadingTemplate` / `emptyTemplate` / `errorTemplate` for the three lifecycle states.
- **Idempotent teardown.** The returned function cancels the in-flight fetch, removes listeners, and clears the target. Safe to call from SPA cleanup.

## Install

```sh
npm install @copperdesign/gsheets
```

Or vendor [`index.js`](./index.js) directly — it's one file with no dependencies.

## Template binding

The template is plain HTML inside a `<template>` element. Four attributes control rendering:

| Attribute | Effect |
|---|---|
| `data-column-name="titel"` | `element.textContent = row.titel` (escaped) |
| `data-column-name="inhalt" data-html` | `element.innerHTML = row.inhalt` (trusted) |
| `data-column-name="link" data-attr="href"` | `element.setAttribute('href', row.link)` |
| `data-column-name="…" data-remove-empty` | Remove the element when the value is empty (default: add `hidden`) |

The conventions match [`@copperdesign/gcal`](https://github.com/copperdesign/gCal) one-for-one — `data-column-name` instead of `data-slot`, otherwise identical.

## API

```js
import gSheets from '@copperdesign/gsheets';

const teardown = gSheets(options);
```

### `options`

```js
gSheets({
  // Required
  target:   '.articles',                 // selector or Element
  template: '#article',                  // selector, <template>, or HTML string
  sheetId:  '…',                         // the long string in the sheet's URL
  apiKey:   '…',                         // Google API key with the Sheets API enabled

  // Optional
  range:    'A1:Z100',                   // A1-notation range. Default: 'A1:Z100'
  spinner:  '<div>Loading…</div>',       // HTML used while fetching (if no loadingTemplate)

  loadingTemplate: '#article-loading',   // selector, Element, or HTML string
  emptyTemplate:   '#article-empty',
  errorTemplate:   '#article-error',     // can bind data-column-name="message"

  // Consent gate (omit for no gating)
  consent: {
    check:   () => window.consent?.hasConsent?.('gsheets') ?? false,
    request: async () => window.consent?.optIn?.('gsheets'),
    ctaTemplate: '#article-cta',         // shown when check() is false
    event:   'consentchange',            // DOM event to re-render on (default)
  },

  // Hooks
  transformRow: (row, i, all) => ({ ...row, slug: slugify(row.titel) }),
  onError:      (err) => console.error(err),
});
```

### Returns

A `teardown()` function. Aborts any in-flight request, removes the `consentchange` listener, and empties the target.

## Consent flow

The library never imports a specific consent SDK. You implement a small adapter:

```js
import gSheets from '@copperdesign/gsheets';

gSheets({
  /* … */,
  consent: {
    check:   () => window.myConsent.has('gsheets'),
    request: async () => window.myConsent.optIn('gsheets'),
    ctaTemplate: '#article-cta',
  },
});
```

```html
<template id="article-cta">
  <div class="consent-card">
    <p>Beim Laden der Tabelle werden Daten an Google übertragen.</p>
    <button data-gsheets-optin>Inhalt laden</button>
  </div>
</template>
```

When consent is granted (synchronously or by `request()` resolving), the library fetches and renders. If a `consentchange` CustomEvent fires on `document` later (e.g. from a global cookie banner), it re-renders automatically.

### With `@copperdesign/easy-cookie-consent`

The blessed pairing — a zero-dependency consent gate built to the same shape. The adapter is three lines:

```js
import gSheets from '@copperdesign/gsheets';
import easyCookieConsent from '@copperdesign/easy-cookie-consent';

const ecc = easyCookieConsent({
  onConsent: () => document.dispatchEvent(new CustomEvent('consentchange')),
});

gSheets({
  /* … */,
  consent: {
    check:   () => ecc.hasConsent('gsheets'),
    request: () => ecc.optIn('gsheets'),
    ctaTemplate: '#article-cta',
  },
});
```

gSheets stays provider-agnostic — easy-cookie-consent is opt-in, not bundled.

## State templates

```html
<template id="article-empty">
  <p>Keine Einträge.</p>
</template>

<template id="article-loading">
  <p aria-busy="true">Daten werden geladen…</p>
</template>

<template id="article-error">
  <p class="gsheets-error">Fehler: <span data-column-name="message"></span></p>
</template>
```

The error template renders through the same binding path as row templates — `data-column-name="message"` (escaped) or `data-html` (trusted) work as expected.

## Getting the API key

1. [Google Cloud Console](https://console.cloud.google.com/) → enable the **Google Sheets API**.
2. Create an API key, restrict it by HTTP referrer to your domains.
3. In your sheet: **File → Share → Publish to the web** so the API can read it without OAuth.

The API key ships to the browser. Restrict it by referrer to the domains you control — otherwise anyone can use your quota.

## Browser support

Modern evergreens. Requires native `fetch`, `<template>`, `URLSearchParams`. No build step required.

## Provenance

This module is the modern successor to two earlier scripts:

- `jquery.gsheet.js` (2018, jQuery, used on the Märchenforum site).
- `gSheets.js` shipped with the Aktion Kinderparadies site — same idea, jQuery removed, consent gate inlined.

This rewrite drops jQuery, makes the binding rules consistent with [`@copperdesign/gcal`](https://github.com/copperdesign/gCal), defaults to safe `textContent` rendering, and makes consent gating a contract rather than a built-in.

## License

MIT © Christian Fillies
