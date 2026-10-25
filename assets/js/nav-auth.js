// assets/js/nav-auth.js
import { supabaseClient } from "./supabase.js";

export async function cargarNavegacionDinamica() {
    const pathName = window.location.pathname;

    // EXCLUSIÓN: Si estamos en la página de perfil, no alteramos el menú estático
    //if (pathName.includes("perfil.html")) {
        //return;
    //}

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
    let rol = "vacio";
    renderizarMenuPublico(contenedorNav, rol, basePath);

    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            if (pathName.endsWith("calendario.html") || pathName.endsWith("pprivacidad.html")) {
                renderizarMenuCalendario(contenedorNav, rol, basePath);
            }
            return;
        }

        const user = session.user;

        // Consultar el rol del socio en Supabase
        const { data: socio } = await supabaseClient
            .from("socios")
            .select("rol")
            .eq("id", user.id)
            .maybeSingle();

        rol = socio && socio.rol ? String(socio.rol).trim().toLowerCase() : "socio";

        // Comportamiento específico según la página o el rol
        
        if (pathName.endsWith("gestsocios.html") || pathName.endsWith("registros.html") || pathName.endsWith("gestconvocatoria.html") || pathName.endsWith("consulta_ropa.html")) {
            renderizarMenuUnicoDesdeDirectiva(contenedorNav, rol, basePath);

        } else if (pathName.endsWith("index.html")) {
            renderizarMenuPublico(contenedorNav, rol, basePath);
         } else if (pathName.endsWith("calendario.html") || pathName.endsWith("pprivacidad.html")) {
            renderizarMenuCalendario(contenedorNav, rol, basePath);
            
        } else if (pathName.endsWith("socios.html")) {
            renderizarMenuPaginaSocios(contenedorNav, rol, basePath);
        } else if (pathName.endsWith("convocatoria.html") || pathName.endsWith("perfil.html")) {
            renderizarMenuUnicoConvocatoria(contenedorNav, rol, basePath);
        
        } else if (pathName.endsWith("cuotas.html") || pathName.endsWith("textoevento.html") || pathName.endsWith("equipamiento.html") || pathName.endsWith("activasocio.html")) {
            renderizarMenuUnicoDesdeAdministrador(contenedorNav, basePath);
        
        } else if (pathName.endsWith("administracion.html")) {
            renderizarMenuPaginaAdmin(contenedorNav, basePath);
        } else if (pathName.endsWith("directiva.html")) {
            renderizarMenuPaginaDirectiva(contenedorNav, rol, basePath);
        }

    } catch (err) {
        console.warn("Aviso en navegación:", err.message);
    }
}

function renderizarMenuPublico(contenedor, rol, basePath) {
    contenedor.innerHTML = "";

    if (rol === "socio") {
        contenedor.innerHTML = `
            <a href="${basePath}general/calendario.html">Calendario</a>
            <a href="${basePath}socios/socios.html">Área socio</a>
        `;
    } else if (rol === "administrador") {
        contenedor.innerHTML = `
            <a href="${basePath}general/calendario.html">Calendario</a>
            <a href="${basePath}admin/administracion.html">Administración</a>
        `;
    } else if (rol === "directiva") {
        contenedor.innerHTML = `
            <a href="${basePath}general/calendario.html">Calendario</a>
            <a href="${basePath}directiva/directiva.html">Directiva</a>
        `;
    } else {
        contenedor.innerHTML = `
            <a href="${basePath}general/calendario.html">Calendario</a>
            <a href="${basePath}login.html">Acceso privado</a>
    `;
    }
}

function renderizarMenuCalendario(contenedor, rol, basePath) {
    contenedor.innerHTML = "";

    if (rol === "socio") {
        contenedor.innerHTML = `
            <a href="${basePath}index.html">Inicio</a>
            <a href="${basePath}socios/socios.html">Área socio</a>
        `;
    } else if (rol === "administrador") {
        contenedor.innerHTML = `
            <a href="${basePath}index.html">Inicio</a>
            <a href="${basePath}admin/administracion.html">Administración</a>
        `;
    } else if (rol === "directiva") {
        contenedor.innerHTML = `
            <a href="${basePath}index.html">Inicio</a>
            <a href="${basePath}directiva/directiva.html">Directiva</a>
        `;
    } else {
        contenedor.innerHTML = `
            <a href="${basePath}index.html">Inicio</a>
    `;
    }
}

function renderizarMenuPaginaSocios(contenedor, rol, basePath) {
    contenedor.innerHTML = "";
    if (rol === "administrador") {
        contenedor.innerHTML = `
            <a href="${basePath}index.html">Inicio</a>
            <a href="${basePath}admin/administracion.html">Administración</a>
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
    }
}

function renderizarMenuUnicoDesdeDirectiva(contenedor, rol, basePath) {
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

function renderizarMenuUnicoDesdeAdministrador(contenedor, basePath) {
    contenedor.innerHTML = `
        <a href="${basePath}admin/administracion.html">Administración</a>
    `;
    configurarBotonLogout(basePath);
}

function renderizarMenuUnicoConvocatoria(contenedor, basePath) {
    contenedor.innerHTML = `
        <a href="socios.html">Área socios</a>
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
