import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// NOTE: These environment variables would be set in the Supabase dashboard
const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID");
const PAYPAL_CLIENT_SECRET = Deno.env.get("PAYPAL_CLIENT_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const PAYPAL_API_BASE = "https://api-m.sandbox.paypal.com"; // Sandbox URL

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  if (!response.ok) {
    throw new Error(`PayPal auth failed: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { productId } = await req.json();

    const supabaseAdmin = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 1. Fetch product price from our database
    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("price")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      throw new Error(`Product not found or database error: ${productError?.message}`);
    }

    // 2. Get PayPal Access Token
    const accessToken = await getPayPalAccessToken();
    if(!accessToken) {
        throw new Error("Failed to get PayPal access token. Check credentials.");
    }

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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      throw new Error(orderData.message || `Failed to create PayPal order: ${JSON.stringify(orderData)}`);
    }

  } catch (error) {
    // Log the full error to the Supabase function logs for better debugging
    console.error("Error in paypal-create-order:", error);

    // Return a more detailed error message to the client
    return new Response(JSON.stringify({
        error: "A detailed error occurred in the Edge Function.",
        errorMessage: error.message,
        errorStack: error.stack,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
