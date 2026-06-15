---
name: Bug report
about: Something broke or behaved unexpectedly
title: ''
labels: bug
assignees: ''
---

## What happened

<!-- One paragraph. What you set up, what you saw, what you expected. -->

## Repro

<!-- A minimal HTML page that reproduces it. A Gist or CodePen link is
     fine. The smaller the repro, the faster the fix. A minimal public
     sheet showing the data shape (one or two rows) helps too. -->

```html
<div class="articles"></div>

<template id="article">
  <article>
    <h3 data-column-name="titel"></h3>
    <p  data-column-name="inhalt"></p>
  </article>
</template>

<script type="module">
  import gSheets from '@copperdesign/gsheets';

  gSheets({
    target:   '.articles',
    template: '#article',
    sheetId:  '...',
    apiKey:   '...',
  });
</script>
```

<!-- If the bug is about header matching, short rows, or empty cells, a
     screenshot of the sheet's first few rows (headers + one or two data
     rows) is usually enough. Redact anything personal. -->

## Environment

- Package version (from `package.json` or `npm ls @copperdesign/gsheets`):
- Browser + version:
- OS (+ mobile/desktop):
- Sheet shape (rough row count, any merged cells / blank columns):

## Screen recording (optional)

<!-- For anything visual — rendered rows, consent CTA flow, error
     template — a short clip is worth a thousand words. -->
