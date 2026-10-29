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

### ld-architecture-value.html
The architectural-value story as four benefit scenes. One delivery diagram
(LaunchDarkly -> [NETWORK NAME] with CDN + streaming lanes -> your cloud with
server SDKs, client devices, optional Relay Proxy) re-lit by four tabs:
Fast start (~25 ms), Fast changes (<200 ms, 138-byte delta), Failover built in
(0 errors), Private by design (0 rules). Big-number readout flips per scene.

## Implementation notes

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
- All figures (~25 ms, <200 ms, 138 bytes, 90%+, outage-test counts) come
  from internal Seven Claims / FDv2 testing and must be cleared before
  external publish. The reversal-speed figure is inferred, not measured —
  see the architecture page draft doc for the full clearance list.
- Region names are intentionally generic (Region 1 / Region 2).
- The resilience page also claims the CDN has 100+ points of presence, and
  that it keeps serving the last state it received with both regions down.
  Both need clearing before external publish.
