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

    // Cargar el texto actual de la tabla p_evento
    let eventoId = null;

    async function cargarTextoActual() {
        try {
            const { data, error } = await supabaseClient
                .from("p_evento")
                .select("id, texto")
                .limit(1);

            if (error) throw error;

            if (data && data.length > 0) {
                eventoId = data.id; // Guardamos el ID del registro único
                if (inputTexto) {
                    inputTexto.value = data.texto || "";
                }
            }
        } catch (err) {
            console.error("Error al cargar el texto:", err);
        }
    }

    await cargarTextoActual();

    // Actualizar el texto existente en lugar de insertar
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const textoPublicar = inputTexto ? inputTexto.value.trim() : "";

            try {
                mostrarMensaje("Publicando cambios...");

                let query = supabaseClient.from("p_evento");

                if (eventoId) {
                    // Si ya existe el registro único, actualizamos por ID
                    var { error } = await query
                        .update({ texto: textoPublicar })
                        .eq("id", eventoId);
                } else {
                    // Si por algún motivo la tabla estuviera vacía, insertamos la primera vez
                    var { data: newData, error } = await query
                        .insert([{ texto: textoPublicar }])
                        .select();
                    
                    if (newData && newData.length > 0) {
                        eventoId = newData.id;
                    }
                }

                if (error) throw error;

                mostrarMensaje("¡Publicado correctamente en la página de inicio!");
            } catch (err) {
                console.error("Error al publicar:", err);
                mostrarMensaje(err.message || "Error al publicar el evento", true);
            }
        });
    }
});
