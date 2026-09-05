import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Cliente temporal solo para verificar que el usuario está autenticado
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Cliente con privilegios de servidor (Service Role) para operar en la BD sin RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, payload } = await req.json()

    // CARGAR CONVOCATORIAS
    if (action === 'cargar') {
      const { data, error } = await supabaseAdmin
        .from('convocatorias')
        .select('*')
        .order('id', { ascending: false })

      if (error) throw error
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ACTUALIZAR CONVOCATORIA
    if (action === 'actualizar') {
      const { id, convocatoria, tipo_convocatoria, lugar, hora, comentarios, activa } = payload

      if (activa) {
        const { error: errDesactivar } = await supabaseAdmin
          .from('convocatorias')
          .update({ activa: false })
          .neq('id', id)

        if (errDesactivar) throw errDesactivar
      }

      const { error } = await supabaseAdmin
        .from('convocatorias')
        .update({ convocatoria, tipo_convocatoria, lugar, hora, comentarios, activa })
        .eq('id', id)

      if (error) throw error
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // CREAR NUEVA CONVOCATORIA
    if (action === 'crear') {
      const nuevaConvocatoriaData = {
        convocatoria: "Nuevo Partido",
        users: null,          // Lo mandamos como null para evitar conflictos con el array de uuids
        lugar: "Por determinar",
        hora: "10:00:00",
        comentarios: "",
        activa: false
        // Omitimos tipo_convocatoria temporalmente para que coja el default o NULL si lo permite, 
        // o puedes asignarle el primer valor válido de tu enum cat_partido si es obligatorio.
      }

      const { error } = await supabaseAdmin
        .from('convocatorias')
        .insert([nuevaConvocatoriaData])

      if (error) throw error
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Acción no válida' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
