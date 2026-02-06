/** Parse a single CSV line with quoted fields ("" for escaped quote). */
export function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      let field = "";
      i++;
      while (i < line.length) {
        if (line[i] === '"') {
          i++;
          if (line[i] === '"') {
            field += '"';
            i++;
          } else {
            break;
          }
        } else {
          field += line[i];
          i++;
        }
      }
      out.push(field);
      if (line[i] === ",") i++;
    } else {
      let field = "";
      while (i < line.length && line[i] !== ",") {
        field += line[i];
        i++;
      }
      out.push(field.trim());
      if (line[i] === ",") i++;
    }
  }
  return out;
}

/** Parse CSV string into array of row objects (first row = headers). */
export function parseCSV(csvContent: string): Record<string, string>[] {
  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]!);
  const rows: Record<string, string>[] = [];
  for (let r = 1; r < lines.length; r++) {
    const values = parseCSVLine(lines[r]!);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    rows.push(row);
  }
  return rows;
}
