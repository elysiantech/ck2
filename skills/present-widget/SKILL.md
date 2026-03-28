---
name: present-widget
description: >
  Rendering spec for inline HTML widgets in the Fexel agent chat interface.
  Load this skill whenever you need to generate a ```widget block. It contains
  the full CSS component library, JavaScript patterns, bridge rules, and code
  skeletons for all widget types. Do not reproduce CSS or JS patterns from
  memory — use this spec.
---

# present-widget — Rendering Specification

This skill defines how to render interactive widgets in the Fexel chat interface.
Widgets are self-contained HTML fragments injected into a sandboxed iframe via
`srcdoc`. The host shell provides the environment. You provide everything visible.

---

## What the host provides (do not redefine these)

- `sendPrompt(text)` — global function, sends a message to chat as if the user typed it
- `#root` div — your markup is injected here
- CSS variables forwarded from the host page (see variable list below)
- Chart.js 4.4 available as global `Chart`
- React 18 available as globals `React` and `ReactDOM`
- Auto-resize via ResizeObserver
- postMessage bridge for actions

Do not include `<!DOCTYPE>`, `<html>`, `<head>`, `<body>`, or library script tags.
Do not redefine `sendPrompt`.

---

## Output format

Always output widgets inside a fenced code block:

```widget
<style>
  /* styles */
</style>

<div class="widget">
  <!-- markup -->
</div>

<script>
  // logic
</script>
```

The host parser extracts `<style>`, `<script>`, and markup separately and injects
each into the correct location. Never put HTML or CSS inside a `<script>` tag.
Keep them cleanly separated.

---

## CSS variable reference

These variables are live in the iframe. Use them for all colors, fonts, and radii.
Never hardcode colors — they break in dark mode.

```
--font-sans                       body font
--font-mono                       code font
--color-text-primary              main text
--color-text-secondary            muted / label text
--color-text-tertiary             hint text
--color-background-primary        white / near-black
--color-background-secondary      surface / card background
--color-background-tertiary       page background
--color-border-primary            strong border
--color-border-secondary          default border
--color-border-tertiary           subtle border
--border-radius-md                8px
--border-radius-lg                12px
--border-radius-xl                16px
```

Hardcode only these four semantic accent values:
```
#1D9E75   teal  — positive callout border, success
#BA7517   amber — warning callout border
#E24B4A   red   — danger / alert
#378ADD   blue  — informational
```

---

## Standard CSS component library

Include this block in every widget `<style>` tag. Extend as needed, do not replace.

```css
.widget { font-family: var(--font-sans); background: var(--color-background-secondary); border: 0.5px solid var(--color-border-tertiary); border-radius: var(--border-radius-lg); padding: 20px; }
.widget-title { font-size: 14px; font-weight: 500; color: var(--color-text-primary); margin-bottom: 4px; }
.widget-sub { font-size: 12px; color: var(--color-text-secondary); margin-bottom: 16px; line-height: 1.5; }
.section-label { font-size: 11px; font-weight: 500; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
.divider { border: none; border-top: 0.5px solid var(--color-border-tertiary); margin: 16px 0; }

.metric { background: var(--color-background-primary); border-radius: var(--border-radius-md); padding: 11px 12px; }
.metric-label { font-size: 11px; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 4px; }
.metric-value { font-size: 18px; font-weight: 500; color: var(--color-text-primary); }
.metric-detail { font-size: 11px; color: var(--color-text-secondary); margin-top: 2px; }
.metric-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; }
.metric-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
.metric-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }

.slider-section { margin-bottom: 16px; }
.slider-section-title { font-size: 12px; font-weight: 500; color: var(--color-text-primary); margin-bottom: 10px; padding-bottom: 6px; border-bottom: 0.5px solid var(--color-border-tertiary); }
.slider-row { display: grid; grid-template-columns: 140px 1fr 48px; align-items: center; gap: 8px; margin-bottom: 10px; }
.slider-label { font-size: 12px; color: var(--color-text-secondary); }
.slider-value { font-size: 12px; font-weight: 500; color: var(--color-text-primary); text-align: right; }

.callout { border-left: 2px solid #1D9E75; padding: 10px 14px; background: var(--color-background-secondary); border-radius: 0 var(--border-radius-md) var(--border-radius-md) 0; font-size: 13px; color: var(--color-text-secondary); line-height: 1.6; margin-bottom: 16px; }
.callout strong { color: var(--color-text-primary); font-weight: 500; }
.callout.warn { border-left-color: #BA7517; }
.callout.danger { border-left-color: #E24B4A; }
.callout.info { border-left-color: #378ADD; }

.phase-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
.phase-card { border: 0.5px solid var(--color-border-tertiary); border-radius: var(--border-radius-md); padding: 12px 14px; }
.phase-title { font-size: 12px; font-weight: 500; color: var(--color-text-primary); margin-bottom: 6px; }
.phase-body { font-size: 12px; color: var(--color-text-secondary); line-height: 1.5; }

.tag { display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 20px; margin-bottom: 6px; }
.tag-green { background: #E1F5EE; color: #0F6E56; }
.tag-amber { background: #FAEEDA; color: #854F0B; }
.tag-blue { background: #E6F1FB; color: #0C447C; }
.tag-red { background: #FCEBEB; color: #A32D2D; }

.timeline-bar { display: flex; width: 100%; height: 48px; border-radius: 6px; overflow: hidden; margin-bottom: 8px; }
.timeline-seg { display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 500; white-space: nowrap; overflow: hidden; transition: width 0.12s ease; }
.legend { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
.legend-item { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--color-text-secondary); }
.swatch { width: 9px; height: 9px; border-radius: 2px; flex-shrink: 0; }
.swatch-diamond { width: 8px; height: 8px; border-radius: 1px; transform: rotate(45deg); flex-shrink: 0; }

.cta { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
.btn { font-family: var(--font-sans); font-size: 13px; padding: 8px 16px; border-radius: var(--border-radius-md); border: 0.5px solid var(--color-border-secondary); background: transparent; color: var(--color-text-primary); cursor: pointer; }
.btn:hover { background: var(--color-background-secondary); }
.btn.primary { background: var(--color-text-primary); color: var(--color-background-primary); border-color: transparent; }
.btn.primary:hover { opacity: 0.85; }

.warn-text { color: #BA7517; }
.total-row { display: flex; justify-content: space-between; font-size: 12px; color: var(--color-text-secondary); margin-bottom: 4px; }
.assumptions { font-size: 11px; color: var(--color-text-tertiary); margin-top: 12px; line-height: 1.5; }
```

---

## JavaScript rules

**Always wrap all logic in an IIFE:**
```javascript
(function() {
  // all your code here
})();
```

**Never use inline onclick attributes.** Always use addEventListener:
```javascript
// WRONG
<button onclick="doThing()">Click</button>

// CORRECT
document.getElementById('my-btn').addEventListener('click', function() {
  doThing();
});
```

**Slider wiring pattern** — use this exact pattern for every slider widget:
```javascript
(function() {
  // 1. Get references
  var sliderEl = document.getElementById('sl-labor');
  var valueEl  = document.getElementById('val-labor');

  // 2. Format helpers
  function fmt(n) { return '$' + Math.round(n).toLocaleString(); }
  function fmtYrs(y) {
    if (!isFinite(y) || y <= 0) return '< 1 mo';
    if (y < 1) return (y * 12).toFixed(1) + ' mo';
    return y.toFixed(1) + ' yrs';
  }

  // 3. update() recalculates and re-renders everything
  function update() {
    var val = +sliderEl.value;
    valueEl.textContent = fmt(val);
    // ... recalculate metrics, update callout, update CTAs
  }

  // 4. Wire listeners
  sliderEl.addEventListener('input', update);

  // 5. Call update() on load to set initial state
  update();
})();
```

**CTA serialization pattern** — bake current state into every sendPrompt call:
```javascript
document.getElementById('btn-refine').addEventListener('click', function() {
  var wage = +document.getElementById('sl-labor').value;
  var inv  = +document.getElementById('sl-cost').value;
  sendPrompt(
    'My current numbers: labor $' + wage + '/hr, ' +
    'system cost $' + inv.toLocaleString() + '. ' +
    'What should I pressure-test?'
  );
});
```

**No localStorage, no position: fixed, no external fetches.**

---

## postMessage bridge

### sendPrompt — continues the conversation
```javascript
sendPrompt('text that goes into chat as if user typed it');
```
Use for: CTA buttons that should trigger an agent response.

### Action bridge — direct parent actions (no agent round-trip)
```javascript
window.parent.postMessage({ type: 'action', name: 'print' }, '*');
window.parent.postMessage({ type: 'action', name: 'openDocument', args: { id: 'doc-id' } }, '*');
window.parent.postMessage({ type: 'action', name: 'downloadPDF', args: { id: 'doc-id' } }, '*');
```

Available actions:
- `print` — triggers browser print dialog (Save as PDF)
- `openDocument` — opens document preview, requires `args: { id }`
- `downloadPDF` — triggers download, requires `args: { id }`

Use sendPrompt when the action needs an agent response.
Use the action bridge when it does not — download, print, preview.

**CRITICAL: The second argument to postMessage must always be `'*'` — never an empty string `''`, never a specific origin.**

---

## Freeform composition

The pattern catalog below covers common scenarios. When no named pattern fits —
or when the agent needs to combine elements from multiple patterns, or
build something entirely novel — compose directly from the component
library primitives.

**What you have to work with:**

Layout containers: `.widget` (card wrapper), `.divider` (horizontal rule),
`.section-label` (uppercase category header)

Data display: `.metric` + `.metric-label` + `.metric-value` + `.metric-detail`,
`.metric-grid-2` / `.metric-grid-3` / `.metric-grid-4`

Narrative: `.callout` (with `.warn`, `.danger`, `.info` variants),
`.assumptions` (fine print)

Tags: `.tag` + `.tag-green` / `.tag-amber` / `.tag-blue` / `.tag-red`

Timeline: `.timeline-bar` + `.timeline-seg`, `.legend` + `.legend-item` + `.swatch`

Cards: `.phase-grid` + `.phase-card` + `.phase-title` + `.phase-body`

Actions: `.cta` + `.btn` + `.btn.primary`

Inputs: `.slider-row` + `.slider-label` + `.slider-value`

Document: `.doc-card` + `.doc-icon` + `.doc-title` + `.doc-meta` + `.doc-btn`

**Rules for freeform widgets:**

1. Use CSS variables for all colors — never hardcode except the four semantic accents
2. Wrap all JS in an IIFE, use addEventListener, never inline onclick
3. Stick to the type scale: 18px metric values, 14px titles, 13px body, 12px labels/sliders, 11px metadata/tags
4. Use the standard `.widget` wrapper for any widget that should feel like a card
5. Omit the `.widget` wrapper only for input widgets (single select, multi select, priority, stepper) which render borderless
6. Every CTA must serialize current state into sendPrompt — no generic prompts
7. Round all displayed numbers

**What freeform means and what it doesn't:**

Freeform means you can combine a metric grid with a custom SVG chart, or
build a comparison table with inline sparklines, or create a checklist with
toggle states, or lay out a multi-column dashboard from metric cards and
callouts — whatever the conversation needs.

Freeform does NOT mean:
- Inventing new CSS that conflicts with the component library
- Using external fonts, gradients, shadows, or decorative effects
- Hardcoding colors (except the four accents)
- Skipping the IIFE or using inline event handlers
- Building widgets that require external fetches or localStorage

---

## Pattern catalog

Patterns are rendering skeletons. Each defines HTML structure, CSS classes, JS wiring,
and clearly marked **injection points** where the calling agent populates data.
Patterns contain no business logic, no "when to use" rules, and no domain-specific defaults.

The calling agent (fexel-advisor, seller-reference, post-call, etc.) decides *which*
pattern to use, *when* to use it, and *what data* to inject.

---

### Pattern A — Slider explorer

Interactive widget with sliders and live-updating metrics. Used for any
scenario where the user adjusts assumptions and sees results change.

**Injection points:**
- Slider definitions (label, id, min, max, step, default value, format function)
- Metric card definitions (label, id, compute function)
- Verdict logic (callout text and class based on computed values)
- CTA buttons (label, sendPrompt string with serialized state)

```widget
<style>
  .widget { font-family: var(--font-sans); background: var(--color-background-secondary); border: 0.5px solid var(--color-border-tertiary); border-radius: var(--border-radius-lg); padding: 20px; }
  .widget-title { font-size: 14px; font-weight: 500; color: var(--color-text-primary); margin-bottom: 4px; }
  .widget-sub { font-size: 12px; color: var(--color-text-secondary); margin-bottom: 16px; line-height: 1.5; }
  .slider-row { display: grid; grid-template-columns: 140px 1fr 48px; align-items: center; gap: 8px; margin-bottom: 10px; }
  .slider-label { font-size: 12px; color: var(--color-text-secondary); }
  .slider-value { font-size: 12px; font-weight: 500; color: var(--color-text-primary); text-align: right; }
  .metric { background: var(--color-background-primary); border-radius: var(--border-radius-md); padding: 11px 12px; }
  .metric-label { font-size: 11px; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 4px; }
  .metric-value { font-size: 18px; font-weight: 500; color: var(--color-text-primary); }
  .metric-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; }
  .callout { border-left: 2px solid #1D9E75; padding: 10px 14px; background: var(--color-background-secondary); border-radius: 0 var(--border-radius-md) var(--border-radius-md) 0; font-size: 13px; color: var(--color-text-secondary); line-height: 1.6; margin-bottom: 16px; }
  .callout strong { color: var(--color-text-primary); font-weight: 500; }
  .callout.warn { border-left-color: #BA7517; }
  .cta { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
  .btn { font-family: var(--font-sans); font-size: 13px; padding: 8px 16px; border-radius: var(--border-radius-md); border: 0.5px solid var(--color-border-secondary); background: transparent; color: var(--color-text-primary); cursor: pointer; }
  .btn.primary { background: var(--color-text-primary); color: var(--color-background-primary); border-color: transparent; }
</style>

<div class="widget">
  <div class="widget-title"><!-- INJECT: title --></div>
  <div class="widget-sub"><!-- INJECT: subtitle --></div>

  <!-- INJECT: slider rows — one .slider-row per adjustable assumption -->
  <div class="slider-row">
    <div class="slider-label"><!-- INJECT: label --></div>
    <input type="range" id="sl-example" min="0" max="100" step="1" value="50">
    <div class="slider-value" id="val-example">50</div>
  </div>

  <!-- INJECT: metric grid — .metric-grid-2 or .metric-grid-3 -->
  <div class="metric-grid-2">
    <div class="metric"><div class="metric-label"><!-- INJECT --></div><div class="metric-value" id="m-a">—</div></div>
    <div class="metric"><div class="metric-label"><!-- INJECT --></div><div class="metric-value" id="m-b">—</div></div>
  </div>

  <div class="callout" id="verdict"><!-- INJECT: verdict logic sets innerHTML --></div>

  <div class="cta">
    <button class="btn primary" id="btn-primary"><!-- INJECT: label --> ↗</button>
    <button class="btn" id="btn-secondary"><!-- INJECT: label --> ↗</button>
  </div>
</div>

<script>
(function() {
  var sl = document.getElementById('sl-example');
  var valEl = document.getElementById('val-example');

  function fmt(n) { return '$' + Math.round(n).toLocaleString(); }
  function fmtYrs(y) {
    if (!isFinite(y) || y <= 0) return '—';
    if (y < 1) return (y * 12).toFixed(1) + ' mo';
    return y.toFixed(1) + ' yrs';
  }

  function update() {
    var val = +sl.value;
    valEl.textContent = val;
    // INJECT: compute metrics, update metric elements, update verdict
  }

  sl.addEventListener('input', update);

  document.getElementById('btn-primary').addEventListener('click', function() {
    // INJECT: sendPrompt with serialized current state
    sendPrompt('Current value: ' + sl.value);
  });

  update();
})();
</script>
```

---

### Pattern B — Timeline bar

Horizontal segmented bar showing how time is allocated. Supports side-by-side
comparison (old vs. new) with a legend.

**Injection points:**
- Segment definitions (id, label, color, initial width %)
- Legend items (color, label)
- Section labels (e.g. "old way" / "new way" — text only, no semantic meaning)
- Colors are injected per-segment, not hardcoded by convention in this pattern

```widget
<style>
  .widget { font-family: var(--font-sans); background: var(--color-background-secondary); border: 0.5px solid var(--color-border-tertiary); border-radius: var(--border-radius-lg); padding: 20px; }
  .widget-title { font-size: 14px; font-weight: 500; color: var(--color-text-primary); margin-bottom: 4px; }
  .widget-sub { font-size: 12px; color: var(--color-text-secondary); margin-bottom: 16px; line-height: 1.5; }
  .section-label { font-size: 11px; font-weight: 500; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
  .timeline-bar { display: flex; width: 100%; height: 48px; border-radius: 6px; overflow: hidden; margin-bottom: 8px; }
  .timeline-seg { display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 500; white-space: nowrap; overflow: hidden; transition: width 0.12s ease; }
  .legend { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
  .legend-item { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--color-text-secondary); }
  .swatch { width: 9px; height: 9px; border-radius: 2px; flex-shrink: 0; }
  .callout { border-left: 2px solid #1D9E75; padding: 10px 14px; background: var(--color-background-secondary); border-radius: 0 var(--border-radius-md) var(--border-radius-md) 0; font-size: 13px; color: var(--color-text-secondary); line-height: 1.6; margin-bottom: 16px; }
  .callout strong { color: var(--color-text-primary); font-weight: 500; }
  .cta { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
  .btn { font-family: var(--font-sans); font-size: 13px; padding: 8px 16px; border-radius: var(--border-radius-md); border: 0.5px solid var(--color-border-secondary); background: transparent; color: var(--color-text-primary); cursor: pointer; }
  .btn.primary { background: var(--color-text-primary); color: var(--color-background-primary); border-color: transparent; }
</style>

<div class="widget">
  <div class="widget-title"><!-- INJECT: title --></div>
  <div class="widget-sub"><!-- INJECT: subtitle --></div>

  <!-- INJECT: section label -->
  <div class="section-label"><!-- INJECT: e.g. "current shift" --></div>
  <div class="timeline-bar">
    <!-- INJECT: one .timeline-seg per segment with style="background:COLOR;color:TEXT_COLOR;width:WIDTH%" -->
  </div>

  <div class="section-label"><!-- INJECT: e.g. "with automation" --></div>
  <div class="timeline-bar">
    <!-- INJECT: segments for comparison bar -->
  </div>

  <div class="legend">
    <!-- INJECT: one .legend-item per category -->
  </div>

  <div class="callout"><!-- INJECT: interpretation --></div>

  <div class="cta">
    <button class="btn primary" id="btn-primary"><!-- INJECT --> ↗</button>
  </div>
</div>

<script>
(function() {
  // INJECT: CTA wiring with sendPrompt
  document.getElementById('btn-primary').addEventListener('click', function() {
    sendPrompt('<!-- INJECT: prompt with context -->');
  });
})();
</script>
```

---

### Pattern C — Value waterfall

Horizontal waterfall in plain HTML/CSS — no Chart.js. Each row is a labeled bar
showing a positive or negative value driver. Ends with a summary metric row.

**Injection points:**
- Bar definitions array: `{ label, value, maxVal, color, textColor }`
- Metric row items (label, computed value)
- Verdict callout (text, class)
- CTA buttons

Bar widths are computed as percentage of the largest absolute value.

```widget
<style>
  .widget { font-family: var(--font-sans); background: var(--color-background-secondary); border: 0.5px solid var(--color-border-tertiary); border-radius: var(--border-radius-lg); padding: 20px; }
  .widget-title { font-size: 14px; font-weight: 500; color: var(--color-text-primary); margin-bottom: 4px; }
  .widget-sub { font-size: 12px; color: var(--color-text-secondary); margin-bottom: 16px; line-height: 1.5; }
  .wf-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .wf-label { width: 140px; font-size: 12px; color: var(--color-text-secondary); text-align: right; flex-shrink: 0; }
  .wf-track { flex: 1; background: var(--color-background-primary); border-radius: 4px; height: 28px; overflow: hidden; }
  .wf-bar { height: 100%; display: flex; align-items: center; padding: 0 8px; border-radius: 4px; transition: width 0.2s ease; }
  .wf-bar-label { font-size: 12px; font-weight: 500; white-space: nowrap; }
  .divider { border: none; border-top: 0.5px solid var(--color-border-tertiary); margin: 16px 0; }
  .metric { background: var(--color-background-primary); border-radius: var(--border-radius-md); padding: 11px 12px; }
  .metric-label { font-size: 11px; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 4px; }
  .metric-value { font-size: 18px; font-weight: 500; color: var(--color-text-primary); }
  .metric-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
  .callout { border-left: 2px solid #1D9E75; padding: 10px 14px; background: var(--color-background-secondary); border-radius: 0 var(--border-radius-md) var(--border-radius-md) 0; font-size: 13px; color: var(--color-text-secondary); line-height: 1.6; margin-bottom: 16px; }
  .callout strong { color: var(--color-text-primary); font-weight: 500; }
  .callout.warn { border-left-color: #BA7517; }
  .cta { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
  .btn { font-family: var(--font-sans); font-size: 13px; padding: 8px 16px; border-radius: var(--border-radius-md); border: 0.5px solid var(--color-border-secondary); background: transparent; color: var(--color-text-primary); cursor: pointer; }
  .btn.primary { background: var(--color-text-primary); color: var(--color-background-primary); border-color: transparent; }
</style>

<div class="widget">
  <div class="widget-title"><!-- INJECT: title --></div>
  <div class="widget-sub"><!-- INJECT: subtitle --></div>

  <div id="wf-bars">
    <!-- JS builds bar rows here -->
  </div>

  <hr class="divider">

  <div class="metric-grid-3">
    <div class="metric"><div class="metric-label"><!-- INJECT --></div><div class="metric-value" id="m-a">—</div></div>
    <div class="metric"><div class="metric-label"><!-- INJECT --></div><div class="metric-value" id="m-b">—</div></div>
    <div class="metric"><div class="metric-label"><!-- INJECT --></div><div class="metric-value" id="m-c">—</div></div>
  </div>

  <div class="callout" id="verdict"><!-- INJECT --></div>

  <div class="cta">
    <button class="btn primary" id="btn-primary"><!-- INJECT --> ↗</button>
    <button class="btn" id="btn-secondary"><!-- INJECT --> ↗</button>
  </div>
</div>

<script>
(function() {
  // INJECT: bars array — each { label, value, color, textColor }
  var bars = [];

  var maxVal = Math.max.apply(null, bars.map(function(b) { return Math.abs(b.value); }));
  var container = document.getElementById('wf-bars');

  bars.forEach(function(b) {
    var pct = (Math.abs(b.value) / maxVal * 100).toFixed(1);
    var row = document.createElement('div');
    row.className = 'wf-row';
    row.innerHTML =
      '<div class="wf-label">' + b.label + '</div>' +
      '<div class="wf-track">' +
        '<div class="wf-bar" style="width:' + pct + '%;background:' + b.color + ';">' +
          '<span class="wf-bar-label" style="color:' + b.textColor + ';">' +
            '$' + Math.round(Math.abs(b.value) / 1000) + 'K' +
          '</span>' +
        '</div>' +
      '</div>';
    container.appendChild(row);
  });

  // INJECT: compute metrics, update verdict
  // INJECT: CTA wiring
})();
</script>
```

---

### Pattern D — Before / after process strip

Vertical side-by-side comparison of process steps. Left column shows current
state, right column shows transformed state. Each step is a dot-rail with
name, description, and optional metadata.

**Injection points:**
- `beforeSteps` array: `{ name, meta, time? }`
- `afterSteps` array: `{ name, meta, tag? }`
- Before/after rail colors (dot and stem)
- Column headers (tag label, title)
- Summary card content (step counts, cycle times, delta line)

```widget
<style>
  .widget { font-family: var(--font-sans); background: var(--color-background-secondary); border: 0.5px solid var(--color-border-tertiary); border-radius: var(--border-radius-lg); padding: 20px; }
  .widget-title { font-size: 14px; font-weight: 500; color: var(--color-text-primary); margin-bottom: 4px; }
  .widget-sub { font-size: 12px; color: var(--color-text-secondary); margin-bottom: 16px; line-height: 1.5; }
  .ba-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .ba-head { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
  .ba-tag { font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 20px; }
  .ba-col-title { font-size: 13px; font-weight: 500; color: var(--color-text-primary); }
  .ba-step { display: flex; gap: 10px; }
  .ba-step:last-child .ba-stem { display: none; }
  .ba-rail { display: flex; flex-direction: column; align-items: center; width: 18px; flex-shrink: 0; }
  .ba-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; margin-top: 5px; }
  .ba-stem { width: 1.5px; flex: 1; min-height: 10px; }
  .ba-body { flex: 1; padding-bottom: 14px; }
  .ba-name { font-size: 12px; font-weight: 500; color: var(--color-text-primary); line-height: 1.3; }
  .ba-meta { font-size: 11px; color: var(--color-text-secondary); margin-top: 2px; line-height: 1.4; }
  .ba-time { font-size: 11px; margin-top: 2px; }
  .ba-badge { display: inline-block; font-size: 10px; font-weight: 500; padding: 2px 7px; border-radius: 10px; margin-top: 3px; }
  .ba-summary { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 16px; padding-top: 14px; border-top: 0.5px solid var(--color-border-tertiary); }
  .ba-sum-card { background: var(--color-background-primary); border-radius: var(--border-radius-md); padding: 11px 14px; }
  .ba-sum-label { font-size: 11px; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 4px; }
  .ba-sum-val { font-size: 18px; font-weight: 500; color: var(--color-text-primary); }
  .ba-sum-detail { font-size: 11px; color: var(--color-text-secondary); margin-top: 2px; }
  .ba-sum-delta { font-size: 11px; font-weight: 500; margin-top: 4px; }
</style>

<div class="widget">
  <div class="widget-title"><!-- INJECT: title --></div>
  <div class="widget-sub"><!-- INJECT: subtitle --></div>
  <div class="ba-cols" id="ba-cols"></div>
  <div class="ba-summary" id="ba-summary"></div>
</div>

<script>
(function() {
  // INJECT: colors
  var BEFORE_DOT  = '#D85A30';
  var BEFORE_STEM = 'rgba(216,90,48,0.18)';
  var AFTER_DOT   = '#1D9E75';
  var AFTER_STEM  = 'rgba(29,158,117,0.18)';
  var BEFORE_TAG_BG   = '#FAECE7';
  var BEFORE_TAG_TEXT  = '#993C1D';
  var AFTER_TAG_BG    = '#E1F5EE';
  var AFTER_TAG_TEXT   = '#0F6E56';
  var BADGE_BG    = '#E1F5EE';
  var BADGE_TEXT  = '#0F6E56';

  // INJECT: step data
  var beforeSteps = [];
  var afterSteps = [];

  function renderCol(steps, dotColor, stemColor, tagBg, tagText, headerLabel, headerTitle) {
    var html = '<div>';
    html += '<div class="ba-head">';
    html += '<span class="ba-tag" style="background:' + tagBg + ';color:' + tagText + '">' + headerLabel + '</span>';
    html += '<span class="ba-col-title">' + headerTitle + '</span>';
    html += '</div>';

    steps.forEach(function(s, i) {
      var isLast = i === steps.length - 1;
      html += '<div class="ba-step">';
      html += '<div class="ba-rail">';
      html += '<div class="ba-dot" style="background:' + dotColor + '"></div>';
      if (!isLast) html += '<div class="ba-stem" style="background:' + stemColor + '"></div>';
      html += '</div>';
      html += '<div class="ba-body">';
      html += '<div class="ba-name">' + s.name + '</div>';
      html += '<div class="ba-meta">' + s.meta + '</div>';
      if (s.time) html += '<div class="ba-time" style="color:' + dotColor + '">' + s.time + ' per cycle</div>';
      if (s.tag)  html += '<span class="ba-badge" style="background:' + BADGE_BG + ';color:' + BADGE_TEXT + '">' + s.tag + '</span>';
      html += '</div></div>';
    });

    html += '</div>';
    return html;
  }

  document.getElementById('ba-cols').innerHTML =
    renderCol(beforeSteps, BEFORE_DOT, BEFORE_STEM, BEFORE_TAG_BG, BEFORE_TAG_TEXT, beforeSteps.length + ' steps', 'Current process') +
    renderCol(afterSteps, AFTER_DOT, AFTER_STEM, AFTER_TAG_BG, AFTER_TAG_TEXT, afterSteps.length + ' steps', 'With automation');

  // INJECT: summary card content
  document.getElementById('ba-summary').innerHTML =
    '<div class="ba-sum-card">' +
      '<div class="ba-sum-label">Current process</div>' +
      '<div class="ba-sum-val">' + beforeSteps.length + ' steps</div>' +
      '<div class="ba-sum-detail"><!-- INJECT: cycle time, operator count --></div>' +
    '</div>' +
    '<div class="ba-sum-card">' +
      '<div class="ba-sum-label">With automation</div>' +
      '<div class="ba-sum-val" style="color:' + AFTER_DOT + '">' + afterSteps.length + ' steps</div>' +
      '<div class="ba-sum-delta" style="color:' + AFTER_DOT + '"><!-- INJECT: delta summary --></div>' +
    '</div>';
})();
</script>
```

---

### Pattern E — Gantt chart

Project timeline with phases, subtasks, and milestones on a week-based grid.
Month labels across the top, task names down the left.

**Injection points:**
- `WEEKS` — total project duration
- `phases` object — `{ phaseKey: '#hexColor' }` mapping
- `tasks` array — `{ name, type: 'phase'|'sub'|'milestone', phase: phaseKey, ws, we? }`
- `months` array — `{ name, sw, ew }` calendar alignment
- `legendItems` array — `[label, phaseKey]` pairs
- Title and subtitle text

```widget
<style>
  .widget { font-family: var(--font-sans); background: var(--color-background-secondary); border: 0.5px solid var(--color-border-tertiary); border-radius: var(--border-radius-lg); padding: 20px; }
  .widget-title { font-size: 14px; font-weight: 500; color: var(--color-text-primary); margin-bottom: 2px; }
  .widget-sub { font-size: 12px; color: var(--color-text-secondary); margin-bottom: 14px; }
  .legend { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 14px; }
  .legend-item { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--color-text-secondary); }
  .swatch { width: 9px; height: 9px; border-radius: 2px; flex-shrink: 0; }
  .swatch-diamond { width: 8px; height: 8px; border-radius: 1px; transform: rotate(45deg); flex-shrink: 0; }
  .gantt-grid { display: grid; grid-template-columns: 180px minmax(0, 1fr); min-width: 620px; }
  .gantt-labels { display: flex; flex-direction: column; }
  .gantt-bars { position: relative; }
  .gantt-lbl-header { height: 26px; display: flex; align-items: flex-end; padding-bottom: 4px; border-bottom: 0.5px solid var(--color-border-tertiary); }
  .gantt-lbl-header span { font-size: 11px; font-weight: 500; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.4px; }
  .gantt-bar-header { display: flex; height: 26px; align-items: flex-end; padding-bottom: 4px; border-bottom: 0.5px solid var(--color-border-tertiary); position: relative; }
  .gantt-mo { position: absolute; font-size: 11px; font-weight: 500; color: var(--color-text-secondary); }
  .gantt-row { height: 36px; display: flex; align-items: center; border-bottom: 0.5px solid var(--color-border-tertiary); }
  .gantt-row:hover { background: var(--color-background-primary); }
  .gantt-task { font-size: 12px; padding-left: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .gantt-task.phase { font-weight: 500; color: var(--color-text-primary); }
  .gantt-task.sub { padding-left: 24px; color: var(--color-text-secondary); }
  .gantt-task.mile { padding-left: 24px; font-style: italic; color: var(--color-text-secondary); font-size: 11px; }
  .gantt-bar-row { height: 36px; position: relative; border-bottom: 0.5px solid var(--color-border-tertiary); }
  .gantt-bar { position: absolute; height: 10px; top: 50%; transform: translateY(-50%); border-radius: 5px; }
  .gantt-bar.phase-bar { height: 5px; border-radius: 3px; opacity: 0.45; }
  .gantt-diamond { position: absolute; top: 50%; transform: translateY(-50%) rotate(45deg); width: 9px; height: 9px; border-radius: 2px; }
  .gantt-gridline { position: absolute; top: 0; bottom: 0; width: 0.5px; background: var(--color-border-tertiary); opacity: 0.4; }
</style>

<div class="widget">
  <div class="widget-title" id="gantt-title"><!-- INJECT: title --></div>
  <div class="widget-sub" id="gantt-sub"><!-- INJECT: subtitle --></div>
  <div class="legend" id="gantt-legend"></div>
  <div style="overflow-x: auto;">
    <div class="gantt-grid" id="gantt"></div>
  </div>
</div>

<script>
(function() {
  // INJECT: total weeks
  var WEEKS = 26;

  // INJECT: phase-to-color mapping
  var phases = {};

  // INJECT: tasks array
  var tasks = [];

  // INJECT: months array
  var months = [];

  // INJECT: legend items
  var legendItems = [];

  function pct(w) { return (w / WEEKS * 100).toFixed(3) + '%'; }

  // Legend
  var leg = document.getElementById('gantt-legend');
  legendItems.forEach(function(pair) {
    var d = document.createElement('div');
    d.className = 'legend-item';
    var isMile = pair[1] === 'mile';
    var sw = isMile
      ? '<div class="swatch-diamond" style="background:' + phases[pair[1]] + '"></div>'
      : '<div class="swatch" style="background:' + phases[pair[1]] + '"></div>';
    d.innerHTML = sw + pair[0];
    leg.appendChild(d);
  });

  // Build gridlines
  var gridHTML = '';
  months.forEach(function(m) {
    if (m.sw > 0) gridHTML += '<div class="gantt-gridline" style="left:' + pct(m.sw) + '"></div>';
  });

  // Month header
  var moHeader = '';
  months.forEach(function(m) {
    var left = (m.sw / WEEKS * 100);
    var width = ((m.ew - m.sw) / WEEKS * 100);
    moHeader += '<div class="gantt-mo" style="left:' + left + '%;width:' + width + '%;text-align:center;">' + m.name + '</div>';
  });

  // Assemble rows
  var labelsHTML = '<div class="gantt-labels"><div class="gantt-lbl-header"><span>Task</span></div>';
  var barsHTML = '<div class="gantt-bars"><div class="gantt-bar-header">' + moHeader + '</div>';

  tasks.forEach(function(t) {
    var cls = t.type === 'phase' ? 'phase' : t.type === 'mile' ? 'mile' : 'sub';
    labelsHTML += '<div class="gantt-row"><div class="gantt-task ' + cls + '">' + t.name + '</div></div>';

    barsHTML += '<div class="gantt-bar-row">' + gridHTML;
    var color = phases[t.phase];

    if (t.type === 'mile') {
      barsHTML += '<div class="gantt-diamond" style="left:' + pct(t.ws) + ';background:' + color + '"></div>';
    } else if (t.type === 'phase') {
      var left = (t.ws / WEEKS * 100);
      var w = ((t.we - t.ws) / WEEKS * 100);
      barsHTML += '<div class="gantt-bar phase-bar" style="left:' + left + '%;width:' + w + '%;background:' + color + '"></div>';
    } else {
      var left = (t.ws / WEEKS * 100);
      var w = ((t.we - t.ws) / WEEKS * 100);
      barsHTML += '<div class="gantt-bar" style="left:' + left + '%;width:' + w + '%;background:' + color + '"></div>';
    }

    barsHTML += '</div>';
  });

  labelsHTML += '</div>';
  barsHTML += '</div>';

  document.getElementById('gantt').innerHTML = labelsHTML + barsHTML;
})();
</script>
```

---

### Pattern F — ROI summary card

Read-only metric cluster with 4 headline numbers, a verdict callout, and
an assumptions line. No interactivity — this is a snapshot, not an explorer.

**Injection points:**
- Four metric cards: `{ label, value, detail, accentColor? }`
- Verdict callout (innerHTML, class)
- Assumptions line text
- Title and subtitle

```widget
<style>
  .widget { font-family: var(--font-sans); background: var(--color-background-secondary); border: 0.5px solid var(--color-border-tertiary); border-radius: var(--border-radius-lg); padding: 20px; }
  .widget-title { font-size: 14px; font-weight: 500; color: var(--color-text-primary); margin-bottom: 4px; }
  .widget-sub { font-size: 12px; color: var(--color-text-secondary); margin-bottom: 16px; line-height: 1.5; }
  .roi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
  .metric { background: var(--color-background-primary); border-radius: var(--border-radius-md); padding: 11px 12px; }
  .metric-label { font-size: 11px; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 4px; }
  .metric-value { font-size: 18px; font-weight: 500; color: var(--color-text-primary); }
  .metric-detail { font-size: 11px; color: var(--color-text-secondary); margin-top: 2px; }
  .callout { border-left: 2px solid #1D9E75; padding: 10px 14px; background: var(--color-background-secondary); border-radius: 0 var(--border-radius-md) var(--border-radius-md) 0; font-size: 13px; color: var(--color-text-secondary); line-height: 1.6; }
  .callout strong { color: var(--color-text-primary); font-weight: 500; }
  .callout.warn { border-left-color: #BA7517; }
  .assumptions { font-size: 11px; color: var(--color-text-tertiary); margin-top: 12px; line-height: 1.5; }
</style>

<div class="widget">
  <div class="widget-title"><!-- INJECT: title --></div>
  <div class="widget-sub"><!-- INJECT: subtitle --></div>

  <div class="roi-grid">
    <!-- INJECT: 4 metric cards -->
    <div class="metric">
      <div class="metric-label"><!-- INJECT --></div>
      <div class="metric-value"><!-- INJECT --></div>
      <div class="metric-detail"><!-- INJECT --></div>
    </div>
    <!-- repeat x3 -->
  </div>

  <div class="callout" id="roi-verdict"><!-- INJECT: verdict --></div>
  <div class="assumptions"><!-- INJECT: assumptions line --></div>
</div>

<script>
(function() {
  // Read-only — no interactivity needed.
  // Agent populates all values at render time.
})();
</script>
```

---

### Pattern G — Staged roadmap

Multi-phase card layout with a horizontal timeline bar. Shows sequenced
investment phases with cost, value, and rationale per phase.

**Injection points:**
- Phase cards array: `{ tag, title, body, investRange, annualValue }`
- Timeline bar segments: `{ label, color, textColor, widthPct }`
- Callout text
- CTA buttons

```widget
<style>
  .widget { font-family: var(--font-sans); background: var(--color-background-secondary); border: 0.5px solid var(--color-border-tertiary); border-radius: var(--border-radius-lg); padding: 20px; }
  .widget-title { font-size: 14px; font-weight: 500; color: var(--color-text-primary); margin-bottom: 4px; }
  .widget-sub { font-size: 12px; color: var(--color-text-secondary); margin-bottom: 16px; line-height: 1.5; }
  .phase-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
  .phase-card { border: 0.5px solid var(--color-border-tertiary); border-radius: var(--border-radius-md); padding: 12px 14px; background: var(--color-background-primary); }
  .phase-tag { display: inline-block; font-size: 10px; font-weight: 500; padding: 2px 8px; border-radius: 10px; margin-bottom: 8px; }
  .phase-title { font-size: 12px; font-weight: 500; color: var(--color-text-primary); margin-bottom: 6px; }
  .phase-body { font-size: 11px; color: var(--color-text-secondary); line-height: 1.5; margin-bottom: 8px; }
  .phase-numbers { font-size: 11px; color: var(--color-text-secondary); }
  .phase-numbers strong { color: var(--color-text-primary); font-weight: 500; }
  .section-label { font-size: 11px; font-weight: 500; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
  .timeline-bar { display: flex; width: 100%; height: 32px; border-radius: 6px; overflow: hidden; margin-bottom: 16px; }
  .timeline-seg { display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 500; white-space: nowrap; }
  .callout { border-left: 2px solid #1D9E75; padding: 10px 14px; background: var(--color-background-secondary); border-radius: 0 var(--border-radius-md) var(--border-radius-md) 0; font-size: 13px; color: var(--color-text-secondary); line-height: 1.6; margin-bottom: 16px; }
  .callout strong { color: var(--color-text-primary); font-weight: 500; }
  .cta { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
  .btn { font-family: var(--font-sans); font-size: 13px; padding: 8px 16px; border-radius: var(--border-radius-md); border: 0.5px solid var(--color-border-secondary); background: transparent; color: var(--color-text-primary); cursor: pointer; }
  .btn.primary { background: var(--color-text-primary); color: var(--color-background-primary); border-color: transparent; }
</style>

<div class="widget">
  <div class="widget-title"><!-- INJECT: title --></div>
  <div class="widget-sub"><!-- INJECT: subtitle --></div>

  <div class="phase-cards" id="phase-cards">
    <!-- JS builds cards here -->
  </div>

  <div class="section-label">36-month timeline</div>
  <div class="timeline-bar" id="timeline-bar">
    <!-- JS builds segments here -->
  </div>

  <div class="callout"><!-- INJECT: callout --></div>

  <div class="cta">
    <button class="btn primary" id="btn-primary"><!-- INJECT --> ↗</button>
    <button class="btn" id="btn-secondary"><!-- INJECT --> ↗</button>
  </div>
</div>

<script>
(function() {
  // INJECT: phase data
  var phases = [
    // { tag: 'Phase 1', tagBg: '#E1F5EE', tagText: '#0F6E56', title: '...', body: '...', invest: '$X–$Y', value: '$Z/yr' }
  ];

  // INJECT: timeline segments
  var segments = [
    // { label: 'Phase 1', color: '#1D9E75', textColor: '#04342C', widthPct: 25 }
  ];

  var cardsEl = document.getElementById('phase-cards');
  phases.forEach(function(p) {
    var card = document.createElement('div');
    card.className = 'phase-card';
    card.innerHTML =
      '<span class="phase-tag" style="background:' + p.tagBg + ';color:' + p.tagText + '">' + p.tag + '</span>' +
      '<div class="phase-title">' + p.title + '</div>' +
      '<div class="phase-body">' + p.body + '</div>' +
      '<div class="phase-numbers"><strong>' + p.invest + '</strong> invested · <strong>' + p.value + '</strong> value</div>';
    cardsEl.appendChild(card);
  });

  var barEl = document.getElementById('timeline-bar');
  segments.forEach(function(s) {
    var seg = document.createElement('div');
    seg.className = 'timeline-seg';
    seg.style.cssText = 'background:' + s.color + ';color:' + s.textColor + ';width:' + s.widthPct + '%;';
    seg.textContent = s.label;
    barEl.appendChild(seg);
  });

  // INJECT: CTA wiring
  document.getElementById('btn-primary').addEventListener('click', function() {
    sendPrompt('<!-- INJECT -->');
  });
})();
</script>
```

---

### Pattern H — Solution landscape

Spatial map showing where an operation sits relative to available solution
classes. X-axis: deployment complexity (brownfield-friendly → greenfield required).
Y-axis: labor reduction potential (low → high). Nodes represent solution classes.
A "you" marker shows the operation's position. Candidate nodes pulse. Dimmed
nodes are outside the operation's window.

**When to use:** When the routing conversation has produced enough locators
(order volume, facility size, primary pain) and genuine ambiguity exists between
two or more solution classes. Do not fire when the answer is obvious or the user
has already named a specific solution. Do not fire more than once per conversation.

**Node states (caller decides which nodes get which state):**
- `candidate` — in the operation's window. Pulsing ring rendered. Full opacity.
- `dimmed` — outside window. 15% opacity. No ring. Tooltip still shows.
- `you` — special marker. Teal dot + "Your operation" label. Not a solution node.

**Pulsing ring:** Optional. Defined here for candidate state. Caller may suppress
by omitting the ring element if the domain context makes animation feel wrong.

**Injection points:**
- `nodes` array: `{ id, label, sub, x, y, color, size, state, capex, labor, note }`
  - `x`, `y`: 0–100 (percentage of chart area, origin bottom-left)
  - `color`: hex — use semantic accent colors or ramp mids
  - `size`: dot diameter in px (24–52 recommended range)
  - `state`: `'candidate'` | `'dimmed'`
- `YOU`: `{ x, y }` — operation marker position
- Profile pills: key-value pairs shown above the map
- Map title string

**No CTAs in the widget.** The conversation handles next steps after the map.
Tooltip on hover is the only interactivity.

```widget
<style>
  .sl-wrap { font-family: var(--font-sans); padding: 4px 0; }
  .sl-profile { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
  .sl-pill { background: var(--color-background-secondary); border: 0.5px solid var(--color-border-tertiary); border-radius: 20px; padding: 4px 12px; font-size: 12px; color: var(--color-text-secondary); }
  .sl-pill span { color: var(--color-text-primary); font-weight: 500; }
  .sl-map-title { font-size: 12px; color: var(--color-text-secondary); margin-bottom: 8px; }
  .sl-axes { position: relative; width: 100%; height: 400px; border-left: 1.5px solid var(--color-border-secondary); border-bottom: 1.5px solid var(--color-border-secondary); }
  .sl-axis-y { position: absolute; left: -2.25rem; top: 50%; transform: translateY(-50%) rotate(-90deg); font-size: 10px; color: var(--color-text-tertiary); white-space: nowrap; }
  .sl-axis-x { position: absolute; bottom: -1.5rem; width: 100%; text-align: center; font-size: 10px; color: var(--color-text-tertiary); }
  .sl-axis-lo { position: absolute; font-size: 10px; color: var(--color-text-tertiary); }
  .sl-qh { position: absolute; top: 50%; left: 0; width: 100%; height: 0.5px; background: var(--color-border-tertiary); }
  .sl-qv { position: absolute; top: 0; left: 50%; width: 0.5px; height: 100%; background: var(--color-border-tertiary); }
  .sl-node { position: absolute; transform: translate(-50%, -50%); cursor: pointer; }
  .sl-node.dimmed { opacity: 0.15; }
  .sl-dot { border-radius: 50%; margin: 0 auto; transition: transform 0.15s; }
  .sl-node:hover .sl-dot { transform: scale(1.12); }
  .sl-label { font-size: 10px; font-weight: 500; text-align: center; margin-top: 4px; line-height: 1.3; color: var(--color-text-primary); white-space: nowrap; }
  .sl-sub { font-size: 9px; color: var(--color-text-secondary); text-align: center; }
  .sl-you-dot { width: 16px; height: 16px; background: #1D9E75; border-radius: 50%; margin: 0 auto; border: 2px solid var(--color-background-primary); }
  .sl-you-label { font-size: 10px; font-weight: 500; text-align: center; margin-top: 4px; color: #1D9E75; white-space: nowrap; }
  .sl-ring { border-radius: 50%; border: 2px solid currentColor; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); animation: sl-pulse 2.2s infinite; }
  @keyframes sl-pulse { 0% { transform: translate(-50%,-50%) scale(1); opacity: 0.5; } 50% { transform: translate(-50%,-50%) scale(1.4); opacity: 0.15; } 100% { transform: translate(-50%,-50%) scale(1); opacity: 0.5; } }
  .sl-tip { position: absolute; background: var(--color-background-primary); border: 0.5px solid var(--color-border-secondary); border-radius: var(--border-radius-lg); padding: 10px 12px; width: 200px; pointer-events: none; opacity: 0; transition: opacity 0.15s; z-index: 10; }
  .sl-tip.show { opacity: 1; }
  .sl-tip-name { font-size: 12px; font-weight: 500; margin-bottom: 4px; color: var(--color-text-primary); }
  .sl-tip-row { display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0; border-bottom: 0.5px solid var(--color-border-tertiary); }
  .sl-tip-row:last-child { border-bottom: none; }
  .sl-tip-key { color: var(--color-text-secondary); }
  .sl-tip-val { font-weight: 500; color: var(--color-text-primary); }
  .sl-tip-note { font-size: 10px; color: var(--color-text-secondary); margin-top: 6px; line-height: 1.4; }
</style>

<div class="sl-wrap">
  <!-- INJECT: profile pills -->
  <div class="sl-profile" id="sl-profile"></div>

  <!-- INJECT: map title -->
  <div class="sl-map-title"><!-- INJECT: title --></div>

  <div class="sl-axes" id="sl-chart">
    <div class="sl-axis-y">Labor reduction potential</div>
    <div class="sl-axis-x">Brownfield-friendly ← deployment complexity → Greenfield required</div>
    <div class="sl-axis-lo" style="top:4px;left:4px;">High</div>
    <div class="sl-axis-lo" style="bottom:4px;left:4px;">Low</div>
    <div class="sl-qh"></div>
    <div class="sl-qv"></div>
    <div class="sl-tip" id="sl-tip"></div>
  </div>
</div>

<script>
(function() {
  // INJECT: profile pills array — [{ label, value }]
  var profile = [];

  // INJECT: nodes array
  // { id, label, sub, x, y, color, size, state, capex, labor, note }
  // state: 'candidate' | 'dimmed'
  // x, y: 0–100 (% of chart area, origin bottom-left on Y)
  var nodes = [];

  // INJECT: operation marker position
  var YOU = { x: 50, y: 50 };

  // --- render pills ---
  var pillEl = document.getElementById('sl-profile');
  profile.forEach(function(p) {
    var d = document.createElement('div');
    d.className = 'sl-pill';
    d.innerHTML = p.label + ' <span>' + p.value + '</span>';
    pillEl.appendChild(d);
  });

  // --- chart render ---
  var chart = document.getElementById('sl-chart');
  var tip = document.getElementById('sl-tip');

  function W() { return chart.offsetWidth; }
  function H() { return chart.offsetHeight; }

  function render() {
    chart.querySelectorAll('.sl-node,.sl-you-node').forEach(function(n) { n.remove(); });

    // You marker
    var yel = document.createElement('div');
    yel.className = 'sl-you-node';
    yel.style.cssText = 'position:absolute;left:' + (YOU.x/100*W()) + 'px;top:' + ((1-YOU.y/100)*H()) + 'px;transform:translate(-50%,-50%);z-index:5;';
    yel.innerHTML = '<div class="sl-you-dot"></div><div class="sl-you-label">Your operation</div>';
    chart.appendChild(yel);

    // Solution nodes
    nodes.forEach(function(n) {
      var el = document.createElement('div');
      el.className = 'sl-node' + (n.state === 'dimmed' ? ' dimmed' : '');
      var topPct = (1 - n.y/100) * H();
      var leftPct = (n.x/100) * W();
      el.style.left = leftPct + 'px';
      el.style.top = topPct + 'px';

      var ring = n.state === 'candidate'
        ? '<div class="sl-ring" style="width:' + (n.size+14) + 'px;height:' + (n.size+14) + 'px;color:' + n.color + ';"></div>'
        : '';

      el.innerHTML =
        '<div style="position:relative;width:' + n.size + 'px;height:' + n.size + 'px;margin:0 auto;">' +
          ring +
          '<div class="sl-dot" style="width:' + n.size + 'px;height:' + n.size + 'px;background:' + n.color + ';position:absolute;top:0;left:0;"></div>' +
        '</div>' +
        '<div class="sl-label">' + n.label + '</div>' +
        '<div class="sl-sub">' + n.sub + '</div>';

      el.addEventListener('mouseenter', function(e) { showTip(e, n); });
      el.addEventListener('mouseleave', function() { tip.classList.remove('show'); });
      chart.appendChild(el);
    });
  }

  function showTip(e, n) {
    tip.innerHTML =
      '<div class="sl-tip-name">' + n.label + '</div>' +
      '<div class="sl-tip-row"><span class="sl-tip-key">Capex</span><span class="sl-tip-val">' + n.capex + '</span></div>' +
      '<div class="sl-tip-row"><span class="sl-tip-key">Labor reduction</span><span class="sl-tip-val">' + n.labor + '</span></div>' +
      '<div class="sl-tip-note">' + n.note + '</div>';
    var rect = chart.getBoundingClientRect();
    var ex = e.clientX - rect.left;
    var ey = e.clientY - rect.top;
    tip.style.left = (ex > W()/2 ? ex - 212 : ex + 12) + 'px';
    tip.style.top = Math.max(0, ey - 50) + 'px';
    tip.classList.add('show');
  }

  render();
  window.addEventListener('resize', render);
})();
</script>
```

---

## Input widget patterns

Use input widgets when the next step depends on a bounded choice. Never use
inline onclick — always addEventListener inside the IIFE.

**When to use which type:**

| Situation | Widget type |
|---|---|
| One answer from a known set | Input A — Single select |
| Multiple answers from a known set | Input B — Multi select |
| Ranking / prioritization | Input C — Priority order |
| 2–4 independent questions, all known upfront | Input D — Multi-panel stepper |
| Open-ended, requires typing | Plain prose question |
| Yes/No with no nuance | Plain prose question |

Never use input widgets to collect numbers (headcount, labor rate, investment).
Those always come from the user typing.

---

### Input A — Single select

Clicking fires sendPrompt() after 280ms visual confirmation. No submit button.

**Injection points:**
- Question text
- Option labels and data-val attributes
- sendPrompt prefix string

```widget
<style>
  .question { font-size: 14px; font-weight: 500; color: var(--color-text-primary); margin-bottom: 12px; line-height: 1.4; }
  .single-options { display: flex; flex-direction: column; gap: 6px; }
  .single-opt { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border: 0.5px solid var(--color-border-secondary); border-radius: var(--border-radius-md); background: var(--color-background-primary); cursor: pointer; font-size: 13px; color: var(--color-text-secondary); text-align: left; width: 100%; transition: border-color 0.1s, color 0.1s, background 0.1s; }
  .single-opt:hover { border-color: var(--color-border-primary); color: var(--color-text-primary); background: var(--color-background-secondary); }
  .single-opt.selected { border-color: #1D9E75; color: #085041; background: #E1F5EE; }
  .dot { width: 14px; height: 14px; border-radius: 50%; border: 1.5px solid var(--color-border-secondary); flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .single-opt.selected .dot { border-color: #1D9E75; background: #1D9E75; }
  .dot-inner { width: 6px; height: 6px; border-radius: 50%; background: white; opacity: 0; }
  .single-opt.selected .dot-inner { opacity: 1; }
</style>
<div style="padding: 4px 0;">
  <div class="question"><!-- INJECT: question text --></div>
  <div class="single-options">
    <!-- INJECT: one button per option -->
    <button class="single-opt" data-val="Option A"><div class="dot"><div class="dot-inner"></div></div>Option A</button>
  </div>
</div>
<script>
(function() {
  document.querySelectorAll('.single-opt').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.single-opt').forEach(function(b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      setTimeout(function() {
        sendPrompt('<!-- INJECT: prefix -->: ' + btn.dataset.val);
      }, 280);
    });
  });
})();
</script>
```

---

### Input B — Multi select

Pill chips toggle on/off. Submit button activates when any chip is selected.

**Injection points:**
- Question text
- Option labels
- sendPrompt prefix string

```widget
<style>
  .question { font-size: 14px; font-weight: 500; color: var(--color-text-primary); margin-bottom: 12px; line-height: 1.4; }
  .multi-options { display: flex; flex-wrap: wrap; gap: 8px; }
  .multi-opt { padding: 8px 14px; border: 0.5px solid var(--color-border-secondary); border-radius: 20px; background: var(--color-background-primary); cursor: pointer; font-size: 13px; color: var(--color-text-secondary); transition: border-color 0.1s, color 0.1s, background 0.1s; }
  .multi-opt:hover { border-color: var(--color-border-primary); color: var(--color-text-primary); }
  .multi-opt.selected { border-color: #1D9E75; background: #E1F5EE; color: #085041; }
  .multi-submit { margin-top: 12px; padding: 8px 20px; border-radius: var(--border-radius-md); border: 0.5px solid var(--color-border-secondary); background: var(--color-background-primary); color: var(--color-text-tertiary); font-size: 13px; cursor: pointer; transition: background 0.1s, color 0.1s, border-color 0.1s; }
  .multi-submit.ready { background: var(--color-text-primary); color: var(--color-background-primary); border-color: transparent; }
</style>
<div style="padding: 4px 0;">
  <div class="question"><!-- INJECT: question text --></div>
  <div class="multi-options">
    <!-- INJECT: one button per option -->
    <button class="multi-opt">Option A</button>
  </div>
  <button class="multi-submit" id="multi-submit">Confirm selection ↗</button>
</div>
<script>
(function() {
  var submit = document.getElementById('multi-submit');
  document.querySelectorAll('.multi-opt').forEach(function(btn) {
    btn.addEventListener('click', function() {
      btn.classList.toggle('selected');
      var any = document.querySelectorAll('.multi-opt.selected').length > 0;
      submit.classList.toggle('ready', any);
    });
  });
  submit.addEventListener('click', function() {
    var selected = [].slice.call(document.querySelectorAll('.multi-opt.selected'))
      .map(function(b) { return b.textContent.trim(); });
    if (!selected.length) return;
    sendPrompt('<!-- INJECT: prefix -->: ' + selected.join(', '));
  });
})();
</script>
```

---

### Input C — Priority order

Drag to reorder. Rank numbers update live. Submit sends numbered list.

**Injection points:**
- Question text
- Item labels and data-val attributes

```widget
<style>
  .question { font-size: 14px; font-weight: 500; color: var(--color-text-primary); margin-bottom: 12px; line-height: 1.4; }
  .priority-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border: 0.5px solid var(--color-border-secondary); border-radius: var(--border-radius-md); background: var(--color-background-primary); font-size: 13px; color: var(--color-text-secondary); cursor: grab; user-select: none; margin-bottom: 6px; }
  .priority-item:active { cursor: grabbing; }
  .priority-item.dragging { opacity: 0.4; }
  .priority-item.drag-over { border-color: #1D9E75; background: #E1F5EE; }
  .rank { width: 20px; height: 20px; border-radius: 50%; background: var(--color-background-secondary); border: 0.5px solid var(--color-border-tertiary); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 500; color: var(--color-text-tertiary); flex-shrink: 0; }
  .handle { display: flex; flex-direction: column; gap: 2.5px; margin-left: auto; flex-shrink: 0; }
  .handle span { display: block; width: 14px; height: 1.5px; background: var(--color-border-secondary); border-radius: 1px; }
  .priority-submit { margin-top: 4px; padding: 8px 20px; border-radius: var(--border-radius-md); border: none; background: var(--color-text-primary); color: var(--color-background-primary); font-size: 13px; cursor: pointer; opacity: 0.85; }
  .priority-submit:hover { opacity: 1; }
</style>
<div style="padding: 4px 0;">
  <div class="question"><!-- INJECT: question text --></div>
  <div id="priority-list">
    <!-- INJECT: one .priority-item per option -->
    <div class="priority-item" draggable="true" data-val="Item A"><div class="rank">1</div>Item A<div class="handle"><span></span><span></span><span></span></div></div>
  </div>
  <button class="priority-submit" id="priority-submit">These are my priorities ↗</button>
</div>
<script>
(function() {
  var list = document.getElementById('priority-list');
  var dragSrc = null;
  list.querySelectorAll('.priority-item').forEach(function(item) {
    item.addEventListener('dragstart', function() {
      dragSrc = item;
      setTimeout(function() { item.classList.add('dragging'); }, 0);
    });
    item.addEventListener('dragend', function() {
      item.classList.remove('dragging');
      list.querySelectorAll('.priority-item').forEach(function(i) { i.classList.remove('drag-over'); });
      list.querySelectorAll('.priority-item').forEach(function(i, n) { i.querySelector('.rank').textContent = n + 1; });
    });
    item.addEventListener('dragover', function(e) {
      e.preventDefault();
      if (item !== dragSrc) {
        list.querySelectorAll('.priority-item').forEach(function(i) { i.classList.remove('drag-over'); });
        item.classList.add('drag-over');
      }
    });
    item.addEventListener('drop', function(e) {
      e.preventDefault();
      if (item !== dragSrc) {
        var items = [].slice.call(list.querySelectorAll('.priority-item'));
        if (items.indexOf(dragSrc) < items.indexOf(item)) list.insertBefore(dragSrc, item.nextSibling);
        else list.insertBefore(dragSrc, item);
      }
    });
  });
  document.getElementById('priority-submit').addEventListener('click', function() {
    var items = [].slice.call(list.querySelectorAll('.priority-item')).map(function(item, i) {
      return (i + 1) + '. ' + item.dataset.val;
    });
    sendPrompt('My priorities in order:\n' + items.join('\n'));
  });
})();
</script>
```

---

### Input D — Multi-panel stepper

Multi-step intake that collects 2–4 independent answers in one widget.
Panels transition in place. Progress pips track position. Review screen
at the end lets the user edit any answer before submitting. One
sendPrompt fires on final submit with all answers serialized.

Use only when all questions are known at render time and no panel's
options depend on a previous panel's answer. If answers branch, use
individual input widgets with agent round-trips instead.

**Injection points:**
- Panel definitions array: `{ type: 'single'|'multi'|'priority', question, hint?, options[] }`
- Review screen labels (one per panel)
- sendPrompt serialization format

**Panel types available:**
- `single` — radio-dot options, one selection (reuses Input A styling)
- `multi` — pill chips, toggle on/off (reuses Input B styling)
- `priority` — drag-to-reorder with rank numbers (reuses Input C styling)

**Stepper constraints:**
- Maximum 4 panels
- Every panel must be independently answerable
- Priority panels always have a default answer (initial order)
- Review screen is mandatory — never skip it
- Submit button label should be specific, not "Submit"
- Edit links in review must return to the exact panel, preserving all other selections

```widget
<style>
  .stepper { font-family: var(--font-sans); color: var(--color-text-primary); padding: 4px 0; }
  .panel { display: none; }
  .panel.active { display: block; }
  .question { font-size: 14px; font-weight: 500; color: var(--color-text-primary); margin-bottom: 4px; line-height: 1.4; }
  .hint { font-size: 12px; color: var(--color-text-secondary); margin-bottom: 14px; line-height: 1.5; }
  .single-options { display: flex; flex-direction: column; gap: 6px; }
  .single-opt { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border: 0.5px solid var(--color-border-secondary); border-radius: var(--border-radius-md); background: var(--color-background-primary); cursor: pointer; font-size: 13px; color: var(--color-text-secondary); text-align: left; width: 100%; transition: border-color 0.12s, color 0.12s, background 0.12s; }
  .single-opt:hover { border-color: var(--color-border-primary); color: var(--color-text-primary); background: var(--color-background-secondary); }
  .single-opt.selected { border-color: #1D9E75; color: #085041; background: #E1F5EE; }
  .dot { width: 14px; height: 14px; border-radius: 50%; border: 1.5px solid var(--color-border-secondary); flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .single-opt.selected .dot { border-color: #1D9E75; background: #1D9E75; }
  .dot-inner { width: 6px; height: 6px; border-radius: 50%; background: white; opacity: 0; }
  .single-opt.selected .dot-inner { opacity: 1; }
  .multi-options { display: flex; flex-wrap: wrap; gap: 8px; }
  .multi-opt { padding: 8px 14px; border: 0.5px solid var(--color-border-secondary); border-radius: 20px; background: var(--color-background-primary); cursor: pointer; font-size: 13px; color: var(--color-text-secondary); transition: border-color 0.12s, color 0.12s, background 0.12s; }
  .multi-opt:hover { border-color: var(--color-border-primary); color: var(--color-text-primary); }
  .multi-opt.selected { border-color: #1D9E75; background: #E1F5EE; color: #085041; }
  .pri-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border: 0.5px solid var(--color-border-secondary); border-radius: var(--border-radius-md); background: var(--color-background-primary); font-size: 13px; color: var(--color-text-secondary); cursor: grab; user-select: none; margin-bottom: 6px; }
  .pri-item:active { cursor: grabbing; }
  .rank-num { width: 20px; height: 20px; border-radius: 50%; background: var(--color-background-secondary); border: 0.5px solid var(--color-border-tertiary); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 500; color: var(--color-text-tertiary); flex-shrink: 0; }
  .handle { display: flex; flex-direction: column; gap: 2.5px; margin-left: auto; flex-shrink: 0; }
  .handle span { display: block; width: 14px; height: 1.5px; background: var(--color-border-secondary); border-radius: 1px; }
  .footer { display: flex; align-items: center; justify-content: space-between; margin-top: 18px; padding-top: 14px; border-top: 0.5px solid var(--color-border-tertiary); }
  .progress { display: flex; gap: 6px; align-items: center; }
  .pip { width: 8px; height: 8px; border-radius: 50%; background: var(--color-border-tertiary); transition: background 0.2s; }
  .pip.done { background: #1D9E75; }
  .pip.current { background: var(--color-text-primary); }
  .step-label { font-size: 11px; color: var(--color-text-tertiary); margin-left: 8px; }
  .footer-actions { display: flex; gap: 8px; }
  .btn-skip { font-family: var(--font-sans); font-size: 12px; padding: 7px 14px; border-radius: var(--border-radius-md); border: none; background: transparent; color: var(--color-text-tertiary); cursor: pointer; }
  .btn-skip:hover { color: var(--color-text-secondary); }
  .btn-next { font-family: var(--font-sans); font-size: 13px; padding: 7px 18px; border-radius: var(--border-radius-md); border: 0.5px solid var(--color-border-secondary); background: transparent; color: var(--color-text-tertiary); cursor: default; transition: background 0.12s, color 0.12s, border-color 0.12s; }
  .btn-next.ready { background: var(--color-text-primary); color: var(--color-background-primary); border-color: transparent; cursor: pointer; }
  .btn-next.ready:hover { opacity: 0.88; }
  .review { display: none; }
  .review.active { display: block; }
  .review-row { display: flex; justify-content: space-between; align-items: baseline; padding: 8px 0; border-bottom: 0.5px solid var(--color-border-tertiary); }
  .review-row:last-child { border-bottom: none; }
  .review-q { font-size: 12px; color: var(--color-text-secondary); }
  .review-a { font-size: 13px; font-weight: 500; color: var(--color-text-primary); text-align: right; max-width: 60%; }
  .review-edit { font-size: 11px; color: var(--color-text-tertiary); cursor: pointer; margin-left: 8px; }
  .review-edit:hover { color: var(--color-text-secondary); }
  .btn-submit { font-family: var(--font-sans); font-size: 13px; padding: 8px 20px; border-radius: var(--border-radius-md); border: none; background: var(--color-text-primary); color: var(--color-background-primary); cursor: pointer; margin-top: 14px; }
  .btn-submit:hover { opacity: 0.88; }
</style>

<div class="stepper">
  <!-- INJECT: one .panel per step, first gets class="active" -->
  <!-- Each panel: .question, optional .hint, then options using Input A/B/C markup -->
  <!-- Panel IDs: p0, p1, p2, etc. -->

  <div class="review" id="review">
    <div class="question">Here's what I heard</div>
    <div class="hint">Look right? Hit submit and I'll start building your numbers.</div>
    <div id="review-rows"></div>
    <button class="btn-submit" id="btn-submit"><!-- INJECT: submit label --> ↗</button>
  </div>

  <div class="footer" id="footer">
    <div class="progress">
      <!-- INJECT: one .pip per panel, first gets class="current" -->
      <span class="step-label" id="step-label">Step 1 of N</span>
    </div>
    <div class="footer-actions">
      <button class="btn-skip" id="btn-skip">Skip</button>
      <button class="btn-next" id="btn-next">Next</button>
    </div>
  </div>
</div>

<script>
(function() {
  // INJECT: panel count, answer slots, review labels
  var total = 3;
  var answers = [null, null, null];
  var labels = ['Label 1', 'Label 2', 'Label 3'];

  var panels = [];
  for (var i = 0; i < total; i++) panels.push(document.getElementById('p' + i));
  var review = document.getElementById('review');
  var footer = document.getElementById('footer');
  var btnNext = document.getElementById('btn-next');
  var btnSkip = document.getElementById('btn-skip');
  var stepLabel = document.getElementById('step-label');
  var current = 0;

  function updatePips() {
    for (var i = 0; i < total; i++) {
      var pip = document.getElementById('pip-' + i);
      pip.className = 'pip';
      if (i < current) pip.className = 'pip done';
      if (i === current) pip.className = 'pip current';
    }
    stepLabel.textContent = 'Step ' + (current + 1) + ' of ' + total;
  }

  function checkReady() {
    // INJECT: per-panel readiness logic
    // single panels: answers[current] !== null
    // multi panels: querySelectorAll('.multi-opt.selected').length > 0
    // priority panels: always ready
    btnNext.classList.toggle('ready', answers[current] !== null);
  }

  function goTo(step) {
    if (step >= total) { showReview(); return; }
    panels.forEach(function(p) { p.classList.remove('active'); });
    review.classList.remove('active');
    panels[step].classList.add('active');
    footer.style.display = 'flex';
    current = step;
    updatePips();
    btnNext.classList.remove('ready');
    checkReady();
  }

  function showReview() {
    panels.forEach(function(p) { p.classList.remove('active'); });
    review.classList.add('active');
    footer.style.display = 'none';

    var rows = document.getElementById('review-rows');
    rows.innerHTML = '';
    for (var i = 0; i < total; i++) {
      var val = answers[i] || 'Skipped';
      var row = document.createElement('div');
      row.className = 'review-row';
      row.innerHTML =
        '<div class="review-q">' + labels[i] + '</div>' +
        '<div style="display:flex;align-items:baseline;">' +
          '<div class="review-a">' + (Array.isArray(val) ? val.join(', ') : val) + '</div>' +
          '<span class="review-edit" data-step="' + i + '">Edit</span>' +
        '</div>';
      rows.appendChild(row);
    }

    rows.querySelectorAll('.review-edit').forEach(function(el) {
      el.addEventListener('click', function() {
        goTo(parseInt(el.dataset.step));
      });
    });
  }

  // INJECT: per-panel event wiring
  // Single: click sets answers[idx], calls checkReady()
  // Multi: toggle .selected, collect into array
  // Priority: drag/drop reorder, update rank numbers

  btnNext.addEventListener('click', function() {
    if (!btnNext.classList.contains('ready')) return;
    goTo(current + 1);
  });

  btnSkip.addEventListener('click', function() {
    goTo(current + 1);
  });

  document.getElementById('btn-submit').addEventListener('click', function() {
    // INJECT: sendPrompt with all answers serialized
    sendPrompt('Intake: ' + JSON.stringify(answers));
  });

  updatePips();
  checkReady();
})();
</script>
```

---

## Document card pattern

Use immediately after generating any substantial prose output. Always append
without waiting to be asked.

**Injection points:**
- Document title
- Meta line (process, key numbers, format)
- Preview sendPrompt text
- Download action (print bridge or downloadPDF with doc id)

```widget
<style>
  .doc-card { display: flex; align-items: center; gap: 14px; padding: 14px 16px; background: var(--color-background-primary); border: 0.5px solid var(--color-border-secondary); border-radius: var(--border-radius-lg); }
  .doc-icon { width: 36px; height: 44px; background: var(--color-background-secondary); border: 0.5px solid var(--color-border-tertiary); border-radius: 4px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .doc-title { font-size: 13px; font-weight: 500; color: var(--color-text-primary); margin-bottom: 2px; }
  .doc-meta { font-size: 11px; color: var(--color-text-tertiary); }
  .doc-actions { display: flex; gap: 8px; flex-shrink: 0; margin-left: auto; }
  .doc-btn { font-family: var(--font-sans); font-size: 12px; padding: 6px 12px; border-radius: var(--border-radius-md); border: 0.5px solid var(--color-border-secondary); background: transparent; color: var(--color-text-secondary); cursor: pointer; transition: background 0.1s, color 0.1s; }
  .doc-btn:hover { background: var(--color-background-secondary); color: var(--color-text-primary); }
  .doc-btn.primary { background: var(--color-text-primary); color: var(--color-background-primary); border-color: transparent; }
  .doc-btn.primary:hover { opacity: 0.85; }
</style>
<div class="doc-card">
  <div class="doc-icon">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.4">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  </div>
  <div style="flex:1;min-width:0;">
    <div class="doc-title"><!-- INJECT: title --></div>
    <div class="doc-meta"><!-- INJECT: meta line --></div>
  </div>
  <div class="doc-actions">
    <button class="doc-btn" id="btn-preview">Preview</button>
    <button class="doc-btn primary" id="btn-download">Download ↓</button>
  </div>
</div>
<script>
(function() {
  document.getElementById('btn-preview').addEventListener('click', function() {
    sendPrompt('<!-- INJECT: preview prompt -->');
  });
  document.getElementById('btn-download').addEventListener('click', function() {
    window.parent.postMessage({ type: 'action', name: 'print' }, '*');
  });
})();
</script>
```

Meta line format: `[Context] · [key number] · [key number] · PDF`