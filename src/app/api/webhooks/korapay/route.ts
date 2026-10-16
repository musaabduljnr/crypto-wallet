import { NextRequest, NextResponse } from "next/server";
import { fundingService } from "@/lib/services/funding.service";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-korapay-signature") || req.headers.get("korapay-signature") || "";
    const rawBody = await req.text();

    if (!rawBody) {
      return NextResponse.json({ error: "Empty request body" }, { status: 400 });
    }

    const result = await fundingService.processFundingWebhook(rawBody, signature);
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    logger.error("Korapay webhook processing error", {
      message: err.message,
      code: err.code,
    });

    if (err.statusCode === 401 || err.code === "UNAUTHORIZED_WEBHOOK") {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    if (err.statusCode === 400 || err.code === "MALFORMED_WEBHOOK") {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    // Return 500 for retryable upstream errors
    return NextResponse.json({ error: "Internal processing error" }, { status: 500 });
  }
}
