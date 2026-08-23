// assets/js/nav-auth.js
import { supabaseClient } from "./supabase.js";

export async function cargarNavegacionDinamica() {
    const contenedorNav = document.querySelector("[data-nav-links]");
    if (!contenedorNav) return;

    try {
        // 1. Obtener la sesión actual de Supabase
        const { data: { session } } = await supabaseClient.auth.getSession();

        if (!session) {
            renderizarMenuPublico(contenedorNav);
            return;
        }

        const user = session.user;

        // 2. Consultar el rol en la tabla 'socios' usando el ID del usuario autenticado
        const { data: socio, error } = await supabaseClient
            .from("socios")
            .select("rol")
            .eq("id", user.id)
            .single();

        const rol = socio ? socio.rol : "socio";

        // 3. Renderizar opciones del menú según el rol
        renderizarMenuSegunRol(contenedorNav, rol);

    } catch (err) {
        console.error("Error al cargar la navegación:", err);
        renderizarMenuPublico(contenedorNav);
    }
}

function renderizarMenuSegunRol(contenedor, rol) {
    let html = `
        <a href="index.html">Inicio</a>
        <a href="general/calendario.html">Calendario</a>
    `;

    // 🔴 ACCESOS EXCLUSIVOS PARA ROL ADMINISTRADOR
    if (rol === "administrador" || rol === "admin") {
        html += `
            <a href="administracion.html">Administración</a>
            <a href="gestion-socios.html">Gestión Socios</a>
        `;
    }

    // Enlace para área personal / cerrar sesión
    html += `
        <a href="mi-cuenta.html">Mi Cuenta</a>
        <a href="#" id="btn-logout" class="btn-logout">Cerrar sesión</a>
    `;

    contenedor.innerHTML = html;

    // Listener para cerrar sesión
    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
        btnLogout.addEventListener("click", async (e) => {
            e.preventDefault();
            await supabaseClient.auth.signOut();
            window.location.href = "login.html";
        });
    }
}

function renderizarMenuPublico(contenedor) {
    contenedor.innerHTML = `
        <a href="index.html">Inicio</a>
        <a href="general/calendario.html">Calendario</a>
        <a href="login.html">Acceso privado</a>
    `;
}

// Ejecutar automáticamente al cargar la página
document.addEventListener("DOMContentLoaded", cargarNavegacionDinamica);
