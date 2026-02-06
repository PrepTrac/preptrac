/** CSV column order for export/import. category/location are relation names (export) or names to match (import). */
export const CSV_HEADERS = [
  "id",
  "name",
  "description",
  "quantity",
  "unit",
  "categoryId",
  "category",
  "locationId",
  "location",
  "expirationDate",
  "maintenanceInterval",
  "lastMaintenanceDate",
  "rotationSchedule",
  "lastRotationDate",
  "notes",
  "imageUrl",
  "qrCode",
  "minQuantity",
  "targetQuantity",
  "caloriesPerUnit",
  "createdAt",
  "updatedAt",
] as const;

/** Download an empty CSV with headers only for users to fill in and import. */
export function downloadCSVTemplate() {
  const headerRow = CSV_HEADERS.map((h) => `"${h}"`).join(",");
  const csvContent = headerRow + "\n";
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "preptrac-import-template.csv");
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) return;

  const csvRows: string[] = [];
  csvRows.push(CSV_HEADERS.join(','));

  for (const row of data) {
    const values = CSV_HEADERS.map((header) => {
      let val: unknown = '';
      if (header === 'category') {
        val = (row as any).category?.name ?? '';
      } else if (header === 'location') {
        val = (row as any).location?.name ?? '';
      } else {
        val = (row as any)[header] ?? '';
      }
      const str = val instanceof Date ? val.toISOString() : String(val ?? '');
      const escaped = str.replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToJSON(data: any[], filename: string) {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
