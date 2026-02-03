import QRCode from "qrcode";

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

export async function generateQRCodeForItem(itemId: string, itemName: string): Promise<string> {
  const data = JSON.stringify({
    type: "item",
    id: itemId,
    name: itemName,
    url: `${typeof window !== "undefined" ? window.location.origin : ""}/items/${itemId}`,
  });
  return generateQRCode(data);
}

export async function generateQRCodeForLocation(locationId: string, locationName: string): Promise<string> {
  const data = JSON.stringify({
    type: "location",
    id: locationId,
    name: locationName,
    url: `${typeof window !== "undefined" ? window.location.origin : ""}/locations/${locationId}`,
  });
  return generateQRCode(data);
}

