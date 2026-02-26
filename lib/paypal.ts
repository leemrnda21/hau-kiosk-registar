type PayPalEnv = "sandbox" | "live";

const normalizeEnv = (value?: string | null): PayPalEnv => {
  return value?.toLowerCase() === "live" ? "live" : "sandbox";
};

export const getPayPalBaseUrl = () => {
  const env = normalizeEnv(process.env.PAYPAL_ENV);
  return env === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
};

export const getPayPalCredentials = () => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials are not configured.");
  }

  return { clientId, clientSecret };
};

export const getPayPalAccessToken = async () => {
  const { clientId, clientSecret } = getPayPalCredentials();
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await response.json();

  if (!response.ok || !data?.access_token) {
    throw new Error("Failed to authenticate with PayPal.");
  }

  return data.access_token as string;
};
