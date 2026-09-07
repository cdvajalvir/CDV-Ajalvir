import { supabaseClient } from "./supabase.js";

window.addEventListener("DOMContentLoaded", async () => {
    const contenedorTexto = document.getElementById("textoProximoEvento");
    if (!contenedorTexto) return;

    try {
        const { data, error } = await supabaseClient
            .from("p_evento")
            .select("texto")
            .order("created_at", { ascending: false })
            .limit(1);

        if (error) throw error;

        if (data && data.length > 0 && data[0].texto) {
            // Reemplazamos los saltos de línea por <br> para que los textos grandes se vean bien formateados
            contenedorTexto.innerHTML = data[0].texto.replace(/\n/g, '<br>');
        } else {
            contenedorTexto.textContent = "No hay eventos próximos configurados actualmente.";
        }
    } catch (err) {
        console.error("Error al cargar el próximo evento en la home:", err);
        contenedorTexto.textContent = "Error al cargar la información del evento.";
    }
});
