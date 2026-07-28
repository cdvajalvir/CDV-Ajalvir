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
            // Comprobar si la página actual es la portada pública principal (de la raíz)
            const path = window.location.pathname;
            const esPortadaPublica = path === "/" || path.endsWith("/index.html") && !path.includes("/socios/");

            // Si está logueado y entra a la portada pública, lo llevamos al panel de socios
            if (esPortadaPublica) {
                window.location.href = "/socios/index.html"; 
                return;
            }

            // Actualizar enlaces de la cabecera para mantener la navegación dentro de socios
            const linkInicio = document.querySelector('.nav-links a[href="index.html"], .nav-links a[href="../index.html"], .brand');
            const linkAcceso = document.querySelector('.nav-links a[href="login.html"], .nav-links a[href="../login.html"]');

            if (linkInicio) {
                linkInicio.setAttribute("href", "/socios/index.html");
            }

            if (linkAcceso) {
                linkAcceso.textContent = "Mi Perfil";
                linkAcceso.setAttribute("href", "/socios/perfil.html");
            }
        }
    } catch (err) {
        console.error("Error al comprobar la sesión:", err);
    }
});
