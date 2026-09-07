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

    // ID fijo del registro único en la tabla p_evento
    const EVENTO_ID = 4;

    // 1. Cargar el texto actual al abrir la página
    async function cargarTextoActual() {
        try {
            const { data, error } = await supabaseClient
                .from("p_evento")
                .select("texto")
                .eq("id", EVENTO_ID)
                .single();

            if (error) throw error;

            if (data && inputTexto) {
                inputTexto.value = data.texto || "";
            }
        } catch (err) {
            console.error("Error al cargar el texto:", err);
        }
    }

    await cargarTextoActual();

    // 2. Al pulsar publicar, actualizamos directamente el registro con ID 4
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const textoPublicar = inputTexto ? inputTexto.value.trim() : "";

            try {
                mostrarMensaje("Publicando cambios...");

                const { error } = await supabaseClient
                    .from("p_evento")
                    .update({ texto: textoPublicar })
                    .eq("id", EVENTO_ID);

                if (error) throw error;

                mostrarMensaje("¡Publicado correctamente en la página de inicio!");
            } catch (err) {
                console.error("Error al publicar:", err);
                mostrarMensaje(err.message || "Error al publicar el evento", true);
            }
        });
    }
});
