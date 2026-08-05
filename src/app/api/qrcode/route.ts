import { NextRequest, NextResponse } from "next/server";
import { generateQRCode } from "~/utils/qrcode";
import { logger } from "~/server/logger";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const data = searchParams.get("data");

  if (!data) {
    return NextResponse.json({ error: "Data parameter is required" }, { status: 400 });
  }

  try {
    const qrDataUrl = await generateQRCode(data);
    return NextResponse.json({ qrCode: qrDataUrl });
  } catch (error) {
    logger.error("Failed to generate QR code", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Failed to generate QR code" }, { status: 500 });
  }
}
