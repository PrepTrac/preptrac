export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) return;

  const allHeaders = [
    'id', 'name', 'description', 'quantity', 'unit',
    'category', 'location', 'expirationDate',
    'maintenanceInterval', 'lastMaintenanceDate',
    'rotationSchedule', 'lastRotationDate', 'notes', 'minQuantity'
  ];

  const csvRows = [];
  csvRows.push(allHeaders.join(','));

  for (const row of data) {
    const values = allHeaders.map(header => {
      let val = '';
      if (header === 'category') {
        val = row.category?.name || '';
      } else if (header === 'location') {
        val = row.location?.name || '';
      } else {
        val = (row as any)[header] ?? '';
      }

      const escaped = ('' + val).replace(/"/g, '""');
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
