import { supabaseClient } from "./supabase.js";

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Menú móvil
    const toggle = document.querySelector("[data-nav-toggle]");
    const links = document.querySelector("[data-nav-links]");

    if (toggle && links) {
        toggle.addEventListener("click", () => {
            links.classList.toggle("open");
        });
    }

    // 2. Control de sesión y redirección
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();

        if (session) {
            const path = window.location.pathname;

            // Detectar si está en la portada pública
            const esPortadaPublica = path === "/" || 
                                     path.endsWith("/index.html") && !path.includes("/socios/") ||
                                     path.endsWith("/login.html");

            if (esPortadaPublica) {
                window.location.href = "/socios/index.html";
                return;
            }

            // Cambiar los enlaces del menú
            const linkInicio = document.querySelector('.nav-links a:first-child') || document.querySelector('.brand');
            const linkAcceso = document.querySelector('.nav-links a[href*="login"]');

            if (linkInicio) {
                linkInicio.setAttribute("href", "/socios/index.html");
            }

            if (linkAcceso) {
                linkAcceso.textContent = "Mi Perfil";
                linkAcceso.setAttribute("href", "/socios/perfil.html");
            }
        }
    } catch (err) {
        console.error("Error al verificar la sesión:", err);
    }
});
