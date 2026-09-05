import { supabaseClient } from "./supabase.js";
import { comprobarAcceso, cerrarSesion } from "./auth.js";

window.cerrarSesion = cerrarSesion;

document.addEventListener("DOMContentLoaded", () => {
    comprobarAcceso(["administrador", "directiva"], async (usuario) => {
        await cargarConvocatorias();

        const btnNuevo = document.getElementById("btnNuevaConvocatoria");
        if (btnNuevo) {
            btnNuevo.addEventListener("click", aniadirNuevaConvocatoriaUI);
        }
    });
});

async function cargarConvocatorias() {
    const contenedor = document.getElementById("contenedorConvocatoria");
    if (!contenedor) return;
    
    contenedor.innerHTML = `<p style="text-align: center; padding: 2rem; color: #fff;">Cargando convocatorias...</p>`;

    try {
        const { data: response, error } = await supabaseClient.functions.invoke('gestion-convocatorias', {
            body: { action: 'cargar' }
        });

        if (error) throw error;
        if (response && response.error) throw new Error(response.error);

        const listaConvocatorias = (response && response.data) ? response.data : [];
        renderizarConvocatorias(listaConvocatorias);
        actualizarPanelSocios(listaConvocatorias);
    } catch (err) {
        console.error("Error al cargar convocatorias:", err);
        contenedor.innerHTML = `<p style="text-align: center; padding: 2rem; color: #ef4444;">Error al cargar las convocatorias: ${err.message}</p>`;
    }
}

function renderizarConvocatorias(lista) {
    const contenedor = document.getElementById("contenedorConvocatoria");
    if (!contenedor) return;
    
    contenedor.innerHTML = "";

    if (!lista || lista.length === 0) {
        contenedor.innerHTML = `<p style="text-align: center; padding: 2rem; color: #94a3b8;">No hay convocatorias registradas.</p>`;
        return;
    }

    lista.forEach((conv) => {
        const fila = document.createElement("article");
        fila.className = "convocatoria-fila";
        fila.dataset.id = conv.id;

        fila.innerHTML = `
            <div class="campo-grupo">
                <label>Convocatoria</label>
                <input type="text" class="input-convocatoria" value="${conv.convocatoria || ''}">
            </div>

            <div class="campo-grupo">
                <label>Tipo</label>
                <select class="select-tipo">
                    <option value="Oficial" ${conv.tipo_convocatoria === 'Oficial' ? 'selected' : ''}>Oficial</option>
                    <option value="Amistoso" ${conv.tipo_convocatoria === 'Amistoso' ? 'selected' : ''}>Amistoso</option>
                    <option value="Entrenamiento" ${conv.tipo_convocatoria === 'Entrenamiento' ? 'selected' : ''}>Entrenamiento</option>
                </select>
            </div>

            <div class="campo-grupo">
                <label>Lugar</label>
                <input type="text" class="input-lugar" value="${conv.lugar || ''}">
            </div>

            <div class="campo-grupo">
                <label>Hora</label>
                <input type="text" class="input-hora" value="${conv.hora || ''}">
            </div>

            <div class="campo-grupo">
                <label>Comentarios</label>
                <input type="text" class="input-comentarios" value="${conv.comentarios || ''}">
            </div>

            <div class="toggle-activo-container" title="Marcar como convocatoria activa">
                <input type="checkbox" class="input-activa" ${conv.activa ? 'checked' : ''}>
                <span class="label-activo-texto" style="color: ${conv.activa ? '#34d399' : '#94a3b8'};">Activa</span>
            </div>

            <button class="btn-guardar btn-guardar-conv" data-id="${conv.id}">Guardar</button>
        `;

        const checkboxActiva = fila.querySelector(".input-activa");
        const textoActivo = fila.querySelector(".label-activo-texto");

        checkboxActiva.addEventListener("change", () => {
            const estaMarcado = checkboxActiva.checked;

            if (estaMarcado) {
                document.querySelectorAll(".convocatoria-fila").forEach(otraFila => {
                    if (otraFila.dataset.id !== conv.id) {
                        const otroCheckbox = otraFila.querySelector(".input-activa");
                        const otroTexto = otraFila.querySelector(".label-activo-texto");
                        if (otroCheckbox) otroCheckbox.checked = false;
                        if (otroTexto) otroTexto.style.color = "#94a3b8";
                    }
                });
                textoActivo.style.color = "#34d399";
                conv.activa = true;
            } else {
                textoActivo.style.color = "#94a3b8";
                conv.activa = false;
            }

            lista.forEach(item => {
                if (item.id === conv.id) {
                    item.activa = estaMarcado;
                } else if (estaMarcado) {
                    item.activa = false;
                }
            });

            actualizarPanelSocios(lista);
        });

        const btnGuardar = fila.querySelector(".btn-guardar-conv");
        btnGuardar.addEventListener("click", () => guardarConvocatoria(conv.id, fila));

        contenedor.appendChild(fila);
    });
}

function actualizarPanelSocios(lista) {
    const tituloCard = document.getElementById("tituloConvocatoriaActiva");
    const listaCard = document.getElementById("listaSociosApuntados");

    if (!tituloCard || !listaCard) return;

    const activa = lista.find(c => c.activa === true);

    if (!activa) {
        tituloCard.textContent = "Ninguna activa";
        listaCard.innerHTML = `<li style="color: #94a3b8; font-size: 0.85rem; text-align: center; padding: 1rem 0;">Selecciona o marca una convocatoria como activa para ver los socios.</li>`;
        return;
    }

    tituloCard.textContent = activa.convocatoria || "Convocatoria Activa";

    const socios = activa.socios || activa.usuarios || [];

    if (socios.length === 0) {
        listaCard.innerHTML = `<li style="color: #94a3b8; font-size: 0.85rem; text-align: center; padding: 1rem 0;">No hay socios apuntados todavía.</li>`;
        return;
    }

    listaCard.innerHTML = "";
    socios.forEach((socio, index) => {
        const li = document.createElement("li");
        li.style.cssText = "background: rgba(255, 255, 255, 0.03); padding: 0.5rem 0.75rem; border-radius: 4px; font-size: 0.85rem; color: #fff; border: 1px solid rgba(255, 255, 255, 0.05); display: flex; align-items: center; gap: 0.5rem;";
        li.innerHTML = `<span style="color: #38bdf8; font-weight: bold; font-size: 0.75rem;">${index + 1}.</span> ${typeof socio === 'string' ? socio : (socio.nombre || socio.email || 'Socio')}`;
        listaCard.appendChild(li);
    });
}

async function guardarConvocatoria(id, filaElement) {
    const convocatoriaVal = filaElement.querySelector(".input-convocatoria").value.trim();
    const tipoVal = filaElement.querySelector(".select-tipo").value;
    const lugarVal = filaElement.querySelector(".input-lugar").value.trim();
    const horaVal = filaElement.querySelector(".input-hora").value.trim();
    const comentariosVal = filaElement.querySelector(".input-comentarios").value.trim();
    const activaVal = filaElement.querySelector(".input-activa").checked;

    try {
        const { data: response, error } = await supabaseClient.functions.invoke('gestion-convocatorias', {
            body: {
                action: 'actualizar',
                payload: {
                    id,
                    convocatoria: convocatoriaVal,
                    tipo_convocatoria: tipoVal,
                    lugar: lugarVal,
                    hora: horaVal,
                    comentarios: comentariosVal,
                    activa: activaVal
                }
            }
        });

        if (error) throw error;
        if (response && response.error) throw new Error(response.error);

        alert("¡Convocatoria actualizada correctamente!");
        await cargarConvocatorias();
    } catch (err) {
        console.error("Error al guardar convocatoria:", err);
        alert("Hubo un error al guardar los cambios: " + err.message);
    }
}

async function aniadirNuevaConvocatoriaUI() {
    try {
        const { data: response, error } = await supabaseClient.functions.invoke('gestion-convocatorias', {
            body: { action: 'crear' }
        });

        if (error) throw error;
        if (response && response.error) throw new Error(response.error);

        await cargarConvocatorias();
    } catch (err) {
        console.error("Error al crear nueva convocatoria:", err);
        alert("Error al añadir la nueva convocatoria.");
    }
}
