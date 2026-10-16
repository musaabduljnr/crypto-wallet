import { NextRequest, NextResponse } from "next/server";
import { depositService } from "@/lib/services/deposit.service";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-fireblocks-signature") || req.headers.get("x-custody-signature") || "";
    const rawBody = await req.text();

    if (!rawBody) {
      return NextResponse.json({ error: "Empty request body" }, { status: 400 });
    }

    const result = await depositService.processDepositWebhook(rawBody, signature);
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    logger.error("Custody webhook processing error", {
      message: err.message,
      code: err.code,
    });

    if (err.statusCode === 401 || err.code === "UNAUTHORIZED_WEBHOOK") {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    if (err.statusCode === 400 || err.code === "MALFORMED_WEBHOOK") {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Internal processing error" }, { status: 500 });
  }
}
