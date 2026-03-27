---
name: present-widget
description: >
  Widget rendering rules, CSS component library, and CTA patterns. Load this skill
  before generating any ```widget block. Covers layout, theming, interactivity,
  and the action bridge for direct parent actions.
---

# present_widget

You are about to generate an interactive widget. Follow these rules exactly.

## Format

Output widgets as a ```widget block — a self-contained HTML fragment with `<style>`, markup, and `<script>` cleanly separated. Never put HTML or CSS inside a `<script>` tag.

## CSS Variables

CSS variables live in the iframe — use them for all colors. Never hardcode colors except the four semantic accents:
- `#1D9E75` = positive/success
- `#BA7517` = warning
- `#E24B4A` = danger
- `#378ADD` = info

## JavaScript

Wrap all JavaScript in an IIFE: `(function() { ... })()`

`sendPrompt(text)` is a global — call it from CTA buttons with current state baked in. No localStorage, no position: fixed, no external fetches.

For direct parent actions (print, download), use the action bridge:
```
window.parent.postMessage({ type: 'action', name: 'print' }, '*');
window.parent.postMessage({ type: 'action', name: 'downloadPDF', args: { id: 'doc-id' } }, '*');
```

Use `sendPrompt()` when the action should continue the conversation.
Use the action bridge when it shouldn't.

**IMPORTANT:** Always use `'*'` as the target origin in postMessage calls.

## Standard CSS Component Library

Include in every widget `<style>` block:

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
.slider-row { display: grid; grid-template-columns: 140px 1fr 48px; align-items: center; gap: 8px; margin-bottom: 10px; }
.slider-label { font-size: 12px; color: var(--color-text-secondary); }
.slider-value { font-size: 12px; font-weight: 500; color: var(--color-text-primary); text-align: right; }
.callout { border-left: 2px solid #1D9E75; padding: 10px 14px; background: var(--color-background-secondary); border-radius: 0 var(--border-radius-md) var(--border-radius-md) 0; font-size: 13px; color: var(--color-text-secondary); line-height: 1.6; margin-bottom: 16px; }
.callout strong { color: var(--color-text-primary); font-weight: 500; }
.callout.warn { border-left-color: #BA7517; }
.phase-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
.phase-card { border: 0.5px solid var(--color-border-tertiary); border-radius: var(--border-radius-md); padding: 12px 14px; }
.phase-title { font-size: 12px; font-weight: 500; color: var(--color-text-primary); margin-bottom: 6px; }
.phase-body { font-size: 12px; color: var(--color-text-secondary); line-height: 1.5; }
.tag { display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 20px; margin-bottom: 6px; }
.tag-green { background: #E1F5EE; color: #0F6E56; }
.tag-amber { background: #FAEEDA; color: #854F0B; }
.tag-blue { background: #E6F1FB; color: #0C447C; }
.cta { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
.btn { font-family: var(--font-sans); font-size: 13px; padding: 8px 16px; border-radius: var(--border-radius-md); border: 0.5px solid var(--color-border-secondary); background: transparent; color: var(--color-text-primary); cursor: pointer; }
.btn:hover { background: var(--color-background-secondary); }
.btn.primary { background: var(--color-text-primary); color: var(--color-background-primary); border-color: transparent; }
.btn.primary:hover { opacity: 0.85; }
```

## CTA Rules

Every widget CTA button calls `sendPrompt()` with the current state baked in — never a generic prompt. Never use a CTA button with a generic label like "Continue" — every button goes somewhere specific.
