// assets/js/notificaciones.js

export function inicializarControlNotificaciones() {
    document.addEventListener("DOMContentLoaded", async () => {
        const toggle = document.getElementById("push-toggle");
        if (!toggle) return;

        // 1. Comprobar si el navegador soporta push y si ya está suscrito para marcar el tick
        if ("serviceWorker" in navigator && "PushManager" in window) {
            try {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration) {
                    const subscription = await registration.pushManager.getSubscription();
                    toggle.checked = !!subscription; // Marca el interruptor si ya hay suscripción activa
                }
            } catch (err) {
                console.error("Error comprobando el Service Worker:", err);
            }
        }

        // 2. Escuchar cuando el socio mueve el interruptor
        toggle.addEventListener("change", async (e) => {
            // Obtenemos el usuario autenticado actual desde Supabase (asumiendo que supabaseClient es global o accesible)
            const { data: { user } } = await supabaseClient.auth.getUser();
            
            if (!user) {
                alert("Debes iniciar sesión para configurar las notificaciones.");
                toggle.checked = false;
                return;
            }

            if (e.target.checked) {
                // El socio ACTIVA el interruptor -> Pedimos permiso y guardamos
                await activarNotificacionesPush(user.id, toggle);
            } else {
                // El socio DESACTIVA el interruptor -> Borramos suscripción
                await desactivarNotificacionesPush(user.id);
            }
        });
    });
}

// Función para pedir permiso al navegador y guardar en Supabase
async function activarNotificacionesPush(userId, toggleElement) {
    try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        
        // 🔑 PEGA AQUÍ TU CLAVE PÚBLICA VAPID REAL
        const publicVapidKey = "TU_PUBLIC_VAPID_KEY_AQUI"; 

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: publicVapidKey
        });

        const { error } = await supabaseClient
            .from("suscripciones_push")
            .upsert({ 
                user_id: userId, 
                suscripcion: subscription 
            }, { 
                onConflict: "user_id" 
            });

        if (error) throw error;
        console.log("¡Notificaciones activadas y guardadas en Supabase!");

    } catch (err) {
        console.error("No se pudo activar el servicio push:", err);
        alert("El navegador denegó el permiso o hubo un problema. Comprueba la configuración de tu móvil/navegador.");
        toggleElement.checked = false; // Desmarcamos el interruptor si falló
    }
}

// Función para eliminar la suscripción del navegador y de Supabase
async function desactivarNotificacionesPush(userId) {
    try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
            }
        }

        const { error } = await supabaseClient
            .from("suscripciones_push")
            .delete()
            .eq("user_id", userId);

        if (error) throw error;
        console.log("Notificaciones desactivadas correctamente.");

    } catch (err) {
        console.error("Error al desactivar las notificaciones:", err);
    }
}
