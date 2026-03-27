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
.metric-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; }
.metric-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }

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

.cta { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
.btn { font-family: var(--font-sans); font-size: 13px; padding: 8px 16px; border-radius: var(--border-radius-md); border: 0.5px solid var(--color-border-secondary); background: transparent; color: var(--color-text-primary); cursor: pointer; }
.btn:hover { background: var(--color-background-secondary); }
.btn.primary { background: var(--color-text-primary); color: var(--color-background-primary); border-color: transparent; }
.btn.primary:hover { opacity: 0.85; }

.warn-text { color: #BA7517; }
.total-row { display: flex; justify-content: space-between; font-size: 12px; color: var(--color-text-secondary); margin-bottom: 4px; }
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

## Analysis widget patterns

### Slider widget skeleton

The minimal pattern for any widget with sliders and live-updating metrics:

```widget
<style>
  /* include full CSS component library here */
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
  <div class="widget-title">Widget title</div>
  <div class="widget-sub">Subtitle / context line</div>

  <div class="slider-row">
    <div class="slider-label">Labor rate ($/hr)</div>
    <input type="range" id="sl-labor" min="15" max="80" step="1" value="25">
    <div class="slider-value" id="val-labor">$25</div>
  </div>

  <div class="metric-grid-2">
    <div class="metric"><div class="metric-label">Annual savings</div><div class="metric-value" id="m-savings">—</div></div>
    <div class="metric"><div class="metric-label">Payback</div><div class="metric-value" id="m-payback">—</div></div>
  </div>

  <div class="callout" id="verdict"></div>

  <div class="cta">
    <button class="btn primary" id="btn-next">What should I do first? ↗</button>
  </div>
</div>

<script>
(function() {
  var slLabor  = document.getElementById('sl-labor');
  var valLabor = document.getElementById('val-labor');

  function fmt(n) { return '$' + Math.round(n).toLocaleString(); }
  function fmtYrs(y) {
    if (!isFinite(y) || y <= 0) return '—';
    if (y < 1) return (y * 12).toFixed(1) + ' mo';
    return y.toFixed(1) + ' yrs';
  }

  function update() {
    var wage    = +slLabor.value;
    var annual  = wage * 8 * 250;
    var invest  = 190000;
    var payback = invest / annual;

    valLabor.textContent = '$' + wage;
    document.getElementById('m-savings').textContent = fmt(annual) + '/yr';
    document.getElementById('m-payback').textContent = fmtYrs(payback);

    var v = document.getElementById('verdict');
    if (payback < 1.5) {
      v.className = 'callout';
      v.innerHTML = '<strong>Strong case.</strong> Payback well within typical approval thresholds.';
    } else if (payback < 2.5) {
      v.className = 'callout warn';
      v.innerHTML = '<strong>Viable.</strong> Labor savings may need throughput gains to close the gap.';
    } else {
      v.className = 'callout warn';
      v.innerHTML = '<strong>Challenging on labor alone.</strong> Let\'s look at what else changes.';
    }
  }

  slLabor.addEventListener('input', update);

  document.getElementById('btn-next').addEventListener('click', function() {
    sendPrompt(
      'My labor rate is $' + slLabor.value + '/hr. ' +
      'What should I do first to move this project forward?'
    );
  });

  update();
})();
</script>
```

---

### Timeline bar pattern

For process transformation widgets showing old-way vs. new-way shift breakdown:

```html
<!-- HTML structure -->
<div class="section-label">operator's 8-hour shift — old way</div>
<div class="timeline-bar" id="bar-old">
  <div class="timeline-seg" id="seg-load"     style="background:#888780;color:#F1EFE8;width:22%;">22%</div>
  <div class="timeline-seg" id="seg-assembly" style="background:#1D9E75;color:#04342C;width:30%;">30%</div>
  <div class="timeline-seg" id="seg-insp"     style="background:#5F5E5A;color:#F1EFE8;width:14%;">14%</div>
  <div class="timeline-seg" id="seg-break"    style="background:#D3D1C7;color:#444441;width:14%;">14%</div>
  <div class="timeline-seg" id="seg-other"    style="background:#F1EFE8;color:#888780;width:20%;">20%</div>
</div>

<div class="legend">
  <div class="legend-item"><div class="swatch" style="background:#888780;"></div>machine load/unload</div>
  <div class="legend-item"><div class="swatch" style="background:#1D9E75;"></div>value-added work</div>
  <div class="legend-item"><div class="swatch" style="background:#5F5E5A;"></div>inspect / deburr</div>
  <div class="legend-item"><div class="swatch" style="background:#D3D1C7;"></div>breaks</div>
  <div class="legend-item"><div class="swatch" style="background:#F1EFE8;"></div>buffer / other</div>
</div>
```

Color convention:
- `#888780` gray — robot/machine-owned tasks
- `#1D9E75` teal — human tasks that remain after automation
- `#BA7517` amber — partially automated tasks
- `#D3D1C7` light gray — breaks
- `#F1EFE8` near-white — buffer / unaccounted

---

### Value waterfall pattern

Horizontal waterfall in plain HTML/CSS — no Chart.js. Each bar is a flex row with a colored fill div:

```html
<div style="margin-bottom:16px;">
  <!-- Positive bar (teal) -->
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
    <div style="width:120px;font-size:12px;color:var(--color-text-secondary);text-align:right;flex-shrink:0;">Labor savings</div>
    <div style="flex:1;background:var(--color-background-primary);border-radius:4px;height:28px;overflow:hidden;">
      <div id="bar-labor" style="background:#1D9E75;height:100%;display:flex;align-items:center;padding:0 8px;">
        <span style="font-size:12px;font-weight:500;color:#04342C;" id="lbl-labor">$81K</span>
      </div>
    </div>
  </div>
  <!-- Negative bar (amber) -->
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
    <div style="width:120px;font-size:12px;color:var(--color-text-secondary);text-align:right;flex-shrink:0;">System cost</div>
    <div style="flex:1;background:var(--color-background-primary);border-radius:4px;height:28px;overflow:hidden;">
      <div id="bar-cost" style="background:#BA7517;height:100%;display:flex;align-items:center;padding:0 8px;">
        <span style="font-size:12px;font-weight:500;color:#412402;" id="lbl-cost">$38K/yr</span>
      </div>
    </div>
  </div>
</div>
```

Bar widths are set as percentages relative to the largest bar. Calculate in JS:
```javascript
var maxVal = Math.max(laborSavings, throughputGain, systemCostAnnual, maintenance);
document.getElementById('bar-labor').style.width = (laborSavings / maxVal * 100) + '%';
document.getElementById('bar-cost').style.width  = (systemCostAnnual / maxVal * 100) + '%';
```

---

## Input widget patterns

Use input widgets when the next step depends on a bounded choice. Never use inline onclick — always addEventListener inside the IIFE.

**When to use which type:**

| Situation | Widget type |
|---|---|
| One answer from a known set | Single select |
| Multiple answers from a known set | Multi select |
| Ranking / prioritization | Priority order |
| Open-ended, requires typing | Plain prose question |
| Yes/No with no nuance | Plain prose question |

Never use input widgets to collect numbers (headcount, labor rate, investment). Those always come from the user typing.

---

### Input widget A — Single select

Clicking fires sendPrompt() after 280ms visual confirmation. No submit button.

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
  <div class="question">QUESTION TEXT HERE</div>
  <div class="single-options">
    <button class="single-opt" data-val="Option A label"><div class="dot"><div class="dot-inner"></div></div>Option A label</button>
    <button class="single-opt" data-val="Option B label"><div class="dot"><div class="dot-inner"></div></div>Option B label</button>
    <button class="single-opt" data-val="Option C label"><div class="dot"><div class="dot-inner"></div></div>Option C label</button>
  </div>
</div>
<script>
(function() {
  document.querySelectorAll('.single-opt').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.single-opt').forEach(function(b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      setTimeout(function() {
        sendPrompt('PROMPT PREFIX: ' + btn.dataset.val);
      }, 280);
    });
  });
})();
</script>
```

Customize: question text, option labels, data-val attributes, sendPrompt prefix string.

---

### Input widget B — Multi select

Pill chips toggle on/off. Submit button activates when any chip is selected.

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
  <div class="question">QUESTION TEXT HERE</div>
  <div class="multi-options">
    <button class="multi-opt">Option A</button>
    <button class="multi-opt">Option B</button>
    <button class="multi-opt">Option C</button>
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
    var selected = [...document.querySelectorAll('.multi-opt.selected')]
      .map(function(b) { return b.textContent.trim(); });
    if (!selected.length) return;
    sendPrompt('PROMPT PREFIX: ' + selected.join(', '));
  });
})();
</script>
```

Customize: question text, option labels, sendPrompt prefix string.

---

### Input widget C — Priority order

Drag to reorder. Rank numbers update live. Submit sends numbered list.

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
  <div class="question">QUESTION TEXT HERE — drag to rank</div>
  <div id="priority-list">
    <div class="priority-item" draggable="true" data-val="Item A"><div class="rank">1</div>Item A<div class="handle"><span></span><span></span><span></span></div></div>
    <div class="priority-item" draggable="true" data-val="Item B"><div class="rank">2</div>Item B<div class="handle"><span></span><span></span><span></span></div></div>
    <div class="priority-item" draggable="true" data-val="Item C"><div class="rank">3</div>Item C<div class="handle"><span></span><span></span><span></span></div></div>
    <div class="priority-item" draggable="true" data-val="Item D"><div class="rank">4</div>Item D<div class="handle"><span></span><span></span><span></span></div></div>
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
        var items = [...list.querySelectorAll('.priority-item')];
        if (items.indexOf(dragSrc) < items.indexOf(item)) list.insertBefore(dragSrc, item.nextSibling);
        else list.insertBefore(dragSrc, item);
      }
    });
  });
  document.getElementById('priority-submit').addEventListener('click', function() {
    var items = [...list.querySelectorAll('.priority-item')].map(function(item, i) {
      return (i + 1) + '. ' + item.dataset.val;
    });
    sendPrompt('My priorities in order:\n' + items.join('\n'));
  });
})();
</script>
```

Customize: question text, item labels, data-val attributes.

---

## Document card pattern

Use immediately after generating any substantial prose output (checklist, one-pager, phase summary, ROI summary). Always append without waiting to be asked. Exempt from the no-back-to-back analysis widget rule.

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
    <div class="doc-title">DOCUMENT TITLE HERE</div>
    <div class="doc-meta">PROCESS · KEY NUMBERS · PDF</div>
  </div>
  <div class="doc-actions">
    <button class="doc-btn" id="btn-preview">Preview</button>
    <button class="doc-btn primary" id="btn-download">Download ↓</button>
  </div>
</div>
<script>
(function() {
  document.getElementById('btn-preview').addEventListener('click', function() {
    sendPrompt('Show me the full DOCUMENT TITLE formatted for print');
  });
  document.getElementById('btn-download').addEventListener('click', function() {
    window.parent.postMessage({ type: 'action', name: 'print' }, '*');
  });
})();
</script>
```

Meta line format: `[Process] · [key number] · [key number] · PDF`
Example: `Palletizing · 2 shifts · $190K installed · PDF`