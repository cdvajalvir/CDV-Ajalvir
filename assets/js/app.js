import { supabaseClient } from "./supabase.js";

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Lógica del menú desplegable móvil
    const toggle = document.querySelector("[data-nav-toggle]");
    const links = document.querySelector("[data-nav-links]");

    if (toggle && links) {
        toggle.addEventListener("click", () => {
            links.classList.toggle("open");
        });
    }

    // 2. Control de sesión y navegación dinámica
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();

        if (session) {
            // Comprobar si la página actual es la portada pública
            const path = window.location.pathname;
            const esPaginaInicio = path.endsWith("index.html") || path === "/" || path.endsWith("/");

            if (esPaginaInicio) {
                // Redirigir al panel privado si ya está logueado
                window.location.href = "panel.html"; // <-- Ajusta el nombre si tu archivo de panel es otro (ej. socio/dashboard.html)
                return;
            }

            // Actualizar enlaces de la cabecera para mantener la navegación privada
            const linkInicio = document.querySelector('.nav-links a[href="index.html"], .brand');
            const linkAcceso = document.querySelector('.nav-links a[href="login.html"]');

            if (linkInicio) {
                linkInicio.setAttribute("href", "panel.html");
            }

            if (linkAcceso) {
                linkAcceso.textContent = "Mi Perfil";
                linkAcceso.setAttribute("href", "panel.html");
            }
        }
    } catch (err) {
        console.error("Error al comprobar la sesión:", err);
    }
});
