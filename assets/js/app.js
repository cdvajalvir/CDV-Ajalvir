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

    // 2. Gestión inteligente de la navegación según el estado de la sesión
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();

        if (session) {
            const currentPath = window.location.pathname;

            // Detectar si estamos en la portada pública (raíz)
            const esPortadaPublica = 
                currentPath === "/" || 
                (currentPath.endsWith("/index.html") && !currentPath.includes("/socios/")) ||
                currentPath.endsWith("/login.html");

            // Si el socio entra a la portada pública estando logueado, lo devolvemos al panel de socios
            if (esPortadaPublica) {
                window.location.href = "socios/index.html";
                return;
            }

            // Si está dentro de alguna página de socios, ajustamos los enlaces de la cabecera
            const estaEnSocios = currentPath.includes("/socios/");
            const rutaDestinoInicio = estaEnSocios ? "index.html" : "socios/index.html";
            const rutaDestinoPerfil = estaEnSocios ? "perfil.html" : "socios/perfil.html";

            // Interceptar todos los enlaces de "Inicio" y el logo "brand"
            const enlacesInicio = document.querySelectorAll('a[href*="index.html"], a.brand');
            enlacesInicio.forEach(enlace => {
                // Solo modificar si no es el enlace activo dentro de socios
                if (!enlace.classList.contains("active") || !estaEnSocios) {
                    enlace.setAttribute("href", rutaDestinoInicio);
                }
            });

            // Interceptamos el enlace de "Acceso privado" o "Login" para cambiarlo a "MiPerfil"
            const enlaceAcceso = document.querySelector('a[href*="login.html"]');
            if (enlaceAcceso) {
                enlaceAcceso.textContent = "Mi perfil";
                enlaceAcceso.setAttribute("href", rutaDestinoPerfil);
            }
        }
    } catch (err) {
        console.error("Error al verificar la sesión en la navegación:", err);
    }
});
