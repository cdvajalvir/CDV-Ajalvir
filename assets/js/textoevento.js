import { supabaseClient } from "./supabase.js";

// Verificación estricta de permisos de administrador
async function verificarPermisoAdmin() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = "../index.html";
        return;
    }

    const { data: socio } = await supabaseClient
        .from("socios")
        .select("rol")
        .eq("id", session.user.id)
        .single();

    if (!socio || (socio.rol !== "administrador" && socio.rol !== "admin")) {
        alert("Acceso denegado: Se requieren permisos de administrador.");
        window.location.href = "../index.html";
    }
}

verificarPermisoAdmin();

window.addEventListener("DOMContentLoaded", async () => {
    const form = document.getElementById("formTextoEvento");
    const inputTexto = document.getElementById("texto_evento");
    const mensajeEstado = document.getElementById("mensajeEstadoEvento");

    function mostrarMensaje(texto, esError = false) {
        if (mensajeEstado) {
            mensajeEstado.textContent = texto;
            mensajeEstado.className = esError ? "status danger" : "status ok";
        }
    }

    let eventoId = null;

    // Cargar el texto actual de la tabla p_evento
    async function cargarTextoActual() {
        try {
            const { data, error } = await supabaseClient
                .from("p_evento")
                .select("id, texto")
                .limit(1);

            if (error) throw error;

            if (data && data.length > 0) {
                eventoId = data[0].id; // Capturamos el ID del registro único
                if (inputTexto) {
                    inputTexto.value = data[0].texto || "";
                }
            }
        } catch (err) {
            console.error("Error al cargar el texto:", err);
        }
    }

    await cargarTextoActual();

    // Actualizar siempre el registro único existente
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const textoPublicar = inputTexto ? inputTexto.value.trim() : "";

            try {
                mostrarMensaje("Publicando cambios...");

                if (!eventoId) {
                    throw new Error("No se encuentra el registro del evento en la base de datos.");
                }

                // Ejecutamos el UPDATE respaldado por la política RLS que tienes en Supabase
                const { error } = await supabaseClient
                    .from("p_evento")
                    .update({ texto: textoPublicar })
                    .eq("id", eventoId);

                if (error) throw error;

                mostrarMensaje("¡Publicado correctamente en la página de inicio!");
            } catch (err) {
                console.error("Error al publicar:", err);
                mostrarMensaje(err.message || "Error al publicar el evento", true);
            }
        });
    }
});
