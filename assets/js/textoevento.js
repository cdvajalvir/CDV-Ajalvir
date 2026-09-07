import { supabaseClient } from "./supabase.js";

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

window.addEventListener("DOMContentLoaded", () => {
    // Lógica que programaremos a continuación
});
