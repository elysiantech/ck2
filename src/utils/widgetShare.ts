/**
 * Build a standalone HTML document from widget code and CSS variables.
 * Used for sharing widgets as self-contained HTML pages.
 */
export function buildShareableHtml(widgetCode: string, vars: Record<string, string>): string {
  const styles = [...widgetCode.matchAll(/<style>([\s\S]*?)<\/style>/gi)]
    .map(m => m[1]).join('\n');
  const scripts = [...widgetCode.matchAll(/<script>([\s\S]*?)<\/script>/gi)]
    .map(m => m[1]).join('\n');
  const markup = widgetCode
    .replace(/<style>[\s\S]*?<\/style>/gi, '')
    .replace(/<script>[\s\S]*?<\/script>/gi, '')
    .trim();

  const cssVars = Object.entries(vars)
    .map(([k, v]) => `${k}: ${v};`).join('\n    ');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root { ${cssVars} }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: var(--font-sans); padding: 24px; max-width: 680px; margin: 0 auto; }
  ${styles}
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
</head>
<body>
<div id="root">${markup}</div>
<script>
  window.sendPrompt = function(text) {
    console.log('sendPrompt (standalone):', text);
  };
</script>
<script>${scripts}</script>
</body>
</html>`;
}

/**
 * Snapshot current CSS variables from the document root.
 * Used when sharing a widget to preserve the current theme.
 */
export function snapshotCssVars(): Record<string, string> {
  const hostStyles = getComputedStyle(document.documentElement);
  const varNames = [
    '--font-sans', '--font-serif', '--font-mono',
    '--color-text-primary', '--color-text-secondary', '--color-text-tertiary',
    '--color-background-primary', '--color-background-secondary', '--color-background-tertiary',
    '--color-border-tertiary', '--color-border-secondary', '--color-border-primary',
    '--border-radius-md', '--border-radius-lg', '--border-radius-xl',
  ];
  const vars: Record<string, string> = {};
  varNames.forEach(v => {
    const value = hostStyles.getPropertyValue(v).trim();
    if (value) vars[v] = value;
  });
  return vars;
}
