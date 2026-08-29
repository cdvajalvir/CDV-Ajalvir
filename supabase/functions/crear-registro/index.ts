import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validarDocumento } from "../_shared/validaciones.ts";

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
            password,
            temporada
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
        const temporadanorm = (temporada) ? temporada : "XXXX/XXXX";

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

        // Normalizar email
        const emailNorm = email.trim().toLowerCase();

        // 1. Comprobar si el DNI ya existe en la tabla socios
        const { data: socioExistente } = await supabase
            .from("socios")
            .select("id, email")
            .eq("dni", documento)
            .maybeSingle();

        let userId = "";
        let esRenovacion = false;

        if (socioExistente) {
            userId = socioExistente.id;

            // Verificar si este UUID ya está en el array de la temporada actual
            const { data: temporadaData } = await supabase
                .from("temporada")
                .select("users")
                .eq("temporada", temporadanorm)
                .maybeSingle();

            if (temporadaData && temporadaData.users && temporadaData.users.includes(userId)) {
                return Response.json(
                    {
                        error: "El DNI ya está registrado para esta temporada"
                    },
                    {
                        status: 400,
                        headers: corsHeaders
                    }
                );
            }

            esRenovacion = true;
        }

        // Comprobar si el email ya está en uso por otro socio distinto (si no es el mismo socio renovando)
        const { data: emailExistente } = await supabase
            .from("socios")
            .select("id")
            .eq("email", emailNorm)
            .maybeSingle();

        if (emailExistente && emailExistente.id !== userId) {
            return Response.json(
                {
                    error: "El email ya está registrado"
                },
                {
                    status: 400,
                    headers: corsHeaders
                }
            );
        }

        if (esRenovacion) {
            // CASO B: Renovación -> Actualizar credenciales de Auth y datos permitidos en socios
            const { error: authUpdateError } = await supabase.auth.admin.updateUserById(userId, {
                email: emailNorm,
                password: password,
                email_confirm: true
            });

            if (authUpdateError) {
                return Response.json(
                    { error: authUpdateError.message },
                    { status: 400, headers: corsHeaders }
                );
            }

            // Actualizar campos permitidos (email y teléfono, sin tocar nombre, apellido ni dni)
            const { error: updateSocioError } = await supabase
                .from("socios")
                .update({
                    email: emailNorm,
                    telefono: telefono
                })
                .eq("id", userId);

            if (updateSocioError) {
                throw updateSocioError;
            }

        } else {
            // CASO A: Nuevo socio -> Crear usuario en Auth y registrar en socios
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

            userId = authData.user.id;

            // --- BUSCAR LA CUOTA OFICIAL DEL ADMINISTRADOR PARA ESTA TEMPORADA ---
            let cuotaOficial = 0;
            const { data: adminSocios, error: errorAdmin } = await supabase
                .from("socios")
                .select("cantidad_pagada")
                .eq("rol", "administrador");

            if (!errorAdmin && adminSocios && adminSocios.length > 0) {
                for (const admin of adminSocios) {
                    if (Array.isArray(admin.cantidad_pagada)) {
                        const temporadaAdmin = admin.cantidad_pagada.find(
                            (item) => item.temporada === temporadanorm
                        );
                        if (temporadaAdmin && temporadaAdmin.cuota !== undefined && temporadaAdmin.cuota > 0) {
                            cuotaOficial = temporadaAdmin.cuota;
                            break; 
                        }
                    }
                }
            }

            // Si el administrador no la tiene definida, buscar en cualquier otro socio que tenga cuota > 0
            if (cuotaOficial === 0) {
                const { data: todosSocios } = await supabase
                    .from("socios")
                    .select("cantidad_pagada");

                if (todosSocios) {
                    for (const socio of todosSocios) {
                        if (Array.isArray(socio.cantidad_pagada)) {
                            const tempEncontrada = socio.cantidad_pagada.find(
                                (item) => item.temporada === temporadanorm
                            );
                            if (tempEncontrada && tempEncontrada.cuota !== undefined && tempEncontrada.cuota > 0) {
                                cuotaOficial = tempEncontrada.cuota;
                                break;
                            }
                        }
                    }
                }
            }
            // --------------------------------------------------------------------

            // Crear registro en la tabla socios incluyendo el JSONB cantidad_pagada inicial con la cuota encontrada
            const { error: insertSocioError } = await supabase
                .from("socios")
                .insert({
                    id: userId,
                    nombre,
                    apellido,
                    dni: documento,
                    email: emailNorm,
                    telefono,
                    rol: "socio",
                    activo: false,
                    cantidad_pagada: [
                        {
                            cuota: cuotaOficial,
                            pagado: 0,
                            temporada: temporadanorm
                        }
                    ]
                });

            if (insertSocioError) {
                await supabase.auth.admin.deleteUser(userId).catch(console.error);
                throw insertSocioError;
            }
        }

        // 2. Gestionar la inserción o actualización del UUID en la tabla temporada
        const { data: insertData, error: insertError } = await supabase
            .from("temporada")
            .insert({
                temporada: temporadanorm,
                users: [userId]
            });

        // SI NO HAY ERROR EN EL INSERT, ES QUE LA TEMPORADA SE ACABA DE CREAR POR PRIMERA VEZ
        if (!insertError) {
            const { error: massUpdateError } = await supabase
                .from("socios")
                .update({ activo: false })
                .neq("rol", "administrador"); // Resetea a todos menos a los administradores

            if (massUpdateError) {
                console.error("Error al desactivar socios para la nueva temporada:", massUpdateError);
            }
        } 
        else if (insertError && insertError.code === '23505') {
            // La temporada ya existe, recuperamos el array actual
            const { data: registroActual } = await supabase
                .from("temporada")
                .select("users")
                .eq("temporada", temporadanorm)
                .single();

            if (registroActual) {
                const arrayActualusers = registroActual.users || [];
                // Asegurar que no se duplique el UUID en el array
                if (!arrayActualusers.includes(userId)) {
                    const arrayActualizado = [...arrayActualusers, userId];
                    const { error: updateError } = await supabase
                        .from("temporada")
                        .update({ users: arrayActualizado })
                        .eq("temporada", temporadanorm);

                    if (updateError) {
                        console.error("Error al actualizar el array:", updateError);
                        throw updateError;
                    }
                }
            }
        } else if (insertError) {
            console.error("Error inesperado en la insercion:", insertError);
            throw insertError;
        }

        return Response.json(
            {
                mensaje: "Solicitud enviada correctamente"
            },
            {
                headers: corsHeaders
            }
        );

    } catch(error){
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
