import { supabaseClient } from "./supabase.js";

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Menú desplegable para móviles
    const toggle = document.querySelector("[data-nav-toggle]");
    const links = document.querySelector("[data-nav-links]");

    if (toggle && links) {
        toggle.addEventListener("click", () => {
            links.classList.toggle("open");
        });
    }

    // 2. Control visual del menú según el estado de la sesión
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();

        if (session) {
            // Usar siempre ruta absoluta desde la raíz
            const rutaAreaSocios = "/socios/index.html";

            // Buscamos el botón de login/acceso privado en la cabecera de las páginas públicas
            const enlaceAcceso = document.querySelector('a[href*="login.html"]');

            if (enlaceAcceso) {
                enlaceAcceso.textContent = "Área de socios";
                enlaceAcceso.setAttribute("href", rutaAreaSocios);
            }
        }
    } catch (err) {
        console.error("Error al verificar la sesión en la navegación:", err);
    }
});
