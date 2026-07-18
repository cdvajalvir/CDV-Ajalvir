import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validarDocumento } from "../_shared/validaciones.js";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
    if(req.method === "OPTIONS"){
        return new Response("ok", {
            headers: {
                ...corsHeaders,
                "Access-Control-Allow-Methods": "POST, OPTIONS"
            }
        });
    }

    try {
        const {
            nombre,
            apellido,
            dni,
            email,
            telefono,
            password
        } = await req.json();

        // Validar campos
        if (!nombre || !apellido || !dni || !email || !telefono || !password) {
            return Response.json(
                { error: "Faltan campos obligatorios" },
                {
                    status: 400,
                    headers: corsHeaders
                }
            );
        }

        // Normalizar DNI/NIE
        const documento = dni.trim().toUpperCase();

        // Validar documento
        if (!validarDocumento(documento)) {
            return Response.json(
                {
                    error: "El DNI o NIE no es válido"
                },
                {
                    status: 400,
                    headers: corsHeaders
                }
            );
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL"),
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
        );

        // comprobar DNI existente
        const { data: existente } = await supabase
            .from("socios")
            .select("id")
            .eq("dni", documento)
            .maybeSingle();

        if(existente){
            return Response.json(
                {
                    error:"El DNI ya está registrado"
                },
                {
                    status:400,
                    headers:corsHeaders
                }
            );
        }

        // Normalizar email
        const emailNorm = email.trim().toLowerCase();

        // comprobar email existente
        const { data: emailExistente } = await supabase
            .from("socios")
            .select("id")
            .eq("email", emailNorm)
            .maybeSingle();

        if(emailExistente){
            return Response.json(
                {
                    error:"El email ya está registrado"
                },
                {
                    status:400,
                    headers:corsHeaders
                }
            );
        }

        // Crear el usuario en Auth
        const { data: authData, error: authError } =
            await supabase.auth.admin.createUser({
                email: emailNorm,
                password,
                email_confirm: true
            });

        if (authError) {
            return Response.json(
                { error: authError.message },
                {
                    status: 400,
                    headers: corsHeaders
                }
            );
        }


        // crear socio
        const { error } = await supabase
            .from("socios")
            .insert({
                id : authData.user.id,
                nombre,
                apellido,
                dni: documento,
                email: emailNorm,
                telefono,
                rol:"socio",
                activo:false
            });

        if(error){
            await supabase.auth.admin.deleteUser(authData.user.id).catch(console.error);
            throw error;
        }

        return Response.json(
            {
                mensaje:
                "Solicitud enviada correctamente"
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