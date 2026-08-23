// assets/js/nav-auth.js
import { supabaseClient } from "./supabase.js";

export async function cargarNavegacionDinamica() {
    const contenedorNav = document.querySelector("[data-nav-links]");
    if (!contenedorNav) return;

    // Detectar si estamos en una subcarpeta (ej: general/) para ajustar rutas relativas
    const isInSubfolder = window.location.pathname.includes("/general/") || 
                          window.location.pathname.includes("/admin/");
    const basePath = isInSubfolder ? "../" : "./";

    try {
        const { data: { session } } = await supabaseClient.auth.getSession();

        if (!session) {
            renderizarMenuPublico(contenedorNav, basePath);
            return;
        }

        const user = session.user;

        // Consultar el rol del socio
        const { data: socio } = await supabaseClient
            .from("socios")
            .select("rol")
            .eq("id", user.id)
            .single();

        const rol = socio && socio.rol ? String(socio.rol).trim().toLowerCase() : "socio";

        renderizarMenuSegunRol(contenedorNav, rol, basePath);

    } catch (err) {
        console.error("Error al cargar la navegación:", err);
        renderizarMenuPublico(contenedorNav, basePath);
    }
}

function renderizarMenuSegunRol(contenedor, rol, basePath) {
    contenedor.innerHTML = "";

    if (rol === "socio") {
        // Menú en la web pública cuando el usuario está logueado como Socio
        contenedor.innerHTML = `
            <a href="${basePath}index.html">Inicio</a>
            <a href="${basePath}general/calendario.html">Calendario</a>
            <a href="${basePath}socios/socios.html">Área socio</a>
        `;
    } else if (rol === "administrador" || rol === "admin") {
        // Menú para Administrador
        contenedor.innerHTML = `
            <a href="${basePath}index.html">Inicio</a>
            <a href="${basePath}general/calendario.html">Calendario</a>
            <a href="${basePath}admin/administracion.html">Administración</a>
            <button id="btn-logout" class="btn-logout">Cerrar sesión</button>
        `;

        const btnLogout = document.getElementById("btn-logout");
        if (btnLogout) {
            btnLogout.addEventListener("click", async (e) => {
                e.preventDefault();
                await supabaseClient.auth.signOut();
                window.location.href = `${basePath}index.html`;
            });
        }
    }
}

function renderizarMenuPublico(contenedor, basePath) {
    // Menú sin loguear (Acceso público)
    contenedor.innerHTML = `
        <a href="${basePath}index.html">Inicio</a>
        <a href="${basePath}general/calendario.html">Calendario</a>
        <a href="${basePath}login.html">Acceso privado</a>
    `;
}

document.addEventListener("DOMContentLoaded", cargarNavegacionDinamica);
