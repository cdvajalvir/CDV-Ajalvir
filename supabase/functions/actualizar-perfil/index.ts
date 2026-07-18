import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUsuario } from "../_shared/auth.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods":
        "GET, POST, PATCH, OPTIONS",
};

Deno.serve(async (req) => {

    if (req.method === "OPTIONS") {
        return new Response("ok", {
            headers: corsHeaders
        });
    }

    try {

        const { user } = await getUsuario(req);

        console.log("USER: ", user);
        console.log("USER ID: ", user?.id);

        const {
            nombre,
            apellido,
            alias,
            telefono,
            email,
            fecha_nacimiento,
            talla,
            numero
        } = await req.json();

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL"),
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
        );

        const emailNormalizado =
            email?.trim().toLowerCase();

        // Si cambia el email comprobar que no exista

        if (emailNormalizado) {

            const { data: existente } = await supabase
                .from("socios")
                .select("id")
                .eq("email", emailNormalizado)
                .neq("id", user.id)
                .maybeSingle();

            if (existente) {
                return Response.json(
                    {
                        error: "Ese email ya está registrado"
                    },
                    {
                        status: 400,
                        headers: corsHeaders
                    }
                );
            }
        }

        // Actualizar tabla socios
        const { error } = await supabase
            .from("socios")
            .update({
                nombre,
                apellido,
                alias,
                telefono,
                email: emailNormalizado,
                fecha_nacimiento,
                talla,
                numero
            })
            .eq("id", user.id);

        if (error) {
            throw error;
        }

        // Actualizar email en Auth
        if (emailNormalizado) {
            await supabase.auth.admin.updateUserById(
                user.id,
                {
                    email: emailNormalizado,
                    email_confirm: true
                }
            );
        }

        return Response.json(
            {
                mensaje: "Perfil actualizado"
            },
            {
                headers: corsHeaders
            }
        );

    }
    catch (error) {

        return Response.json(
            {
                error: error.message
            },
            {
                status: 500,
                headers: corsHeaders
            }
        );
    }
});
