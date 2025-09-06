import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// NOTE: These environment variables would be set in the Supabase dashboard
const PAYPAL_CLIENT_ID = Deno.env.get("AVVdd3tZvuJhi1UZpIMGvHBKg-zHb8R3HN7Yl2VKj8GDoO3_XwH1ZHQkUuxu8S_kvsmhTOJ36U4BNxZF");
const PAYPAL_CLIENT_SECRET = Deno.env.get("ELvPlyjGtJ3CwnodQXkmHMm2NKztfE3fm_hKNEjTx83Dr_UA-igSSsqcPLBpOVqSc6znP5rdv3brdOCe");
const SUPABASE_URL = Deno.env.get("https://tladrluezsmmhjbhupgb.supabase.co");
const SUPABASE_SERVICE_KEY = Deno.env.get("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsYWRybHVlenNtbWhqYmh1cGdiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTQyNjk2NCwiZXhwIjoyMDcxMDAyOTY0fQ.GtJCXxiVl1H2vMmnKa7TF6NY8lysOk2JE6veKZMDD2o");

const PAYPAL_API_BASE = "https://api-m.sandbox.paypal.com";

async function getPayPalAccessToken() {
  const auth = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`);
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Authorization": `Basic ${auth}` },
    body: "grant_type=client_credentials",
  });
  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  try {
    const { orderID, productId } = await req.json();
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get user from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");
    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) throw new Error("Invalid user token");

    // 1. Capture the PayPal order
    const accessToken = await getPayPalAccessToken();
    const captureResponse = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderID}/capture`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` },
    });
    const captureData = await captureResponse.json();

    if (captureData.status !== "COMPLETED") {
      throw new Error("Payment not completed.");
    }

    // 2. Payment is successful, now update our database
    const saleAmount = parseFloat(captureData.purchase_units[0].payments.captures[0].amount.value);

    // 2a. Record the sale in a 'sales' table
    const { error: saleError } = await supabaseAdmin.from("sales").insert({
      product_id: productId,
      buyer_id: user.id,
      sale_price: saleAmount,
      paypal_order_id: orderID,
    });
    if (saleError) throw new Error(`Failed to record sale: ${saleError.message}`);

    // 2b. Grant asset ownership to the user
    const { error: ownershipError } = await supabaseAdmin.from("user_owned_assets").insert({
      user_id: user.id,
      product_id: productId,
      purchase_price: saleAmount,
    });
    if (ownershipError) throw new Error(`Failed to grant asset ownership: ${ownershipError.message}`);

    return new Response(JSON.stringify({ message: "Purchase successful!" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
