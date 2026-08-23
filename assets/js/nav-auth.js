// assets/js/nav-auth.js
import { supabaseClient } from "./supabase.js";

export async function cargarNavegacionDinamica() {
    const contenedorNav = document.querySelector("[data-nav-links]");
    if (!contenedorNav) return;

    // Calculamos el prefijo relativo según si estamos en una subcarpeta (ej. /socios/) o en la raíz
    const isInSubfolder = window.location.pathname.includes("/socios/") || 
                          window.location.pathname.includes("/general/") ||
                          window.location.pathname.includes("/admin/");
    const basePath = isInSubfolder ? "../" : "./";

    try {
        // 1. Obtener la sesión actual de Supabase
        const { data: { session } } = await supabaseClient.auth.getSession();

        if (!session) {
            renderizarMenuPublico(contenedorNav, basePath);
            return;
        }

        const user = session.user;

        // 2. Consultar el rol en la tabla 'socios'
        const { data: socio } = await supabaseClient
            .from("socios")
            .select("rol")
            .eq("id", user.id)
            .single();

        const rol = socio ? socio.rol : "socio";

        // 3. Renderizar opciones según el rol
        renderizarMenuSegunRol(contenedorNav, rol, basePath);

    } catch (err) {
        console.error("Error al cargar la navegación:", err);
        renderizarMenuPublico(contenedorNav, basePath);
    }
}

function renderizarMenuSegunRol(contenedor, rol, basePath) {
    let html = "";

    if (rol === "socio") {
        // Menú exacto para el rol Socio
        html = `
            <a href="${basePath}index.html">Inicio</a>
            <a href="${basePath}general/calendario.html">Calendario</a>
            <a href="${basePath}socios/index.html">Área socio</a>
        `;
    } else if (rol === "administrador" || rol === "admin") {
        // Menú para Administrador
        html = `
            <a href="${basePath}index.html">Inicio</a>
            <a href="${basePath}general/calendario.html">Calendario</a>
            <a href="${basePath}admin/index.html">Administración</a>
            <a href="${basePath}admin/gestion-socios.html">Gestión Socios</a>
            <a href="#" id="btn-logout" class="btn-logout">Cerrar sesión</a>
        `;
    } else {
        // Menú genérico de respaldo para otros roles autenticados
        html = `
            <a href="${basePath}index.html">Inicio</a>
            <a href="${basePath}general/calendario.html">Calendario</a>
            <a href="#" id="btn-logout" class="btn-logout">Cerrar sesión</a>
        `;
    }

    contenedor.innerHTML = html;

    // Listener para cerrar sesión
    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
        btnLogout.addEventListener("click", async (e) => {
            e.preventDefault();
            await supabaseClient.auth.signOut();
            window.location.href = `${basePath}index.html`;
        });
    }
}

function renderizarMenuPublico(contenedor, basePath) {
    contenedor.innerHTML = `
        <a href="${basePath}index.html">Inicio</a>
        <a href="${basePath}general/calendario.html">Calendario</a>
        <a href="${basePath}login.html">Acceso privado</a>
    `;
}

// Ejecutar automáticamente al cargar el DOM
document.addEventListener("DOMContentLoaded", cargarNavegacionDinamica);
