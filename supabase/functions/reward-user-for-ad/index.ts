import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Define CORS headers for security
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const POINTS_TO_AWARD = 5;
const REASON_FOR_REWARD = 'Vio un anuncio recompensado';

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the user's authentication context
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Get the user from the request
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError) throw userError;
    if (!user) throw new Error('User not found. A user must be logged in to be rewarded.');

    // In a production app, this logic should be wrapped in a database transaction
    // using an RPC function to ensure atomicity (all or nothing).
    // For simplicity here, we perform the steps sequentially.

    // 1. Get the user's current point balance
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('points')
      .eq('id', user.id)
      .single()

    if (profileError) throw profileError;

    // 2. Calculate new points and update the profile
    const newPoints = profile.points + POINTS_TO_AWARD;
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ points: newPoints })
      .eq('id', user.id)

    if (updateError) throw updateError;

    // 3. Log the transaction for record-keeping
    const { error: transactionError } = await supabaseClient
      .from('points_transactions')
      .insert({ user_id: user.id, amount: POINTS_TO_AWARD, description: REASON_FOR_REWARD })

    if (transactionError) throw transactionError;

    // Return a success response
    return new Response(JSON.stringify({ message: `Successfully awarded ${POINTS_TO_AWARD} points.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    // Return an error response if anything went wrong
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
