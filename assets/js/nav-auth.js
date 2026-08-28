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

    // 2. Pintar menú público por defecto inmediatamente
    renderizarMenuPublico(contenedorNav, basePath);

    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) return;

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
        } else if (pathName.includes("registros.html")) {
            renderizarMenuUnicoRegistros(contenedorNav, rol, basePath); // <--- Exclusivo solo para registros.html
        } else if (pathName.includes("administracion.html")) {
            renderizarMenuPaginaAdmin(contenedorNav, rol, basePath);
        } else if (pathName.includes("directiva")) {
            renderizarMenuPaginaDirectiva(contenedorNav, rol, basePath);
        } else {
            renderizarMenuSegunRol(contenedorNav, rol, basePath);
        }

    } catch (err) {
        console.warn("Aviso en navegación:", err.message);
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
    } else if (rol === "directiva") {
        contenedor.innerHTML = `
            <a href="${basePath}index.html">Inicio</a>
            <a href="${basePath}general/calendario.html">Calendario</a>
            <a href="${basePath}directiva/directiva.html">Directiva</a>
        `;
    }
}

function renderizarMenuPaginaSocios(contenedor, rol, basePath) {
    contenedor.innerHTML = "";
    if (rol === "administrador" || rol === "admin") {
        contenedor.innerHTML = `
            <a href="${basePath}index.html">Inicio</a>
            <a href="${basePath}admin/administracion.html">Administración</a>
            <a href="${basePath}directiva/directiva.html">Directiva</a>
        `;
    } else if (rol === "directiva") {
        // En Área de socios con rol directiva: Inicio y Directiva
        contenedor.innerHTML = `
            <a href="${basePath}index.html">Inicio</a>
            <a href="${basePath}directiva/directiva.html">Directiva</a>
        `;
    } else {
        contenedor.innerHTML = `
            <a href="${basePath}index.html">Inicio</a>
            <button id="btn-logout" class="btn-logout">Cerrar sesión</button>
        `;
        configurarBotonLogout(basePath);
    }
}

function renderizarMenuPaginaAdmin(contenedor, basePath) {
    contenedor.innerHTML = `
        <a href="${basePath}index.html">Inicio</a>
        <a href="${basePath}socios/socios.html">Área socios</a>
        <a href="${basePath}directiva/directiva.html">Directiva</a>
        <button id="btn-logout" class="btn-logout">Cerrar sesión</button>
    `;
    configurarBotonLogout(basePath);
}

// NUEVA FUNCIÓN EXCLUSIVA PARA registros.html (Sin cerrar sesión y sin elementos extra)
function renderizarMenuUnicoRegistros(contenedor, rol, basePath) {
    if (rol === "directiva") {
        contenedor.innerHTML = `
            <a href="${basePath}directiva/directiva.html">Directiva</a>
        `;
    } else {
        contenedor.innerHTML = `
            <a href="${basePath}admin/administracion.html">Administración</a>
        `;
    }
}

function renderizarMenuPaginaDirectiva(contenedor, rol, basePath) {
    if (rol === "directiva") {
        // En directiva.html con rol directiva: Inicio, Área socios y Cerrar sesión
        contenedor.innerHTML = `
            <a href="${basePath}index.html">Inicio</a>
            <a href="${basePath}socios/socios.html">Área socios</a>
            <button id="btn-logout" class="btn-logout">Cerrar sesión</button>
        `;
        configurarBotonLogout(basePath);
    } else {
        contenedor.innerHTML = `
            <a href="${basePath}index.html">Inicio</a>
            <a href="${basePath}admin/administracion.html">Administración</a>
            <button id="btn-logout" class="btn-logout">Cerrar sesión</button>
        `;
        configurarBotonLogout(basePath);
    }
}

function renderizarMenuPublico(contenedor, basePath) {
    contenedor.innerHTML = `
        <a href="${basePath}index.html">Inicio</a>
        <a href="${basePath}general/calendario.html">Calendario</a>
        <a href="${basePath}login.html">Acceso privado</a>
    `;
}

function configurarBotonLogout(basePath) {
    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
        btnLogout.addEventListener("click", async (e) => {
            e.preventDefault();
            await supabaseClient.auth.signOut();
            window.location.href = `${basePath}index.html`;
        });
    }
}

document.addEventListener("DOMContentLoaded", cargarNavegacionDinamica);
