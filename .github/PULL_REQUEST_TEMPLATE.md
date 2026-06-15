<!--
Thanks for the PR. A few prompts to make review faster — delete anything
that doesn't apply.
-->

## What

<!-- One or two sentences. What this PR changes. -->

## Why

<!-- The motivating problem. A real sheet that broke, a Sheets API
     quirk you hit, a header-row edge case the README missed, a consent
     flow that didn't compose with your stack. Skip the WHAT (the diff
     shows it); the WHY is what I'm reading for. -->

## How tested

<!-- Which browser(s) + OS you exercised it in. A short screen
     recording for anything visible (rendered rows, CTA flow, error
     template) saves a lot of back-and-forth. -->

- [ ] `example.html` opens against a real public sheet and renders rows
- [ ] If the change touches the network or consent path: confirmed the
      loading → rendered and consent-gated → opt-in → rendered flows
- [ ] Spot-checked in at least one non-Chromium browser (Safari or Firefox)
- [ ] If `AbortController` / `teardown()` code touched: confirmed
      `teardown()` actually stops re-renders and aborts in-flight fetches

## Notes for reviewer

<!-- Anything subtle: a heuristic you chose between, a Sheets API quirk
     you worked around, a follow-up you considered but punted. Optional. -->
