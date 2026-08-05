"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

/**
 * Global error boundary (Next.js App Router convention). Replaces the entire
 * document (including <html>/<body>) when a root-level error escapes the normal
 * error boundary. Must render its own <html>/<body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          backgroundColor: "#f9fafb",
          color: "#111827",
          fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        <main
          role="alert"
          style={{
            maxWidth: "28rem",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            alignItems: "center",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              height: "3rem",
              width: "3rem",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "0.5rem",
              backgroundColor: "#2563eb",
              color: "#fff",
            }}
          >
            <AlertTriangle width={26} height={26} aria-hidden="true" />
          </span>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
              PrepTrac hit an unexpected error
            </h1>
            <p style={{ marginTop: "0.5rem", color: "#4b5563", fontSize: "0.875rem" }}>
              The application couldn’t start. You can try reloading — your data is
              safe.
            </p>
          </div>
          <button
            type="button"
            onClick={reset}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              borderRadius: "0.375rem",
              border: "1px solid transparent",
              backgroundColor: "#2563eb",
              color: "#fff",
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <RotateCcw width={16} height={16} aria-hidden="true" />
            Try again
          </button>
          {error?.digest && (
            <p style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "#9ca3af" }}>
              Reference: {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
