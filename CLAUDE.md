# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-file, zero-dependency browser ES module published as `@copperdesign/gsheets`. The entire module is `index.js` (~250 lines). There is no build step, no bundler, no transpile, no `npm install` (no deps, runtime or dev).

It's the modern successor to `jquery.gsheet.js` (2018, Märchenforum) and `gSheets.js` (Aktion Kinderparadies). The binding model is intentionally identical to [`@copperdesign/gcal`](https://github.com/copperdesign/gCal) — `data-column-name` here, `data-slot` there, otherwise the same `data-attr` / `data-html` / `data-remove-empty` rules. Treat that consistency as load-bearing: someone who knows one library should know the other.

## Running and testing

There is no test suite and no dev server config. The module is exercised against `example.html` in a real browser:

```sh
python3 -m http.server 8000
# visit http://localhost:8000/example.html
```

File-protocol won't work (ES modules require `http(s)://`).

The example reads a public demo sheet — you need a Google API key with the Sheets API enabled to actually fetch. Restrict the key by referrer to `localhost:8000` for local exploration.

## Architecture — the non-obvious parts

1. **Header → key mapping is case-insensitive.** Sheet column names are lowercased on parse, and `data-column-name` is lowercased on lookup. Template authors can write `data-column-name="Titel"` or `="titel"` interchangeably. This matches the 2018 jQuery plugin's behavior, which sites have relied on for years.

2. **Sheets API returns short row arrays when trailing cells are blank.** Don't index into `values[i]` past the headers' length expecting `undefined` — the cell may simply be absent. `parseSheet()` reads `cells[j] ?? ''` to coerce missing trailing cells into empty strings; preserve that.

3. **`AbortController` is re-created per render.** A `consentchange` event can fire while a fetch is in flight (e.g. consent revoked, re-granted, modal opened twice). Cancel the previous and start fresh — the latest render wins. Don't try to coalesce; aborts here are cheap and correctness matters more than over-fetching by one.

4. **The consent CTA's button is wired before append.** The fragment we clone from the CTA template is what we listen on; if we append first and then look up the button, we still find it, but the cleanup function needs the same node reference both ways. Easier to do it in one pass.

5. **`bindColumn()` mirrors gCal's `bindSlot()`.** When making changes to one, consider whether the other needs the same change — they're contract-twins. If a binding rule diverges between the two libs, document why prominently.

## Conventions that matter here

- **One file, zero deps, no build step.** These are load-bearing — see `CONTRIBUTING.md`.
- **Preserve the `/*! ... */` header on line 1 of `index.js`.** It's the license notice that survives minification.
- **Comment WHY, not what.** Browser quirks, Sheets API surprises, the reason a default exists — write the reasoning down. Don't narrate the next line.
- **Long descriptive names over clever short ones.** `renderConsentCTA` over `rcc`.
- **Default to safety.** `textContent` over `innerHTML`. Opt-in to HTML via `data-html` per slot. There is no global toggle on purpose.

## Release flow

The repo is master-first; commits go straight to `master`. Releases are tag-triggered:

```sh
npm version patch        # bumps package.json, commits, tags vX.Y.Z
git push --follow-tags
gh release create vX.Y.Z --generate-notes
```

If a `release.yml` workflow is set up, it publishes to npm with provenance from the tag. Requires `NPM_TOKEN` repo secret.
