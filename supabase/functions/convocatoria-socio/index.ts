import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejo de peticiones CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Obtener el token de autorización del usuario que hace la petición
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado (Falta token)' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Crear cliente de Supabase respetando el contexto del usuario autenticado
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Obtener los datos del usuario logueado
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Usuario no válido o sesión expirada' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = user.id

    // 3. Crear cliente con privilegios de Administrador (service_role) para saltar RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Leer el cuerpo de la petición
    const { action, payload } = await req.json()

    // ==========================================
    // ACCIÓN 1: CARGAR CONVOCATORIA ACTIVA Y ESTADO
    // ==========================================
    if (action === 'cargar_activa_socio') {
      const { data: convocatorias, error } = await supabaseAdmin
        .from("convocatorias")
        .select("*")
        .eq("activa", true)
        .limit(1)

      if (error) throw error

      if (!convocatorias || convocatorias.length === 0) {
        return new Response(JSON.stringify({ data: null, estaApuntado: false, estaNoApuntado: false }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const convo = convocatorias[0]
      const usersArray = Array.isArray(convo.users) ? convo.users : []
      const usersNookArray = Array.isArray(convo.users_nook) ? convo.users_nook : []
      
      const estaApuntado = usersArray.includes(userId)
      const estaNoApuntado = usersNookArray.includes(userId)

      return new Response(JSON.stringify({ 
        data: convo, 
        estaApuntado: estaApuntado,
        estaNoApuntado: estaNoApuntado 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ==========================================
    // ACCIÓN 2: TOGGLE ASISTENCIA (SÍ VOY)
    // ==========================================
    if (action === 'toggle_asistencia') {
      const { convocatoriaId } = payload || {}
      if (!convocatoriaId) {
        throw new Error("Falta el ID de la convocatoria.")
      }

      const { data: convoActual, error: errConvo } = await supabaseAdmin
        .from("convocatorias")
        .select("id, users, users_nook")
        .eq("id", convocatoriaId)
        .single()

      if (errConvo || !convoActual) throw new Error("No se ha encontrado la convocatoria.")

      let currentUsers = Array.isArray(convoActual.users) ? convoActual.users : []
      let currentNook = Array.isArray(convoActual.users_nook) ? convoActual.users_nook : []
      
      const yaApuntado = currentUsers.includes(userId)
      let nuevosUsers = [...currentUsers]
      let nuevosNook = [...currentNook]

      if (yaApuntado) {
        nuevosUsers = nuevosUsers.filter((id: string) => id !== userId)
      } else {
        nuevosUsers.push(userId)
        // Si confirma asistencia, lo quitamos de la lista de "no puede asistir"
        nuevosNook = nuevosNook.filter((id: string) => id !== userId)
      }

      const { error: updateError } = await supabaseAdmin
        .from("convocatorias")
        .update({ users: nuevosUsers, users_nook: nuevosNook })
        .eq("id", convocatoriaId)

      if (updateError) throw updateError

      return new Response(JSON.stringify({ 
        success: true, 
        apuntado: !yaApuntado,
        totalConfirmados: nuevosUsers.length 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ==========================================
    // ACCIÓN 3: TOGGLE NO ASISTENCIA (NO PUEDO IR)
    // ==========================================
    if (action === 'toggle_no_asistencia') {
      const { convocatoriaId } = payload || {}
      if (!convocatoriaId) {
        throw new Error("Falta el ID de la convocatoria.")
      }

      const { data: convoActual, error: errConvo } = await supabaseAdmin
        .from("convocatorias")
        .select("id, users, users_nook")
        .eq("id", convocatoriaId)
        .single()

      if (errConvo || !convoActual) throw new Error("No se ha encontrado la convocatoria.")

      let currentUsers = Array.isArray(convoActual.users) ? convoActual.users : []
      let currentNook = Array.isArray(convoActual.users_nook) ? convoActual.users_nook : []
      
      const yaNoApuntado = currentNook.includes(userId)
      let nuevosNook = [...currentNook]
      let nuevosUsers = [...currentUsers]

      if (yaNoApuntado) {
        nuevosNook = nuevosNook.filter((id: string) => id !== userId)
      } else {
        nuevosNook.push(userId)
        // Si marca que no va, lo quitamos de la lista de confirmados si estaba apuntado
        nuevosUsers = nuevosUsers.filter((id: string) => id !== userId)
      }

      const { error: updateError } = await supabaseAdmin
        .from("convocatorias")
        .update({ users: nuevosUsers, users_nook: nuevosNook })
        .eq("id", convocatoriaId)

      if (updateError) throw updateError

      return new Response(JSON.stringify({ 
        success: true, 
        noApuntado: !yaNoApuntado, // <-- Corregido aquí
        totalNoAsisten: nuevosNook.length 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Acción no válida' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    console.error("Error en Edge Function convocatoria-socio:", err)
    return new Response(JSON.stringify({ error: err.message || 'Error interno del servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
