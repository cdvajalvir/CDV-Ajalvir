import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUsuario } from "../_shared/auth.ts";
import { getPerfil } from "../_shared/perfil.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", {
            headers: corsHeaders
        });
    }

    try {
        // 1. Desestructurar 'user' y 'error' de la respuesta de getUsuario
        const { user, error: authError } = await getUsuario(req);

        if (authError || !user) {
            return Response.json(
                { error: authError || "No autorizado" },
                {
                    status: 401,
                    headers: corsHeaders
                }
            );
        }

        // 2. Instanciar el cliente usando SERVICE_ROLE para consultar la tabla socios sin bloqueos RLS
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        // 3. Pasar user.id correctamente a getPerfil
        const perfil = await getPerfil(supabase, user.id);

        if (!perfil) {
            return Response.json(
                { error: "No se encontró el perfil del usuario" },
                {
                    status: 404,
                    headers: corsHeaders
                }
            );
        }

        return Response.json(
            perfil,
            {
                status: 200,
                headers: corsHeaders
            }
        );

    } catch (error: any) {
        console.error("Error en /perfil:", error);
        return Response.json(
            {
                error: error?.message || "Error interno del servidor"
            },
            {
                status: 500,
                headers: corsHeaders
            }
        );
    }
});
