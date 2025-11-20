import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { commentId, voteType } = await req.json()

    const allowedVoteTypes = ['upvote', 'downvote', 'support'];
    if (!allowedVoteTypes.includes(voteType)) {
        throw new Error("Tipo de voto no válido.");
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error("Debes iniciar sesión para votar.");

    const { error: voteError } = await supabase
      .from('comment_votes')
      .upsert(
        {
          comment_id: commentId,
          user_id: user.id,
          vote_type: voteType
        },
        { onConflict: 'user_id,comment_id' }
      );

    if (voteError) throw voteError;

    return new Response(JSON.stringify({ message: "¡Voto registrado!" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
