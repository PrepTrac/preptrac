import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Lightweight health probe used by the Docker HEALTHCHECK and Coolify.
 * Returns 200 when the Node process is serving HTTP. It deliberately does not
 * touch the database so a transient DB hiccup does not flap the container
 * health status.
 */
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
