# LaunchDarkly architecture page — interactive concepts

Two self-contained HTML interactives built as draft concepts for the new
launchdarkly.com architecture page (Architecture as a Weapon / Architecture v2).
Each file is a single standalone page: no build step, no external JS, only
Google Fonts loaded over the network. Open in a browser or drop behind any
static server.

## Files

### ld-resilience-marketecture.html
The resilience story as a clickable failure ladder. Layered marketecture —
SDK + code defaults, local cache, Relay Proxy, the LaunchDarkly CDN
(polling), and LaunchDarkly itself (Region 1 primary with AZ chips, and
Region 2 warm failover; streaming runs inside the regions). Streaming lines
run from the regions straight to your apps, past the CDN. — with a
"break the next thing" stepper that walks seven states: healthy, AZ down,
Region 1 down, both regions down (streaming goes with them; the CDN keeps
serving), CDN down, Relay Proxy down, cold restart with nothing reachable. The app-status pill stays "online" through every step.
Every layer also has its own on/off switch: each availability zone, both
regions, CDN polling, the browser cache, the Relay Proxy,
and the backend and on-device caches. A mobile-client row below the
backend connects straight to LaunchDarkly, with values saved on the
device that survive restarts. A laptop beside it runs the browser SDK with a
browser cache; its streaming and polling lines run straight behind the phone, drawn
as an SVG overlay that redraws on resize.

A second tab, "Starts fast", steps through a server-side SDK starting up: it
boots on code defaults, fetches complete flag state from the nearest CDN edge,
opens a stream that says which version it already has, catches up (usually
just the changes since), and then receives each new change live. A cold/warm
switch on the local cache shows the warm start: the SDK evaluates from the
state saved on the last run until the CDN payload refreshes it. The Relay Proxy is left out of this view. Link to it directly
with `#startup`.

Two billing tabs follow, written for SEs and customers rather than developers.
Each has a live meter, plus a "Questions we hear most" list
built from the top Gong, Zendesk and Slack questions in Enterpret.

- "Client-side billing" (`#client-mau`) uses the same switch pattern on one
  example audience (10,000 signed-in web users): mobile app, device ID as the
  key, multi-contexts, anonymous visitors, sign-ups, bots and test browsers,
  a proposed bot filter (not a shipped feature; it drops 90% of bot keys), and
  a second project.
  Counts are editable in the row titles; each row draws a figure per context
  key, outlined when the key already counted elsewhere, and its bar shows its
  share of the month's MAU. "Watch a month" shows unique keys arriving early
  and leveling off while visits keep climbing.
- "Server-side billing" (`#service-connections`) is a set of independent
  switches on one example service (four servers, streaming, production):
  streaming vs. polling, Kubernetes (3 pods inside each server), worker processes (4 per
  instance, forked from one SDK, so each instance still counts once), autoscaling (10 extra for 3 days), daily scaling (10 extra, 8am to 8pm), staging and dev, Relay Proxy,
  PHP (rewrites the checkout service in PHP, which polls on every request) and a Lambda function. The meter and each row
  recompute from the switches; the narration explains the last one flipped.
  The server count, both scaling counts, PHP request volume and Lambda's
  millions of invocations are editable. PHP defaults to 1 M, with requests / K /
  M / B display units that preserve the underlying count. The original
  latest-action summary remains, with a compact Before SC / After SC line.
  Optional setup info cards describe currently enabled options once each.
  Disabling an option removes its card. Cards have no action history or repeated
  SC values. Undo/Redo restores the setup and latest summary; numeric keystrokes
  are grouped as one edit. New edits clear Redo. History lasts for the page
  session, while the setup persists across reloads.
  The infrastructure box draws each server or pod with a dot per SDK, and
  folds away use cases that are off; staging and dev always sit last, under a
  "Staging and dev" divider. With the Relay Proxy on, a link runs to every box; staging and dev each
  get their own Relay Proxy, and LaunchDarkly links to each proxy.
  The "Watch a month" button plays the current setup day by day (18 seconds)
  while a bar under the count fills to the month's total, then becomes
  "Reset", which restores the month's totals.
  Current / Proposed ASI changes the single meter without changing the setup.
  This is a simplified teaching example, not an exhaustive scenario-matrix
  comparison. Current polling contributes zero billed SCs; its 30-second-per-poll
  calculation is described only where relevant to the PHP example or presenter
  notes. Proposed ASI illustrates the goal of
  interval-independent active time for identifiable, always-on SDKs; it is not
  a reproduction of sampling or boundary effects. PHP retains 30 seconds per
  poll provisionally in the proposed view, pending a replacement calculation.
  Workers explicitly assume a shared SDK instance ID. Lifecycle details and
  calculation limitations are in collapsed Notes for presenters, with one
  sentence per line and paragraph spacing preserved. Model selection is a small
  heading and buttons above a divider, without a background card or redundant
  model-status comment.
  Relay is absent when off and appears in place when enabled. Usage bars use
  the original compact row layout. All server-side examples normalize to 730 hours
  (43,800 minutes), including autoscaling, PHP and Lambda.

Billing views are internal teaching examples, not bill estimates. Proposed ASI
is not approved. The public docs' 732-polls-per-SC statement does not describe
the current polling calculation or billed quantity and needs a separate docs
correction. Re-check calculation assumptions before external use.

Run the dependency-free calculation and history checks with
`node --test tests/billing-model.test.cjs`. Open the HTML in a browser to check
editing, model selection, mixed PHP/streaming environments, Relay layout and
Undo/Redo.

### ld-architecture-value.html
The architectural-value story as four benefit scenes. One delivery diagram
(LaunchDarkly -> [NETWORK NAME] with CDN + streaming lanes -> your cloud with
server SDKs, client devices, optional Relay Proxy) re-lit by four tabs:
Fast start (~25ms), Fast changes (<200ms, 138-byte delta), Failover built in
(0 errors), Private by design (0 rules). Big-number readout flips per scene.

## Implementation notes

- The page remembers your last tab and each tab's choices (switches, steps,
  numbers) in localStorage under `ld-arch:*`. A link with a tab hash still
  opens that tab. Each tab's Reset puts its own choices back.
- LaunchDarkly brand system: Sora (display), Inter (body), JetBrains Mono
  (readouts); LD Blue #405BFF, Lime #DDFF46, ink/Gray 01 surfaces.
- Light and dark theme via CSS custom properties on :root, following
  prefers-color-scheme; a data-theme="light|dark" attribute on <html>
  forces either.
- prefers-reduced-motion disables stream animation and transitions.
- Vanilla JS only; state machines live at the bottom of each file in the
  scenes/steps arrays — copy edits happen there and in the markup, nothing
  is generated.
- Responsive: zones stack and pipes rotate vertical below ~1280px on the
  resilience page and ~900px on the value page.

## Status / before production use

- Draft concepts, not production pages. "[NETWORK NAME]" is a deliberate
  placeholder until the network naming DACI closes.
- All figures (~25ms, <200ms, 138 bytes, 90%+, outage-test counts) come
  from internal Seven Claims / FDv2 testing and must be cleared before
  external publish. The reversal-speed figure is inferred, not measured —
  see the architecture page draft doc for the full clearance list.
- Region names are intentionally generic (Region 1 / Region 2).
- The resilience page also claims the CDN has 100+ points of presence, and
  that it keeps serving the last state it received with both regions down.
  Both need clearing before external publish.
