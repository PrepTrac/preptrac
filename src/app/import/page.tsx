"use client";

import { api } from "~/utils/api";
import { useState, useRef } from "react";
import Navigation from "~/components/Navigation";
import { Download, Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import { downloadCSVTemplate } from "~/utils/export";

export default function ImportPage() {
  const [result, setResult] = useState<{ created: number; errors: { row: number; message: string }[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importMutation = api.items.importFromCSV.useMutation({
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (err) => {
      setResult({ created: 0, errors: [{ row: 0, message: err.message }] });
    },
  });

  const handleTemplateDownload = () => {
    downloadCSVTemplate();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === "string") {
        importMutation.mutate({ csvContent: text });
      }
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Import inventory
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Download the template, fill in your items (name, unit, category, and location are required), then upload the CSV here.
        </p>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleTemplateDownload}
              className="inline-flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Download className="h-5 w-5 mr-2" />
              Download template
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              aria-label="Choose CSV file"
            />
            <button
              type="button"
              onClick={handleUploadClick}
              disabled={importMutation.isPending}
              className="inline-flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="h-5 w-5 mr-2" />
              {importMutation.isPending ? "Importing…" : "Upload CSV"}
            </button>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 flex-shrink-0" />
            Use the same category and location names as in your Settings. You can also use categoryId and locationId from an export.
          </p>
        </div>

        {result && (
          <div className="mt-8 p-4 rounded-lg bg-white dark:bg-gray-800 shadow border border-gray-200 dark:border-gray-700">
            <p className="font-medium text-gray-900 dark:text-white mb-2">
              {result.created} item{result.created !== 1 ? "s" : ""} created.
            </p>
            {result.errors.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400 flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4" />
                  Row errors
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1 list-disc list-inside">
                  {result.errors.map((e, i) => (
                    <li key={i}>
                      Row {e.row}: {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
