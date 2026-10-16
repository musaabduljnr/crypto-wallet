import { NextResponse } from "next/server";
import { config } from "@/lib/config/env";

export async function GET() {
  const uptimeSeconds = Math.floor(process.uptime());

  return NextResponse.json(
    {
      status: "UP",
      timestamp: new Date().toISOString(),
      environment: config.appEnv,
      uptimeSeconds,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
