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
      // 1. Cargamos las convocatorias
      const { data: convocatorias, error } = await supabaseAdmin
        .from('convocatorias')
        .select('*')
        .order('id', { ascending: false })

      if (error) throw error

      if (!convocatorias || convocatorias.length === 0) {
        return new Response(JSON.stringify({ data: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // 2. Extraer todos los UUIDs únicos de los arrays 'users' de todas las convocatorias
      const allUuids: string[] = []
      convocatorias.forEach(conv => {
        if (Array.isArray(conv.users)) {
          conv.users.forEach((id: string) => {
            if (id && !allUuids.includes(id)) {
              allUuids.push(id)
            }
          })
        }
      })

      // 3. Si hay UUIDs, consultamos la tabla de socios para obtener sus nombres
      let sociosMap = new Map()
      if (allUuids.length > 0) {
        // Nota: Cambia 'socios' por el nombre real de tu tabla de usuarios/perfiles si es diferente (ej: 'profiles')
        const { data: sociosData, error: errSocios } = await supabaseAdmin
          .from('socios') 
          .select('id, nombre, apellidos, email')
          .in('id', allUuids)

        if (!errSocios && sociosData) {
          sociosData.forEach((socio: any) => {
            sociosMap.set(socio.id, socio)
          })
        }
      }

      // 4. Mapear los UUIDs de cada convocatoria a sus objetos de socio completos
      const convocatoriasConNombres = convocatorias.map(conv => {
        const usuariosCompletos = Array.isArray(conv.users)
          ? conv.users.map((id: string) => sociosMap.get(id) || { id, nombre: 'Socio', apellidos: '' })
          : []

        return {
          ...conv,
          users: usuariosCompletos // Reemplazamos el array de UUIDs por el de objetos con nombre
        }
      })

      return new Response(JSON.stringify({ data: convocatoriasConNombres }), {
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
      // 1. Primero desactivamos todas las demás para que solo quede una activa
      const { error: errDesactivar } = await supabaseAdmin
        .from('convocatorias')
        .update({ activa: false })
        .neq('id', '00000000-0000-0000-0000-000000000000') // truco para afectar a todas

      if (errDesactivar) throw errDesactivar

      // 2. Creamos la nueva ya marcada como activa
      const nuevaConvocatoriaData = {
        convocatoria: `Nuevo Partido (${new Date().toLocaleDateString()})`,
        lugar: "Por determinar",
        hora: "10:00:00",
        comentarios: "",
        activa: true, // <--- Nace marcada con el tick
        tipo_convocatoria: "Oficial"
      }

      const { error } = await supabaseAdmin
        .from('convocatorias')
        .insert([nuevaConvocatoriaData])

      if (error) {
        console.error("Error de Supabase en Insert:", error)
        throw new Error(error.message)
      }

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
