// assets/js/nav-auth.js

async function inicializarHeaderNavegacion() {
    const headerNav = document.getElementById("header-nav");
    if (!headerNav) return;

    try {
        // 1. Obtener la sesión actual
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

        if (!session || sessionError) {
            renderizarMenuPublico(headerNav);
            return;
        }

        const user = session.user;

        // 2. Consultar el rol en la tabla 'socios' usando el ID o el Email
        const { data: socio, error: socioError } = await supabaseClient
            .from("socios")
            .select("rol")
            .eq("id", user.id) // O .eq("email", user.email) si usas el correo como enlace
            .single();

        const rol = socio ? socio.rol : "socio";

        // 3. Renderizar opciones del menú
        renderizarMenuSegunRol(headerNav, rol);

    } catch (err) {
        console.error("Error al verificar navegación por rol:", err);
        renderizarMenuPublico(headerNav);
    }
}

function renderizarMenuSegunRol(contenedor, rol) {
    let html = '';

    // Enlaces visibles para todos los usuarios logueados
    html += `<li><a href="inicio.html">Inicio</a></li>`;
    html += `<li><a href="mi-cuenta.html">Mi Cuenta</a></li>`;

    // 🔴 ACCESOS EXCLUSIVOS SI EL ROL ES ADMINISTRADOR
    if (rol === "administrador" || rol === "admin") {
        html += `
            <li class="item-admin"><a href="administracion.html">Administración</a></li>
            <li class="item-admin"><a href="gestion-socios.html">Gestión de Socios</a></li>
        `;
    }

    // Botón de salir
    html += `<li><button id="btn-logout" class="btn-logout">Cerrar Sesión</button></li>`;

    contenedor.innerHTML = html;

    // Listener para cerrar sesión
    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
        btnLogout.addEventListener("click", async () => {
            await supabaseClient.auth.signOut();
            window.location.href = "login.html";
        });
    }
}

function renderizarMenuPublico(contenedor) {
    contenedor.innerHTML = `
        <li><a href="inicio.html">Inicio</a></li>
        <li><a href="login.html">Acceso Socios</a></li>
    `;
}

// Escuchar cambios de estado de autenticación (Login / Logout)
if (typeof supabaseClient !== "undefined") {
    supabaseClient.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
            inicializarHeaderNavegacion();
        }
    });
}

document.addEventListener("DOMContentLoaded", inicializarHeaderNavegacion);
