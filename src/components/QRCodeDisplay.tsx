"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
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
        <div className="text-muted">Generating QR code...</div>
      </div>
    );
  }

  if (!qrCode) {
    return (
      <div className="p-4 text-center">
        <div className="text-danger">Failed to generate QR code</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-raised rounded-[3px] shadow-lg">
      {onClose && (
        <div className="flex justify-between items-center mb-4">
          {title && (
            <h3 className="text-lg font-semibold text-ink">
              {title}
            </h3>
          )}
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-muted hover:text-muted dark:hover:text-muted rounded-[3px] p-1 -mr-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      )}
      <div className="flex justify-center">
        <Image
          src={qrCode}
          alt="QR Code"
          width={300}
          height={300}
          className="max-w-full h-auto"
          unoptimized
        />
      </div>
      <p className="mt-4 text-sm text-center text-muted">
        Scan with your phone to view details
      </p>
    </div>
  );
}

