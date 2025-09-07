import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// NOTE: These environment variables should be set in your Supabase project dashboard
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_KEY");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Workaround for potential missing Content-Type header
    const bodyText = await req.text();
    const { code } = JSON.parse(bodyText || "{}");

    if (!code) {
      throw new Error("Developer code is required in the request body.");
    }

    // Create a Supabase client with the service role key to bypass RLS
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Check if the developer code exists in the 'dev_codes' table
    const { data, error } = await supabaseAdmin
      .from("dev_codes")
      .select("code")
      .eq("code", code)
      .single();

    if (error) {
      // If .single() returns an error, it means the code was not found (or another DB error occurred)
      console.error("Developer code verification error:", error.message);
      return new Response(JSON.stringify({ isValid: false, message: "Code not found or database error." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200, // Return 200 OK but with isValid: false
      });
    }

    // If data is not null, the code is valid
    return new Response(JSON.stringify({ isValid: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: `Failed to process request: ${error.message}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
