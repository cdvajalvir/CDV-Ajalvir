// assets/js/nav-auth.js
import { supabaseClient } from "./supabase.js";

export async function cargarNavegacionDinamica() {
    const contenedorNav = document.querySelector("[data-nav-links]");
    if (!contenedorNav) return;

    // 1. Detectar ruta base de forma segura
    const pathName = window.location.pathname;
    const esRaiz = pathName.endsWith("/index.html") || pathName.endsWith("/");
    
    const isInSubfolder = !esRaiz && (
        pathName.includes("/general/") || 
        pathName.includes("/admin/") ||
        pathName.includes("/socios/") || 
        pathName.includes("/directiva/")
    );
    const basePath = isInSubfolder ? "../" : "./";

    // 2. Pintar un menú básico por defecto INMEDIATAMENTE para que NUNCA aparezca en blanco
    renderizarMenuPublico(contenedorNav, basePath);

    try {
        // 3. Comprobar sesión de forma segura con un timeout por si Supabase no responde
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Timeout Supabase")), 4000)
        );

        const sessionPromise = supabaseClient.auth.getSession();
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);

        if (!session) return; // Si no hay sesión, se queda con el menú público que ya pintamos

        const user = session.user;

        // Consultar el rol del socio en Supabase
        const { data: socio } = await supabaseClient
            .from("socios")
            .select("rol")
            .eq("id", user.id)
            .maybeSingle();

        const rol = socio && socio.rol ? String(socio.rol).trim().toLowerCase() : "socio";

        // Comportamiento específico según la página o el rol
        if (pathName.includes("socios.html")) {
            renderizarMenuPaginaSocios(contenedorNav, rol, basePath);
        } else if (pathName.includes("administracion.html")) {
            renderizarMenuPaginaAdmin(contenedorNav, basePath);
        } else if (pathName.includes("directiva")) {
            renderizarMenuPaginaDirectiva(contenedorNav, basePath);
        } else {
            renderizarMenuSegunRol(contenedorNav, rol, basePath);
        }

    } catch (err) {
        console.warn("Aviso en navegación (usando menú público por defecto):", err.message);
        // Si hay cualquier error de conexión o timeout, se queda el menú público y no rompe nada
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
    } else if (rol === "administrador" || rol === "admin" || rol === "directiva") {
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
