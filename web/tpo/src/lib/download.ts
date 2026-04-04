export function downloadText(
  filename: string,
  text: string,
  mime = "text/plain;charset=utf-8",
) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

function csvEscape(value: any) {
  const s = String(value ?? "");
  if (
    s.includes('"') ||
    s.includes(",") ||
    s.includes("\n") ||
    s.includes("\r")
  ) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function downloadCSV(
  filename: string,
  rows: Array<Record<string, any>>,
) {
  if (!rows || rows.length === 0) {
    downloadText(filename, "", "text/csv;charset=utf-8");
    return;
  }

  // Build headers without Set/Array.from to avoid TS lib issues
  const headerMap: Record<string, true> = {};
  for (const r of rows) {
    for (const k of Object.keys(r || {})) {
      headerMap[k] = true;
    }
  }
  const headers = Object.keys(headerMap);

  const lines: string[] = [];
  lines.push(headers.map(csvEscape).join(","));

  for (const r of rows) {
    lines.push(headers.map((h) => csvEscape((r as any)?.[h])).join(","));
  }

  downloadText(filename, lines.join("\n"), "text/csv;charset=utf-8");
}

export function openPrintWindow(title: string, htmlBody: string) {
  const w = window.open(
    "",
    "_blank",
    "noopener,noreferrer,width=900,height=700",
  );
  if (!w) return;

  w.document.open();
  w.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto; padding: 24px; }
          h1 { margin: 0 0 8px; font-size: 20px; }
          p { margin: 0 0 16px; color: #555; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; text-align: left; }
          th { background: #f6f6f6; }
          .muted { color: #777; font-size: 12px; }
        </style>
      </head>
      <body>
        ${htmlBody}
        <script>
          window.onload = () => { window.print(); };
        </script>
      </body>
    </html>
  `);
  w.document.close();
}
