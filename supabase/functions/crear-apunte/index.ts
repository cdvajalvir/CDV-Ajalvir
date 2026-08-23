import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", {
            headers: {
                ...corsHeaders,
                "Access-Control-Allow-Methods": "POST, OPTIONS"
            }
        });
    }

    try {
        const {
            temporada,
            fecha_contable,
            concepto,
            importe,
            tipo,
            saldo,
            codigo_cuenta
        } = await req.json();

        // 1. Validar campos obligatorios según la definición de la tabla
        if (!temporada || !fecha_contable || !concepto || importe === undefined || !codigo_cuenta) {
            return Response.json(
                { error: "Faltan campos obligatorios (temporada, fecha_contable, concepto, importe, codigo_cuenta)" },
                {
                    status: 400,
                    headers: corsHeaders
                }
            );
        }

        // 2. Inicializar cliente con Service Role Key
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // 3. Verificar que la cuenta de socio asociada existe
        const { data: socioExistente, error: errorSocio } = await supabase
            .from("socios")
            .select("id")
            .eq("id", codigo_cuenta)
            .maybeSingle();

        if (errorSocio || !socioExistente) {
            return Response.json(
                { error: "El código de cuenta (socio) especificado no existe" },
                {
                    status: 400,
                    headers: corsHeaders
                }
            );
        }

        // 4. Insertar el movimiento
        const { data: nuevoMovimiento, error: errorInsert } = await supabase
            .from("movimientos")
            .insert({
                temporada: temporada.trim(),
                fecha_contable,
                concepto: concepto.trim(),
                importe: Number(importe),
                tipo: tipo || null,
                saldo: saldo !== undefined && saldo !== null ? Number(saldo) : null,
                codigo_cuenta
            })
            .select()
            .single();

        if (errorInsert) {
            throw errorInsert;
        }

        return Response.json(
            {
                mensaje: "Movimiento registrado correctamente",
                movimiento: nuevoMovimiento
            },
            {
                status: 201,
                headers: corsHeaders
            }
        );

    } catch (error) {
        return Response.json(
            { error: error.message || "Error al crear el movimiento" },
            {
                status: 500,
                headers: corsHeaders
            }
        );
    }
});
