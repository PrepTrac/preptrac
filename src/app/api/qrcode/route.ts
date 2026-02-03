import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const data = searchParams.get("data");

  if (!data) {
    return NextResponse.json({ error: "Data parameter is required" }, { status: 400 });
  }

  try {
    const qrDataUrl = await QRCode.toDataURL(data, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });
    return NextResponse.json({ qrCode: qrDataUrl });
  } catch (error) {
    console.error("Error generating QR code:", error);
    return NextResponse.json({ error: "Failed to generate QR code" }, { status: 500 });
  }
}

