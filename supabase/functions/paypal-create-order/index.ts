import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// NOTE: These environment variables would be set in the Supabase dashboard
const PAYPAL_CLIENT_ID = Deno.env.get("AVVdd3tZvuJhi1UZpIMGvHBKg-zHb8R3HN7Yl2VKj8GDoO3_XwH1ZHQkUuxu8S_kvsmhTOJ36U4BNxZF");
const PAYPAL_CLIENT_SECRET = Deno.env.get("ELvPlyjGtJ3CwnodQXkmHMm2NKztfE3fm_hKNEjTx83Dr_UA-igSSsqcPLBpOVqSc6znP5rdv3brdOCe");
const SUPABASE_URL = Deno.env.get("https://tladrluezsmmhjbhupgb.supabase.co");
const SUPABASE_SERVICE_KEY = Deno.env.get("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsYWRybHVlenNtbWhqYmh1cGdiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTQyNjk2NCwiZXhwIjoyMDcxMDAyOTY0fQ.GtJCXxiVl1H2vMmnKa7TF6NY8lysOk2JE6veKZMDD2o");


const PAYPAL_API_BASE = "https://api-m.sandbox.paypal.com"; // Sandbox URL

// Function to get PayPal access token
async function getPayPalAccessToken() {
  const auth = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`);
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${auth}`,
    },
    body: "grant_type=client_credentials",
  });
  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  try {
    const { productId } = await req.json();

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 1. Fetch product price from our database
    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("price")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      throw new Error("Product not found.");
    }

    // 2. Get PayPal Access Token
    const accessToken = await getPayPalAccessToken();

    // 3. Create a PayPal order
    const orderPayload = {
      intent: "CAPTURE",
      purchase_units: [{
        amount: {
          currency_code: "USD",
          value: product.price.toFixed(2),
        },
      }],
    };

    const orderResponse = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(orderPayload),
    });

    const orderData = await orderResponse.json();

    if (orderData.id) {
      return new Response(JSON.stringify({ orderID: orderData.id }), {
        headers: { "Content-Type": "application/json" },
      });
    } else {
      throw new Error(orderData.message || "Failed to create PayPal order.");
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
