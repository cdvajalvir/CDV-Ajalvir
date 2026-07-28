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
            // Si el socio está en páginas públicas (como index.html del raíz), 
            // el botón de login cambia a "Área de socios"
            const enlaceAcceso = document.querySelector('a[href*="login.html"]');

            if (enlaceAcceso) {
                enlaceAcceso.textContent = "Área de socios";
                enlaceAcceso.setAttribute("href", "socios/index.html");
            }
        }
    } catch (err) {
        console.error("Error al verificar la sesión en la navegación:", err);
    }
});
