"use client";

import { useState, useEffect } from "react";
import { generateQRCode } from "~/utils/qrcode";
import { X } from "lucide-react";

interface QRCodeDisplayProps {
  data: string;
  title?: string;
  onClose?: () => void;
}

export default function QRCodeDisplay({ data, title, onClose }: QRCodeDisplayProps) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateQRCode(data)
      .then((code) => {
        setQrCode(code);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to generate QR code:", error);
        setLoading(false);
      });
  }, [data]);

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="text-gray-500 dark:text-gray-400">Generating QR code...</div>
      </div>
    );
  }

  if (!qrCode) {
    return (
      <div className="p-4 text-center">
        <div className="text-red-500">Failed to generate QR code</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      {onClose && (
        <div className="flex justify-between items-center mb-4">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
      <div className="flex justify-center">
        <img src={qrCode} alt="QR Code" className="max-w-full h-auto" />
      </div>
      <p className="mt-4 text-sm text-center text-gray-500 dark:text-gray-400">
        Scan with your phone to view details
      </p>
    </div>
  );
}

