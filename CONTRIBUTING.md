# Contributing

Thanks for the interest. This is a small, focused browser module —
contributions that make it sharper, less surprising, or more useful for
the next person dropping a sheet-driven list onto a page are welcome.

## Ownership and merging

I (@copperdesign) maintain the repo and merge all PRs. You're welcome to
fork, branch, and propose changes — I'll review on my own timeline. No CLA.

## What fits

Yes:

- Bug fixes with a clear repro (a minimal HTML page + a public test
  sheet is the gold standard)
- Edge cases in Sheets API behavior you hit on a real site (short row
  arrays, header collisions, quota responses, …)
- Sharper handling of malformed sheets — empty header rows, duplicate
  header names, blank rows in the middle of data
- Doc clarifications — especially the WHY of a behavior that confused
  you
- Quality-of-life additions to existing options that don't widen the
  API surface

Probably no — open an issue first to discuss:

- New top-level options on the `options` object
- Adding runtime dependencies (the module is intentionally zero-deps;
  the contract is one file, browser APIs only)
- Restructuring `index.js` into multiple files
- Framework-specific wrappers (React, Vue, etc.) — these belong in
  separate packages that depend on this one
- Diverging the binding model from
  [`@copperdesign/gcal`](https://github.com/copperdesign/gCal) —
  consistency is a feature; new attributes should land in both libs or
  neither

Hard no:

- Adding a build step, bundler, or transpile pipeline. The module
  ships as plain ES module source.
- Telemetry, analytics, "phone home" of any kind.
- Auto-generated boilerplate PRs (license bumps from bots, dependency
  pings against non-existent deps, mass formatting reflows).
- Defaulting to `innerHTML` — escaped `textContent` is the safe
  default. Opt-in HTML stays a per-slot decision.

## Getting set up

```bash
git clone https://github.com/copperdesign/gSheets.git
cd gSheets
```

No `npm install` — there are no dependencies, runtime or dev. Run a
static server to exercise the module against a real sheet:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000/example.html
```

(File-protocol won't work — ES modules require `http(s)://`.)

You'll need:

- A public Google Sheet (File → Publish to the web).
- A Google API key with the Sheets API enabled, restricted by HTTP
  referrer to `localhost:8000` for local exploration.

## PR workflow

1. Fork and branch off `master`. Branch names are free-form.
2. Keep PRs scoped. One concern per PR; bundle small drive-by cleanups
   into the same diff if they're in the file you're touching,
   otherwise open a separate PR.
3. Write commit messages that explain *why*, not what. Mirror the
   style already in `git log` — short prefix, present-tense subject,
   body when it earns its place.
4. In the PR description: what changed, why, and how you tested. A
   short screen recording for anything visible (CTA appearance,
   re-render on consent change, error template) saves a lot of
   back-and-forth.
5. Open the PR against `master`.

## Code style

The module is a single plain ES module targeting evergreen browsers
(anything that ships `fetch` + `<template>`). No transpile, no bundle.

- **Zero runtime deps.** Browser APIs only. If you need a helper,
  write it inline.
- **One file.** `index.js` is the whole module. Don't split it up.
- **Comment liberally.** Inline comments explain WHY. Sheets API
  quirks, browser surprises, the reason a default exists — write the
  reasoning down. Don't narrate the obvious line below.
- **Long, descriptive names** over short clever ones.
  `renderConsentCTA` beats `rcc`.
- **`async`/`await` over callbacks or stray `.then()` chains.**
- **Idempotent teardown.** Calling the returned `teardown()` twice
  should be safe and silent.
- **Preserve the file header.** The top `/*! ... */` banner is the
  license notice that survives minification — leave it intact.

## Testing

There's no test suite — the module is exercised against `example.html`
and real sites. Before opening a PR:

1. Open `example.html` in a fresh browser. Confirm rows render, the
   loading/empty/error states paint correctly, and the consent CTA
   appears when gated.
2. Test the case where the sheet has zero data rows — the empty
   template (or empty target) should show.
3. Test the case where the API key is invalid — the error template
   (or fallback `.gsheets-error` div) should show the API error
   message.
4. Confirm `teardown()` actually removes listeners — the easiest
   check is to call it and verify that `consentchange` events no
   longer trigger a re-render.

Note what you tested in the PR description, including browser + OS.

## Reporting bugs

Open an issue with:

- A minimal HTML page that reproduces it (a Gist or CodePen is fine)
- A minimal public sheet showing the data shape
- The browser + OS where it reproduces
- What you expected vs. what happened
- The version (from `package.json` or your `npm ls` output)

A short screen recording is worth a thousand words for anything
visual.

## Asking questions

Issues are fine for questions too — tag them `question`. Don't email
me directly with usage questions; an issue helps the next person.
