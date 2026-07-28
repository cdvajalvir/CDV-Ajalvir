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
            const currentPath = window.location.pathname;
            const estaEnSocios = currentPath.includes("/socios/");

            // Definimos la ruta al panel de socios según dónde estemos
            const rutaAreaSocios = estaEnSocios ? "index.html" : "socios/index.html";

            // Buscamos el botón de login/acceso privado en la cabecera
            const enlaceAcceso = document.querySelector('a[href*="login.html"]');

            if (enlaceAcceso) {
                // Lo transformamos en un botón directo a su área privada
                enlaceAcceso.textContent = "Área de socios";
                enlaceAcceso.setAttribute("href", rutaAreaSocios);
            }
        }
    } catch (err) {
        console.error("Error al verificar la sesión en la navegación:", err);
    }
});
