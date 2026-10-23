import { supabaseClient } from "./supabase.js";

let catalogo = [];
let indiceActual = 0;

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
        mostrarPrenda(indiceActual);

    } catch (err) {
        console.error("Error al cargar el catálogo de ropa:", err);
        if (loader) loader.innerHTML = `<p style="color: #ff6b6b;">Error: ${err.message}</p>`;
    }
}

// Mostrar imagen e informar los socios correspondientes
function mostrarPrenda(index) {
    if (!catalogo || catalogo.length === 0 || index < 0 || index >= catalogo.length) return;

    const item = catalogo[index];

    const imgEl = document.getElementById("imagenPrenda");
    const loader = document.getElementById("loaderImagen");
    const contador = document.getElementById("contadorGaleria");
    const btnAnterior = document.getElementById("btnAnterior");
    const btnSiguiente = document.getElementById("btnSiguiente");

    // Actualizar botones y contador
    contador.textContent = `${index + 1} / ${catalogo.length}`;
    btnAnterior.disabled = index === 0;
    btnSiguiente.disabled = index === catalogo.length - 1;

    // Cargar imagen
    if (loader) loader.style.display = "block";
    imgEl.style.display = "none";

    if (item.imagen_url) {
        imgEl.src = item.imagen_url;
        imgEl.onload = () => {
            if (loader) loader.style.display = "none";
            imgEl.style.display = "block";
        };
        imgEl.onerror = () => {
            if (loader) loader.innerHTML = "<p style='color: rgba(255,255,255,0.5);'>Imagen no encontrada en Storage</p>";
        };
    } else {
        if (loader) loader.innerHTML = "<p style='color: rgba(255,255,255,0.5);'>Sin imagen en Storage</p>";
    }

    // Renderizar SOLAMENTE los nombres de los socios
    renderizarSocios(item.socios || []);
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

// Eventos
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
