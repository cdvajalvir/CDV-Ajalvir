import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUsuario } from "../_shared/auth.ts";
import { getPerfil } from "../_shared/perfil.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", {
            headers: corsHeaders
        });
    }

    try {
        const authHeader = req.headers.get("Authorization");

        if (!authHeader) {
            return Response.json(
                {
                    error: "No autorizado"
                },
                {
                    status: 401,
                    headers: corsHeaders
                }
            );
        }

        const user = await getUsuario(req);

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL"),
            Deno.env.get("SUPABASE_ANON_KEY"),
            {
                global: {
                    headers: {
                        Authorization: authHeader
                    }
                }
            }
        );

        const socio = getPerfil(supabase, user.id);

        return Response.json(
            socio,
            {
                headers: corsHeaders
            }
        );


    } catch(error) {
        return Response.json(
            {
                error: error.message
            },
            {
                status:401,
                headers:corsHeaders
            }
        );
    }
});
