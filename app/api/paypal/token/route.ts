import { NextResponse } from "next/server";
import { getPayPalAccessToken } from "@/lib/paypal";

export const runtime = "nodejs";

export async function POST() {
  try {
    const accessToken = await getPayPalAccessToken();
    return NextResponse.json({ success: true, accessToken });
  } catch (error) {
    console.error("PayPal token error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to authenticate with PayPal." },
      { status: 500 }
    );
  }
}
