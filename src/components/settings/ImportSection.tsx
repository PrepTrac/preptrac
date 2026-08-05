"use client";

import { useRef, useState } from "react";
import { api } from "~/utils/api";
import { downloadCSVTemplate } from "~/utils/export";
import { Download, Upload, FileSpreadsheet, AlertCircle } from "lucide-react";

/**
 * CSV inventory import (Settings → Import). Owns the file read + the
 * `importFromCSV` mutation and result rendering.
 */
export default function ImportSection() {
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<{
    created: number;
    errors: { row: number; message: string }[];
  } | null>(null);

  const importFromCSV = api.items.importFromCSV.useMutation({
    onSuccess: (data) => setImportResult(data),
    onError: (err) => setImportResult({ created: 0, errors: [{ row: 0, message: err.message }] }),
  });

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
        Import inventory from CSV
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Download the template, fill in your items (name, unit, category, and location are required), then upload the CSV here.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => downloadCSVTemplate()}
          className="inline-flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <Download className="h-5 w-5 mr-2" />
          Download template
        </button>
        <input
          ref={importFileInputRef}
          type="file"
          accept=".csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setImportResult(null);
            const reader = new FileReader();
            reader.onload = (ev) => {
              const text = ev.target?.result;
              if (typeof text === "string") importFromCSV.mutate({ csvContent: text });
            };
            reader.readAsText(file, "UTF-8");
            e.target.value = "";
          }}
          className="hidden"
          aria-label="Choose CSV file"
        />
        <button
          type="button"
          onClick={() => importFileInputRef.current?.click()}
          disabled={importFromCSV.isPending}
          className="inline-flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload className="h-5 w-5 mr-2" />
          {importFromCSV.isPending ? "Importing…" : "Upload CSV"}
        </button>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
        <FileSpreadsheet className="h-4 w-4 flex-shrink-0" />
        Use the same category and location names as in Settings. Use simple dates like 1/1/2026 for expiration and maintenance fields.
      </p>
      {importResult && (
        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <p className="font-medium text-gray-900 dark:text-white mb-2">
            {importResult.created} item{importResult.created !== 1 ? "s" : ""} created.
          </p>
          {importResult.errors.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400 flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4" />
                Row errors
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1 list-disc list-inside">
                {importResult.errors.map((e, i) => (
                  <li key={i}>
                    Row {e.row}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
