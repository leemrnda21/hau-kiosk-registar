import { NextResponse } from "next/server";
import { getPayPalAccessToken, getPayPalBaseUrl } from "@/lib/paypal";

export const runtime = "nodejs";

type CaptureOrderPayload = {
  orderId?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CaptureOrderPayload;
    const orderId = body.orderId?.trim();

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: "Missing PayPal order id." },
        { status: 400 }
      );
    }

    const accessToken = await getPayPalAccessToken();

    const response = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      const details = data?.details?.[0]?.issue || "paypal_capture_failed";
      const message = data?.message || "Failed to capture PayPal order.";
      return NextResponse.json(
        { success: false, message, issue: details },
        { status: 502 }
      );
    }

    const capture = data?.purchase_units?.[0]?.payments?.captures?.[0];
    const status = capture?.status || data?.status || "UNKNOWN";

    if (status !== "COMPLETED") {
      return NextResponse.json(
        { success: false, message: "Payment not completed.", status },
        { status: 402 }
      );
    }

    return NextResponse.json({
      success: true,
      status,
      captureId: capture?.id || null,
      payerId: data?.payer?.payer_id || null,
    });
  } catch (error) {
    console.error("PayPal capture error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to capture PayPal order." },
      { status: 500 }
    );
  }
}
