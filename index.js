/*! gSheets — v0.1.2 - 2026-06-15
 * https://copperdesign.github.io/
 *
 * Copyright (c) 2026 Christian Fillies;
 * Licensed under the MIT license */

/**
 * Render a published Google Sheet through an HTML <template>.
 *
 * Point this at a sheet (File → Publish to the web), an API key, and a
 * <template> with `data-column-name="<header>"` slots. The first sheet
 * row is treated as column headers; every subsequent row is cloned into
 * the template and appended to the target.
 *
 * Consent-gate-friendly: the fetch hits sheets.googleapis.com, which
 * transfers the visitor's IP to Google. Pass a `consent` adapter to
 * paint a click-to-load CTA first and only fetch on explicit opt-in.
 *
 * @docs README.md
 */

const SHEETS_ENDPOINT = 'https://sheets.googleapis.com/v4/spreadsheets';

const defaults = {
  // Sheet range in A1 notation. 'A1:Z100' covers most "small list"
  // sheets; raise it for longer tables.
  range: 'A1:Z100',
  // Initial "loading…" markup. Overridden by `loadingTemplate` when set.
  spinner: '<div class="gsheets-loading" aria-busy="true">Loading…</div>',
};

/**
 * Initialize a sheet→template renderer on a target element.
 *
 * @param {Object} options
 * @param {HTMLElement|string} options.target      Container element or selector.
 * @param {HTMLTemplateElement|string} options.template  <template> or selector for the row markup.
 * @param {string} options.sheetId                 The spreadsheet ID (the long string in the sheet's URL).
 * @param {string} options.apiKey                  A Google API key with the Sheets API enabled.
 * @param {string} [options.range='A1:Z100']       A1-notation range to read.
 * @param {string} [options.spinner]               HTML string used while fetching.
 * @param {HTMLTemplateElement|string} [options.loadingTemplate]  <template> shown during fetch.
 * @param {HTMLTemplateElement|string} [options.emptyTemplate]    <template> shown when the sheet has zero rows.
 * @param {HTMLTemplateElement|string} [options.errorTemplate]    <template> shown on fetch failure.
 * @param {Object}   [options.consent]             Consent adapter (see README).
 * @param {string}   [options.consent.event='consentchange']  DOM event to re-render on.
 * @param {function} [options.transformRow]        (row, index, allRows) => row.  Mutate or replace per-row data before render.
 * @param {function} [options.onError]             Called with the Error before the error template renders.
 *
 * @returns {Function} teardown — removes the consentchange listener and clears the target.
 *
 * @docs README.md#api
 */
export default function gSheets(options = {}) {
  const target   = resolveTarget(options.target);
  const template = resolveTemplate(options.template);
  if (!target)            throw new Error('gSheets: target is required');
  if (!template)          throw new Error('gSheets: template is required');
  if (!options.sheetId)   throw new Error('gSheets: sheetId is required');
  if (!options.apiKey)    throw new Error('gSheets: apiKey is required');

  const opts = {
    ...defaults,
    ...options,
    target,
    template,
    loadingTemplate: options.loadingTemplate ? resolveTemplate(options.loadingTemplate) : null,
    emptyTemplate:   options.emptyTemplate   ? resolveTemplate(options.emptyTemplate)   : null,
    errorTemplate:   options.errorTemplate   ? resolveTemplate(options.errorTemplate)   : null,
  };

  let abortCtrl = null;
  let cleanupCTA = null;
  const consentEvent = opts.consent?.event ?? 'consentchange';
  const onConsentChange = () => render();

  async function render() {
    // Cancel any in-flight fetch from a previous render — `consentchange`
    // can re-fire while we're mid-request, and we want the latest one to win.
    if (abortCtrl) abortCtrl.abort();
    if (cleanupCTA) { cleanupCTA(); cleanupCTA = null; }

    if (opts.consent && !opts.consent.check()) {
      if (!opts.consent.ctaTemplate) {
        throw new Error('gSheets: consent.ctaTemplate is required when consent.check is provided');
      }
      cleanupCTA = renderConsentCTA(opts.target, resolveTemplate(opts.consent.ctaTemplate), async () => {
        await opts.consent.request();
        render();
      });
      return;
    }

    showLoading(opts);
    abortCtrl = new AbortController();
    try {
      const rows = await fetchRows(opts, abortCtrl.signal);
      renderRows(opts, rows);
    } catch (err) {
      if (err.name === 'AbortError') return;
      opts.onError?.(err);
      renderError(opts, err);
    }
  }

  // Wire the consent re-render listener (only if a `consent` adapter is
  // provided — sites without gating shouldn't accumulate stray listeners).
  if (opts.consent && consentEvent) {
    document.addEventListener(consentEvent, onConsentChange);
  }
  render();

  return function teardown() {
    if (abortCtrl) abortCtrl.abort();
    if (cleanupCTA) cleanupCTA();
    if (opts.consent && consentEvent) {
      document.removeEventListener(consentEvent, onConsentChange);
    }
    opts.target.replaceChildren();
  };
}

// ── fetch ────────────────────────────────────────────────────────────

async function fetchRows(opts, signal) {
  const url = `${SHEETS_ENDPOINT}/${encodeURIComponent(opts.sheetId)}/values/${encodeURIComponent(opts.range)}?majorDimension=ROWS&key=${encodeURIComponent(opts.apiKey)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    // Google's error payload is more useful than HTTP statusText
    // ("API key not valid" beats "Bad Request"). Prefer it when present.
    let detail = res.statusText || `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error?.message) detail = body.error.message;
    } catch { /* keep statusText */ }
    throw new Error(`gSheets: ${detail}`);
  }
  const json = await res.json();
  return parseSheet(json);
}

/**
 * Turn the Sheets API payload into row objects keyed by lowercased
 * header. Header row is the first non-empty `values` row; later rows
 * with missing trailing cells are tolerated (Sheets returns short
 * arrays when trailing cells are blank).
 */
function parseSheet(json) {
  const values = json?.values;
  if (!Array.isArray(values) || values.length < 1) return [];
  const headers = values[0].map((h) => String(h ?? '').trim().toLowerCase());
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const cells = values[i] ?? [];
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      if (!headers[j]) continue;        // skip unnamed columns
      row[headers[j]] = cells[j] ?? '';
    }
    rows.push(row);
  }
  return rows;
}

// ── render ───────────────────────────────────────────────────────────

function renderRows(opts, rows) {
  const transformed = opts.transformRow
    ? rows.map((row, i, all) => opts.transformRow(row, i, all))
    : rows;

  if (!transformed.length) {
    if (opts.emptyTemplate) {
      opts.target.replaceChildren(opts.emptyTemplate.content.cloneNode(true));
    } else {
      opts.target.replaceChildren();
    }
    return;
  }

  const frag = document.createDocumentFragment();
  for (const row of transformed) {
    frag.appendChild(renderTemplate(opts.template, row));
  }
  opts.target.replaceChildren(frag);
}

function renderTemplate(template, row) {
  const fragment = template.content.cloneNode(true);
  for (const node of fragment.querySelectorAll('[data-column-name]')) {
    bindColumn(node, row);
  }
  return fragment;
}

/**
 * Bind one [data-column-name] node to its row value.
 *
 * Rules — kept intentionally identical to @copperdesign/gcal's slot
 * binding so a developer who knows one library knows the other:
 *
 *   data-column-name="titel"                → textContent (escaped)
 *   data-column-name="inhalt"  data-html    → innerHTML (trusted)
 *   data-column-name="link"    data-attr="href"  → element.setAttribute('href', value)
 *   data-column-name="…"       data-remove-empty → removed when empty
 *                                                  (default: add `hidden`)
 */
function bindColumn(node, row) {
  // Case-insensitive header match: the original Weebly plugin lowercased
  // header names. We do the same on parse, so template authors can write
  // `data-column-name="Titel"` or `="titel"` interchangeably.
  const key = node.dataset.columnName.trim().toLowerCase();
  const value = row[key];
  const empty = value === undefined || value === null || value === '';

  if (empty) {
    if ('removeEmpty' in node.dataset) node.remove();
    else node.hidden = true;
    return;
  }

  // A node that previously rendered empty (and got `hidden`) needs to
  // become visible again on a re-render with data. Templates can also
  // ship `hidden` on attr-bound nodes so unbound markup doesn't flash.
  node.hidden = false;

  const attr = node.dataset.attr;
  if (attr) {
    node.setAttribute(attr, String(value));
    return;
  }

  if ('html' in node.dataset) {
    // Trusted HTML — opt-in per slot. Cells you control (your own sheet)
    // are typically safe; cells anyone with edit access can change are
    // not. There's no global toggle on purpose.
    node.innerHTML = String(value);
  } else {
    node.textContent = String(value);
  }
}

// ── state templates ──────────────────────────────────────────────────

function showLoading(opts) {
  if (opts.loadingTemplate) {
    opts.target.replaceChildren(opts.loadingTemplate.content.cloneNode(true));
  } else if (opts.spinner) {
    opts.target.innerHTML = opts.spinner;
  }
}

function renderError(opts, err) {
  const message = err.message ?? String(err);
  if (opts.errorTemplate) {
    // Error template can pull the message via data-column-name="message".
    // We render through the same binding path so escaping is consistent
    // with row rendering — no innerHTML unless the template opts in.
    opts.target.replaceChildren(renderTemplate(opts.errorTemplate, { message }));
  } else {
    const fallback = document.createElement('div');
    fallback.className = 'gsheets-error';
    fallback.textContent = message;
    opts.target.replaceChildren(fallback);
  }
}

// ── consent CTA ──────────────────────────────────────────────────────

function renderConsentCTA(target, template, onOptIn) {
  const fragment = template.content.cloneNode(true);
  // Trigger conventionally is [data-gsheets-optin], with a <button>
  // fallback for one-button CTAs.
  const trigger = fragment.querySelector('[data-gsheets-optin]')
              ?? fragment.querySelector('button');
  if (!trigger) {
    throw new Error('gSheets: consent CTA template must contain a <button> or [data-gsheets-optin] element');
  }
  const handler = async (ev) => {
    ev.preventDefault();
    await onOptIn();
  };
  trigger.addEventListener('click', handler);
  target.replaceChildren(fragment);
  return () => trigger.removeEventListener('click', handler);
}

// ── helpers ──────────────────────────────────────────────────────────

function resolveTarget(input) {
  if (!input) return null;
  if (input instanceof Element) return input;
  if (typeof input === 'string') {
    const el = document.querySelector(input);
    if (!el) throw new Error(`gSheets: no target found for selector ${input}`);
    return el;
  }
  throw new TypeError('gSheets: target must be an Element or selector string');
}

function resolveTemplate(input) {
  if (!input) return null;
  if (input instanceof HTMLTemplateElement) return input;
  if (typeof input !== 'string') {
    throw new TypeError(`gSheets: template must be a <template> element, selector, or HTML string (got ${typeof input})`);
  }
  if (input.startsWith('#') || input.startsWith('.')) {
    const found = document.querySelector(input);
    if (!found) throw new Error(`gSheets: no template found for selector ${input}`);
    if (!(found instanceof HTMLTemplateElement)) {
      throw new Error(`gSheets: ${input} is not a <template> element`);
    }
    return found;
  }
  // Inline HTML string. Wrap in a <template> so the parser handles it.
  const wrapper = document.createElement('template');
  wrapper.innerHTML = input.trim();
  if (wrapper.content.children.length === 1 && wrapper.content.firstElementChild instanceof HTMLTemplateElement) {
    return wrapper.content.firstElementChild;
  }
  return wrapper;
}
