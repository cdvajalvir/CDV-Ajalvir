import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "npm:web-push@3.6.6"

// Configurar las claves VAPID (debes guardarlas como secretos en Supabase o ponerlas aquí)
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") || "";
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") || "";
const vapidEmail = Deno.env.get("VAPID_EMAIL") || "mailto:cdve.ajalvir@gmail.com";

webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

serve(async (req) => {
  try {
    // 1. Inicializar Supabase con la Service Role Key para saltarse el RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 2. Buscar si hay alguna convocatoria activa
    const { data: convocatorias, error: convoError } = await supabaseAdmin
      .from("convocatorias")
      .select("*")
      .eq("activa", true)
      .limit(1);

    if (convoError) throw convoError;

    if (!convocatorias || convocatorias.length === 0) {
      return new Response(JSON.stringify({ message: "No hay convocatorias activas." }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    const convo = convocatorias[0];
    const usersApuntados = Array.isArray(convo.users) ? convo.users : [];
    const usersNook = Array.isArray(convo.users_nook) ? convo.users_nook : []; // <--- NUEVO: Obtenemos el array de no asistencias

    // 3. Obtener todas las suscripciones push guardadas
    const { data: suscripciones, error: subError } = await supabaseAdmin
      .from("suscripciones_push")
      .select("*");

    if (subError) throw subError;

    if (!suscripciones || suscripciones.length === 0) {
      return new Response(JSON.stringify({ message: "No hay usuarios con notificaciones registradas." }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 4. Filtrar los socios que NO se han apuntado Y que TAMPOCO han indicado que no pueden asistir
    const suscripcionesPendientes = suscripciones.filter(
      (sub) => !usersApuntados.includes(sub.user_id) && !usersNook.includes(sub.user_id)
    );

    if (suscripcionesPendientes.length === 0) {
      return new Response(JSON.stringify({ message: "Todos los socios ya han respondido a la convocatoria." }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 5. Preparar el mensaje de la notificación
    const payload = JSON.stringify({
      title: "⚽ Convocatoria Pendiente",
      body: `Partido: ${convo.convocatoria}. ¡Recuerda confirmar tu asistencia!`,
    });

    // 6. Enviar las notificaciones una a una
    const promesasEnvio = suscripcionesPendientes.map(async (item) => {
      try {
        await webpush.sendNotification(item.suscripcion, payload);
      } catch (err: any) {
        console.error(`Error enviando push al usuario ${item.user_id}:`, err);
        // Si la suscripción ha expirado o el usuario la ha revocado, podemos limpiar la BD
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabaseAdmin
            .from("suscripciones_push")
            .delete()
            .eq("user_id", item.user_id);
        }
      }
    });

    await Promise.all(promesasEnvio);

    return new Response(JSON.stringify({ 
      success: true, 
      enviados: suscripcionesPendientes.length 
    }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err: any) {
    console.error("Error crítico en la Edge Function:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
