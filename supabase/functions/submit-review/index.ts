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
    const { productId, rating, comment, commentType } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error("Usuario no autenticado.");

    const { data: ownedAsset, error: ownedAssetError } = await supabase
      .from('user_owned_assets')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .maybeSingle();

    if (ownedAssetError) throw ownedAssetError;
    if (!ownedAsset) throw new Error("No puedes calificar un producto que no has adquirido.");

    if (rating !== null && rating >= 1 && rating <= 5) {
      const { error: ratingError } = await supabase
        .from('ratings')
        .upsert(
          {
            product_id: productId,
            user_id: user.id,
            rating: rating,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id,product_id' }
        );
      if (ratingError) throw ratingError;
    }

    if (comment && comment.trim() !== '') {
        const { error: commentError } = await supabase
            .from('comments')
            .insert({
                product_id: productId,
                user_id: user.id,
                content: comment,
                comment_type: commentType
            });
        if (commentError) throw commentError;
    }

    return new Response(JSON.stringify({ message: "¡Gracias por tu reseña!" }), {
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
