// assets/js/nav-auth.js
import { supabaseClient } from "./supabase.js";

export async function cargarNavegacionDinamica() {
    const pathName = window.location.pathname;

    // EXCLUSIÓN: Si estamos en la página de perfil, no alteramos el menú estático
    if (pathName.includes("perfil.html")) {
        return;
    }

    const contenedorNav = document.querySelector("[data-nav-links]");
    if (!contenedorNav) return;

    // 1. Detectar ruta base de forma segura
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
        } else if (pathName.includes("gestconvocatoria.html")) {
            renderizarMenuUnicoGestionConvocatoria(contenedorNav, rol, basePath);
        } else if (pathName.includes("convocatoria.html")) {
            renderizarMenuUnicoConvocatoria(contenedorNav, rol, basePath);
        } else if (pathName.includes("registros.html")) {
            renderizarMenuUnicoRegistros(contenedorNav, rol, basePath);
        } else if (pathName.includes("cuotas.html")) {
            renderizarMenuUnicoCuotas(contenedorNav, basePath);
        } else if (pathName.includes("activasocio.html")) { // <--- FALTA ESTE BLOQUE
            renderizarMenuUnicoActivaSocios(contenedorNav, basePath); // <---
        } else if (pathName.includes("administracion.html")) {
            renderizarMenuPaginaAdmin(contenedorNav, basePath);
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

function renderizarMenuUnicoCuotas(contenedor, basePath) {
    contenedor.innerHTML = `
        <a href="${basePath}admin/administracion.html">Administración</a>
    `;
    configurarBotonLogout(basePath);
}

function renderizarMenuUnicoActivaSocios(contenedor, basePath) {
    contenedor.innerHTML = `
        <a href="${basePath}admin/administracion.html">Administración</a>
    `;
    configurarBotonLogout(basePath);
}

function renderizarMenuUnicoConvocatoria(contenedor, basePath) {
    contenedor.innerHTML = `
        <a href="socios.html">Área socios</a>
    `;
    configurarBotonLogout(basePath);
}

function renderizarMenuUnicoGestionConvocatoria(contenedor, basePath) {
    contenedor.innerHTML = `
        <a href="directiva.html">Directiva</a>
    `;
    configurarBotonLogout(basePath);
}

// Inicialización global robusta que controla el menú móvil de forma persistente
document.addEventListener("DOMContentLoaded", () => {
    // 1. Configurar el botón hamburguesa de forma permanente nada más cargar la página
    const navToggle = document.querySelector("[data-nav-toggle]");
    
    if (navToggle) {
        navToggle.addEventListener("click", (e) => {
            e.stopPropagation();
            // Buscamos dinámicamente el contenedor en cada clic por si se ha reescrito
            const contenedorNav = document.querySelector("[data-nav-links]");
            if (contenedorNav) {
                contenedorNav.classList.toggle("open");
                contenedorNav.classList.toggle("active");
            }
        });

        // Cerrar el menú al hacer clic en cualquier opción del menú desplegado
        document.addEventListener("click", (e) => {
            const contenedorNav = document.querySelector("[data-nav-links]");
            const navToggleBtn = document.querySelector("[data-nav-toggle]");
            if (contenedorNav && !contenedorNav.contains(e.target) && navToggleBtn && !navToggleBtn.contains(e.target)) {
                contenedorNav.classList.remove("open");
                contenedorNav.classList.remove("active");
            }
        });
    }

    // 2. Ejecutar la lógica dinámica de roles y rutas
    cargarNavegacionDinamica();
});
