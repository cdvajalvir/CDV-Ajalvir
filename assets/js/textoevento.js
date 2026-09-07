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
    const navLinksContainer = document.querySelector("[data-nav-links]");
    if (navLinksContainer) {
        navLinksContainer.innerHTML = `
            <a href="administracion.html" style="font-weight: bold; color: var(--color-primary, #fbbf24);">Administración</a>
        `;
    }
});
