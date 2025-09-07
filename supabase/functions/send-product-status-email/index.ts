import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend";

// NOTE: These environment variables would be set in the Supabase dashboard
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_KEY");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Get data from request body
    const { productId, status, reason } = await req.json();

    // 2. Initialize clients
    const resend = new Resend(RESEND_API_KEY);
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 3. Fetch product and seller email
    const { data: productData, error: productError } = await supabaseAdmin
      .from("products")
      .select(`
        name,
        profiles (
          email
        )
      `)
      .eq("id", productId)
      .single();

    if (productError) {
      throw new Error(`Error fetching product: ${productError.message}`);
    }

    const sellerEmail = productData.profiles.email;
    const productName = productData.name;

    if (!sellerEmail) {
      throw new Error(`Seller email not found for product ID ${productId}`);
    }

    // 4. Construct email subject and body
    let subject = "";
    let htmlBody = "";

    if (status === "approved") {
      subject = `¡Tu producto "${productName}" ha sido aprobado!`;
      htmlBody = `
        <h1>¡Felicidades!</h1>
        <p>Tu producto, <strong>${productName}</strong>, ha sido aprobado y ya está visible en la Creative Engine Asset Store.</p>
        <p>¡Gracias por tu contribución!</p>
      `;
    } else if (status === "rejected") {
      subject = `Actualización sobre tu producto "${productName}"`;
      htmlBody = `
        <h1>Actualización de tu Producto</h1>
        <p>Hemos revisado tu producto, <strong>${productName}</strong>, y hemos decidido no aprobarlo en este momento.</p>
        <p><strong>Motivo del rechazo:</strong></p>
        <p><em>${reason || "No se ha especificado un motivo."}</em></p>
        <p>Puedes realizar los cambios necesarios y volver a subir tu producto para una nueva revisión desde tu panel de vendedor.</p>
      `;
    } else if (status === "edited") {
        subject = `Tu producto "${productName}" ha sido editado por un administrador`;
        htmlBody = `<h1>Producto Editado</h1><p>Un administrador ha realizado cambios en tu producto, <strong>${productName}</strong>. Por favor, revisa los cambios en tu panel.</p>`;
    } else if (status === "suspended") {
        subject = `Tu producto "${productName}" ha sido suspendido`;
        htmlBody = `<h1>Producto Suspendido</h1><p>Tu producto, <strong>${productName}</strong>, ha sido suspendido temporalmente y no está visible en la tienda. Contacta con soporte para más información.</p>`;
    } else if (status === "unsuspended") {
        subject = `Tu producto "${productName}" ha sido rehabilitado`;
        htmlBody = `<h1>Producto Rehabilitado</h1><p>Tu producto, <strong>${productName}</strong>, ha sido rehabilitado y vuelve a estar visible en la tienda.</p>`;
    } else if (status === "deleted") {
        subject = `Tu producto "${productName}" ha sido eliminado`;
        htmlBody = `<h1>Producto Eliminado</h1><p>Tu producto, <strong>${productName}</strong>, ha sido eliminado de la tienda por un administrador.</p>`;
    } else {
      throw new Error("Invalid status provided.");
    }

    // 5. Send the email
    await resend.emails.send({
      from: "noreply@creativeengineassetstore.com", // This should be a verified domain in Resend
      to: sellerEmail,
      subject: subject,
      html: htmlBody,
    });

    return new Response(JSON.stringify({ message: "Email sent successfully." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
