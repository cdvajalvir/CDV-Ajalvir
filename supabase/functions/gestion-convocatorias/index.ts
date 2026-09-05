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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Validar que el usuario esté autenticado y tenga rol de administrador/directiva
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { action, payload } = await req.json()

    // 1. CARGAR CONVOCATORIAS
    if (action === 'cargar') {
      const { data, error } = await supabaseClient
        .from('convocatorias')
        .select('*')
        .order('id', { ascending: false })

      if (error) throw error
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. ACTUALIZAR CONVOCATORIA
    if (action === 'actualizar') {
      const { id, convocatoria, tipo_convocatoria, lugar, hora, comentarios, activa } = payload

      // Si se marca como activa, desactivamos las demás primero
      if (activa) {
        const { error: errDesactivar } = await supabaseClient
          .from('convocatorias')
          .update({ activa: false })
          .neq('id', id)

        if (errDesactivar) throw errDesactivar
      }

      const { error } = await supabaseClient
        .from('convocatorias')
        .update({ convocatoria, tipo_convocatoria, lugar, hora, comentarios, activa })
        .eq('id', id)

      if (error) throw error
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. CREAR NUEVA CONVOCATORIA
    if (action === 'crear') {
      const nuevaConvocatoriaData = {
        convocatoria: "Nuevo Partido",
        users: [],
        lugar: "Por determinar",
        hora: "10:00:00",
        comentarios: "",
        activa: false,
        tipo_convocatoria: "Oficial"
      }

      const { error } = await supabaseClient
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
