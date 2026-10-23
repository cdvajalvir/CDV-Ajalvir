import { supabaseClient } from "./supabase.js";
import { comprobarAcceso, cerrarSesion } from "./auth.js";

window.cerrarSesion = cerrarSesion;

let catalogo = [];
let indiceActual = 0;
const cacheUrls = {};

document.addEventListener("DOMContentLoaded", () => {
    // Protección estricta de la página para administradores y directiva
    comprobarAcceso(["administrador", "directiva"], async (usuario) => {
        console.log("Acceso concedido a Consulta de Ropa:", usuario);
        await cargarCatalogoRopa();
    });
});

// Cargar catálogo vía Edge Function
async function cargarCatalogoRopa() {
    const loader = document.getElementById("loaderImagen");

    try {
        const { data, error } = await supabaseClient.functions.invoke("consulta-ropa", {
            body: { action: "obtener_catalogo" }
        });

        if (error) throw error;

        catalogo = data?.data || [];

        if (catalogo.length === 0) {
            if (loader) loader.innerHTML = "<p>No hay prendas de ropa registradas.</p>";
            renderizarSocios([]);
            return;
        }

        indiceActual = 0;
        await mostrarPrenda(indiceActual);
        precargarImagenAdyacente(1);

    } catch (err) {
        console.error("Error al cargar el catálogo de ropa:", err);
        if (loader) loader.innerHTML = `<p style="color: #ff6b6b;">Error: ${err.message}</p>`;
    }
}

// Precarga invisible en segundo plano para agilizar la navegación entre imágenes
function precargarImagenAdyacente(index) {
    if (index >= 0 && index < catalogo.length && catalogo[index].imagen_url) {
        const url = catalogo[index].imagen_url;
        if (!cacheUrls[url]) {
            const imgPreload = new Image();
            imgPreload.src = url;
            cacheUrls[url] = true;
        }
    }
}

// Mostrar imagen e informar los socios y tallas correspondientes de forma fluida
async function mostrarPrenda(index) {
    if (!catalogo || catalogo.length === 0 || index < 0 || index >= catalogo.length) return;

    const item = catalogo[index];

    const imgEl = document.getElementById("imagenPrenda");
    const loader = document.getElementById("loaderImagen");
    const contador = document.getElementById("contadorGaleria");
    const btnAnterior = document.getElementById("btnAnterior");
    const btnSiguiente = document.getElementById("btnSiguiente");

    contador.textContent = `${index + 1} / ${catalogo.length}`;
    btnAnterior.disabled = index === 0;
    btnSiguiente.disabled = index === catalogo.length - 1;

    renderizarSocios(item.socios || []);

    if (item.imagen_url) {
        if (imgEl.src === item.imagen_url && imgEl.complete) {
            if (loader) loader.style.display = "none";
            imgEl.style.display = "block";
        } else {
            if (loader) loader.style.display = "block";
            imgEl.style.display = "none";

            imgEl.src = item.imagen_url;
            imgEl.onload = () => {
                if (loader) loader.style.display = "none";
                imgEl.style.display = "block";
            };
            imgEl.onerror = () => {
                if (loader) {
                    loader.style.display = "block";
                    loader.innerHTML = "<p style='color: rgba(255,255,255,0.5);'>No se pudo cargar la imagen</p>";
                }
            };
        }

        precargarImagenAdyacente(index + 1);
        precargarImagenAdyacente(index - 1);

    } else {
        imgEl.style.display = "none";
        if (loader) {
            loader.style.display = "block";
            loader.innerHTML = "<p style='color: rgba(255,255,255,0.5);'>Sin imagen en Storage</p>";
        }
    }
}

// Renderizar nombres de socios junto con su talla
function renderizarSocios(listaSociosInfo) {
    const contenedor = document.getElementById("listaSocios");
    if (!contenedor) return;

    if (!listaSociosInfo || listaSociosInfo.length === 0) {
        contenedor.innerHTML = '<li style="color: rgba(255,255,255,0.4); font-style: italic; text-align: center; padding: 1rem;">No hay socios vinculados a esta prenda.</li>';
        return;
    }

    contenedor.innerHTML = listaSociosInfo.map(socio => `
        <li class="socio-item">
            <span>
                <i class="fa-solid fa-user" style="font-size:0.85rem; margin-right:8px; color: var(--color-accent, #e2b007);"></i>
                ${socio.nombre}
            </span>
            <span style="background: rgba(226, 176, 7, 0.15); color: var(--color-accent, #e2b007); border: 1px solid rgba(226, 176, 7, 0.3); padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">
                ${socio.talla}
            </span>
        </li>
    `).join("");
}

// Eventos de navegación por flechas
document.addEventListener("DOMContentLoaded", () => {
    const btnAnterior = document.getElementById("btnAnterior");
    const btnSiguiente = document.getElementById("btnSiguiente");

    if (btnAnterior) {
        btnAnterior.addEventListener("click", () => {
            if (indiceActual > 0) {
                indiceActual--;
                mostrarPrenda(indiceActual);
            }
        });
    }

    if (btnSiguiente) {
        btnSiguiente.addEventListener("click", () => {
            if (indiceActual < catalogo.length - 1) {
                indiceActual++;
                mostrarPrenda(indiceActual);
            }
        });
    }
});
