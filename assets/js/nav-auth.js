// assets/js/nav-auth.js
import { supabaseClient } from "./supabase.js";

export async function cargarNavegacionDinamica() {
    const contenedorNav = document.querySelector("[data-nav-links]");
    if (!contenedorNav) return;

    // Detectar si estamos en una subcarpeta para calcular rutas relativas
    const isInSubfolder = window.location.pathname.includes("/general/") || 
                          window.location.pathname.includes("/admin/") ||
                          window.location.pathname.includes("/socios/authorization") || 
                          window.location.pathname.includes("/socios/") ||
                          window.location.pathname.includes("/directiva/"); // o la ruta que uses
    const basePath = isInSubfolder ? "../" : "./";

    try {
        const { data: { session } } = await supabaseClient.auth.getSession();

        if (!session) {
            renderizarMenuPublico(contenedorNav, basePath);
            return;
        }

        const user = session.user;

        // Consultar el rol del socio en Supabase
        const { data: socio } = await supabaseClient
            .from("socios")
            .select("rol")
            .eq("id", user.id)
            .single();

        const rol = socio && socio.rol ? String(socio.rol).trim().toLowerCase() : "socio";

        const pathName = window.location.pathname;

        // Comportamiento específico según la página en la que estemos
        if (pathName.includes("socios.html")) {
            renderizarMenuPaginaSocios(contenedorNav, rol, basePath);
        } else if (pathName.includes("administracion.html")) {
            renderizarMenuPaginaAdmin(contenedorNav, basePath);
        } else if (pathName.includes("directiva") || pathName.endsWith("directiva/directiva.html")) {
            renderizarMenuPaginaDirectiva(contenedorNav, basePath);
        } else {
            renderizarMenuSegunRol(contenedorNav, rol, basePath);
        }

    } catch (err) {
        console.error("Error al cargar la navegación:", err);
        renderizarMenuPublico(contenedorNav, basePath);
    }
}

function renderizarMenuSegunRol(contenedor, rol, basePath) {
    contenedor.innerHTML = "";

    if (rol === "socio") {
        contenedor.innerHTML = `
            <a href="${basePath}index.html">Inicio</a>
            <a href="${basePath}general/calendario.html">Calendario</a>
            <a href="${basePath}socios/socios.html">Área socio</a>
        `;
    } else if (rol === "administrador" || rol === "admin") {
        contenedor.innerHTML = `
            <a href="${basePath}index.html">Inicio</a>
            <a href="${basePath}general/calendario.html">Calendario</a>
            <a href="${basePath}admin/administracion.html">Administración</a>
        `;
    }
}

function renderizarMenuPaginaSocios(contenedor, rol, basePath) {
    contenedor.innerHTML = "";
    if (rol === "administrador" || rol === "admin") {
        contenedor.innerHTML = `
            <a href="${basePath}index.html">Inicio</a>
            <a href="${basePath}admin/administracion.html">Administración</a>
        `;
    } else {
        contenedor.innerHTML = `
            <a href="${basePath}index.html">Inicio</a>
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

function renderizarMenuPaginaAdmin(contenedor, basePath) {
    contenedor.innerHTML = `
        <a href="${basePath}index.html">Inicio</a>
        <a href="${basePath}socios/socios.html">Área socios</a>
        <a href="${basePath}directiva/directiva.html">Directiva</a>
        <button id="btn-logout" class="btn-logout">Cerrar sesión</button>
    `;
    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
        btnLogout.addEventListener("click", async (e) => {
            e.preventDefault();
            const { supabaseClient } = await import("./supabase.js");
            await supabaseClient.auth.signOut();
            window.location.href = `${basePath}index.html`;
        });
    }
}

function renderizarMenuPaginaDirectiva(contenedor, basePath) {
    contenedor.innerHTML = `
        <a href="${basePath}index.html">Inicio</a>
        <a href="${basePath}admin/administracion.html">Administración</a>
        <a href="socios.html">Socios</a>
        <button id="btn-logout" class="btn-logout">Cerrar sesión</button>
    `;
    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
        btnLogout.addEventListener("click", async (e) => {
            e.preventDefault();
            const { supabaseClient } = await import("../assets/js/supabase.js");
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

document.addEventListener("DOMContentLoaded", cargarNavegacionDinamica);
