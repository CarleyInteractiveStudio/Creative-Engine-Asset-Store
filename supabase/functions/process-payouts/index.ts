import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// NOTE: These environment variables would be set in the Supabase dashboard
const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID");
const PAYPAL_CLIENT_SECRET = Deno.env.get("PAYPAL_CLIENT_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_KEY");
const PAYPAL_API_BASE = "https://api-m.sandbox.paypal.com";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 1. Calculate date range for the previous month
    const now = new Date();
    const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // 2. Fetch all sales from the previous month
    const { data: sales, error: salesError } = await supabaseAdmin
      .from("sales")
      .select(`
        sale_price,
        products ( seller_id, profiles ( paypal_email ) )
      `)
      .gte("created_at", firstDayPrevMonth.toISOString())
      .lte("created_at", lastDayPrevMonth.toISOString());

    if (salesError) throw new Error(`Error fetching sales: ${salesError.message}`);
    if (!sales || sales.length === 0) {
      return new Response(JSON.stringify({ message: "No sales to process for the previous month." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 3. Aggregate sales by seller
    const sellerPayouts = new Map();
    for (const sale of sales) {
      const sellerId = sale.products.seller_id;
      if (!sellerId) continue;

      const sellerEmail = sale.products.profiles.paypal_email;
      if (!sellerEmail) continue; // Can't pay without an email

      const currentTotal = sellerPayouts.get(sellerId)?.totalRevenue || 0;
      sellerPayouts.set(sellerId, {
        totalRevenue: currentTotal + sale.sale_price,
        email: sellerEmail,
      });
    }

    // 4. Calculate commissions and create PayPal payout items
    const payoutItems = [];
    for (const [sellerId, data] of sellerPayouts.entries()) {
      let commissionRate = 0.10;
      if (data.totalRevenue > 500) commissionRate = 0.20;
      else if (data.totalRevenue > 100) commissionRate = 0.15;

      const netPayout = data.totalRevenue * (1 - commissionRate);

      if (netPayout > 0) {
        payoutItems.push({
          recipient_type: "EMAIL",
          amount: { value: netPayout.toFixed(2), currency: "USD" },
          receiver: data.email,
          note: `Your Creative Engine Asset Store payout for ${firstDayPrevMonth.toLocaleString('default', { month: 'long' })} ${firstDayPrevMonth.getFullYear()}`,
          sender_item_id: `${sellerId}-${firstDayPrevMonth.toISOString().slice(0, 7)}`,
        });
      }
    }

    if (payoutItems.length === 0) {
      return new Response(JSON.stringify({ message: "No payouts to process after calculations." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 5. Execute PayPal Batch Payout
    const accessToken = await getPayPalAccessToken();
    const batchId = `payout_${Date.now()}`;
    const payoutResponse = await fetch(`${PAYPAL_API_BASE}/v1/payments/payouts`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
            sender_batch_header: {
                sender_batch_id: batchId,
                email_subject: "You have a payout from Creative Engine Asset Store!",
                email_message: "You have received a payout! Thanks for selling with us."
            },
            items: payoutItems
        })
    });

    const payoutData = await payoutResponse.json();
    const payoutBatchId = payoutData.batch_header.payout_batch_id;

    // 6. Log individual payouts to our database
    const payoutLogs = payoutItems.map(item => ({
      // Find the sellerId corresponding to the email
      seller_id: Array.from(sellerPayouts.entries()).find(([_, data]) => data.email === item.receiver)[0],
      amount: parseFloat(item.amount.value),
      period_start: firstDayPrevMonth.toISOString(),
      period_end: lastDayPrevMonth.toISOString(),
      status: 'COMPLETED', // Assuming batch completion for simplicity. A more robust solution would check each item's status.
      paypal_payout_batch_id: payoutBatchId,
    }));

    const { error: logError } = await supabaseAdmin.from("payouts").insert(payoutLogs);
    if (logError) {
        console.error("Critical: Payouts sent but failed to log.", logError);
        // Handle this critical error, e.g., send an alert to the admin
    }

    return new Response(JSON.stringify({ message: "Payouts processed successfully.", batchId: payoutBatchId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
