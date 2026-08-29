// assets/js/index.js

// Función para registrar el Service Worker y pedir permiso de notificaciones
async function registrarNotificacionesPush(userId) {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        console.log("Este navegador no soporta notificaciones push.");
        return;
    }

    try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        
        // 👇 PEGA AQUÍ TU CLAVE PÚBLICA VAPID REAL
        const publicVapidKey = "BMEMmV_PcdB1gcewKNC7BEKKTuN530wM9rapmnVl1xUln-N5qSxLfsekzw7tY1Y8mdpZZTmeSgI2HOFkIPsdYmI"; 

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: publicVapidKey
        });

        // Guardamos la suscripción en la tabla de Supabase asociada al socio
        const { error } = await supabaseClient
            .from("suscripciones_push")
            .upsert({ 
                user_id: userId, 
                suscripcion: subscription 
            }, { 
                onConflict: "user_id" 
            });

        if (error) throw error;
        console.log("¡Dispositivo registrado correctamente para recibir notificaciones!");

    } catch (err) {
        console.error("El usuario denegó el permiso o hubo un error:", err);
    }
}

// Se ejecuta al cargar la página index.html
document.addEventListener("DOMContentLoaded", async () => {
    // Comprobamos si el usuario ya ha iniciado sesión en Supabase
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (user) {
        // Si está logueado, registramos las notificaciones push
        await registrarNotificacionesPush(user.id);
    }
});
