import { NextResponse } from "next/server";
import { getPayPalAccessToken, getPayPalBaseUrl } from "@/lib/paypal";

export const runtime = "nodejs";

type CreateOrderPayload = {
  amount?: number;
  currency?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateOrderPayload;
    const amount = typeof body.amount === "number" ? body.amount : 0;
    const currency = body.currency?.toUpperCase() || "PHP";

    if (amount <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid payment amount." },
        { status: 400 }
      );
    }

    const accessToken = await getPayPalAccessToken();

    const response = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: currency,
              value: amount.toFixed(2),
            },
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok || !data?.id) {
      const details = data?.details?.[0]?.issue || "paypal_create_failed";
      const message = data?.message || "Failed to create PayPal order.";
      return NextResponse.json(
        { success: false, message, issue: details },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, orderId: data.id });
  } catch (error) {
    console.error("PayPal create order error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create PayPal order." },
      { status: 500 }
    );
  }
}
