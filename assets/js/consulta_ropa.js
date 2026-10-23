import { supabaseClient } from "./supabase.js";

let catalogo = [];
let indiceActual = 0;
// Objeto de caché para almacenar las URLs firmadas y evitar peticiones repetidas
const cacheUrls = {};

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

        // Precargar la siguiente imagen en segundo plano para agilizar la navegación
        precargarImagenAdyacente(1);

    } catch (err) {
        console.error("Error al cargar el catálogo de ropa:", err);
        if (loader) loader.innerHTML = `<p style="color: #ff6b6b;">Error: ${err.message}</p>`;
    }
}

// Función auxiliar para precargar imágenes en segundo plano en el navegador
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

// Mostrar imagen e informar los socios correspondientes de forma fluida
async function mostrarPrenda(index) {
    if (!catalogo || catalogo.length === 0 || index < 0 || index >= catalogo.length) return;

    const item = catalogo[index];

    const imgEl = document.getElementById("imagenPrenda");
    const loader = document.getElementById("loaderImagen");
    const contador = document.getElementById("contadorGaleria");
    const btnAnterior = document.getElementById("btnAnterior");
    const btnSiguiente = document.getElementById("btnSiguiente");

    // Actualizar botones y contador inmediatamente
    contador.textContent = `${index + 1} / ${catalogo.length}`;
    btnAnterior.disabled = index === 0;
    btnSiguiente.disabled = index === catalogo.length - 1;

    // Renderizar la lista de socios al instante
    renderizarSocios(item.socios || []);

    // Gestionar la carga de la imagen
    if (item.imagen_url) {
        // Si ya está en caché o cargada previamente, la mostramos al instante
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

        // Precargar inteligentemente la anterior y la siguiente en segundo plano
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

// Renderizar únicamente nombres de socios
function renderizarSocios(nombresSocios) {
    const contenedor = document.getElementById("listaSocios");
    if (!contenedor) return;

    if (!nombresSocios || nombresSocios.length === 0) {
        contenedor.innerHTML = '<li style="color: rgba(255,255,255,0.4); font-style: italic; text-align: center; padding: 1rem;">No hay socios vinculados a esta prenda.</li>';
        return;
    }

    contenedor.innerHTML = nombresSocios.map(nombre => `
        <li class="socio-item">
            <i class="fa-solid fa-user" style="font-size:0.85rem; margin-right:10px; color: var(--color-accent, #e2b007);"></i>
            ${nombre}
        </li>
    `).join("");
}

// Eventos de navegación
document.addEventListener("DOMContentLoaded", async () => {
    await cargarCatalogoRopa();

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
