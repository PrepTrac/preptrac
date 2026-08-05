import QRCode from "qrcode";

/**
 * Generate a QR code as a data URL (base64 PNG).
 *
 * Single canonical QR generator for the app. Used by both the client
 * (`QRCodeDisplay`) and the server QR route (`/api/qrcode`), so it stays free
 * of server-only imports (logging etc.) and reports failures by throwing.
 */
export async function generateQRCode(data: string): Promise<string> {
  try {
    const qrDataUrl = await QRCode.toDataURL(data, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });
    return qrDataUrl;
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw error;
  }
}
