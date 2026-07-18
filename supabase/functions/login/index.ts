import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
    // Respuesta al preflight OPTIONS
    if (req.method === "OPTIONS") {
        return new Response(
            "ok",
            {
                headers: corsHeaders
            }
        );
    }

    try {
        const { dni } = await req.json();
        const documento = (dni ?? "").trim().toUpperCase();

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL"),
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
        );

        const { data: socio, error } = await supabase
            .from("socios")
            .select(`
                email,
                activo,
                rol
            `)
            .eq("dni", documento)
            .single();

        if(error || !socio){
            return Response.json(
                {
                    error:"Usuario no encontrado"
                },
                {
                    status:401,
                    headers:corsHeaders
                }
            );
        }

        return Response.json(
            {
                email: socio.email
            },
            {
                headers:corsHeaders
            }
        );


    } catch(error){

        return Response.json(
            {
                error:error.message
            },
            {
                status:500,
                headers:corsHeaders
            }
        );

    }

});