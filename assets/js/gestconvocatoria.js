import { supabaseClient } from "./supabase.js";
import { comprobarAcceso, cerrarSesion } from "./auth.js";

window.cerrarSesion = cerrarSesion;

document.addEventListener("DOMContentLoaded", () => {
    comprobarAcceso(["administrador", "directiva"], async (usuario) => {
        console.log("Acceso concedido a Gestión de Convocatoria:", usuario);
        await cargarConvocatorias();

        const btnNuevo = document.getElementById("btnNuevaConvocatoria");
        if (btnNuevo) {
            btnNuevo.addEventListener("click", aniadirNuevaConvocatoriaUI);
        }
    });
});

async function cargarConvocatorias() {
    const contenedor = document.getElementById("contenedorConvocatoria");
    contenedor.innerHTML = `<p style="text-align: center; padding: 2rem; color: #fff;">Cargando convocatorias...</p>`;

    try {
        const { data: convocatorias, error } = await supabaseClient
            .from("convocatorias")
            .select("*"); // Quitamos el order por idx que daba error

        if (error) throw error;

        renderizarConvocatorias(convocatorias || []);
    } catch (err) {
        console.error("Error detallado de Supabase:", JSON.stringify(err, null, 2));
        contenedor.innerHTML = `<p style="text-align: center; padding: 2rem; color: #ef4444;">Error al cargar las convocatorias: ${err.message || ''}</p>`;
    }
}

function renderizarConvocatorias(lista) {
    const contenedor = document.getElementById("contenedorConvocatoria");
    contenedor.innerHTML = "";

    if (lista.length === 0) {
        contenedor.innerHTML = `<p style="text-align: center; padding: 2rem; color: #94a3b8;">No hay convocatorias registradas.</p>`;
        return;
    }

    lista.forEach((conv, index) => {
        const card = document.createElement("article");
        card.className = "convocatoria-card";
        card.dataset.id = conv.id;

        // Mostramos un número de orden visual basado en la lista (1, 2, 3...) o el id recortado
        const numOrden = index + 1;

        card.innerHTML = `
            <div class="convocatoria-header-actions">
                <h3 style="margin: 0; color: #38bdf8;">Convocatoria #${numOrden}</h3>
                <div style="display: flex; align-items: center; gap: 1.5rem;">
                    <label class="toggle-activo-container" title="Marcar como convocatoria activa">
                        <input type="checkbox" class="input-activa" ${conv.activa ? 'checked' : ''}>
                        <span style="font-weight: bold; color: ${conv.activa ? '#34d399' : '#94a3b8'};">Activa</span>
                    </label>
                    <button class="btn-guardar btn-guardar-conv" data-id="${conv.id}">Guardar</button>
                </div>
            </div>

            <div class="convocatoria-detalle">
                <div class="detalle-item" style="grid-column: span 2;">
                    <label>Convocatoria (Partido)</label>
                    <input type="text" class="input-convocatoria" value="${conv.convocatoria || ''}">
                </div>

                <div class="detalle-item">
                    <label>Tipo de Convocatoria</label>
                    <select class="select-tipo">
                        <option value="Oficial" ${conv.tipo_convocatoria === 'Oficial' ? 'selected' : ''}>Oficial</option>
                        <option value="Amistoso" ${conv.tipo_convocatoria === 'Amistoso' ? 'selected' : ''}>Amistoso</option>
                        <option value="Entrenamiento" ${conv.tipo_convocatoria === 'Entrenamiento' ? 'selected' : ''}>Entrenamiento</option>
                    </select>
                </div>

                <div class="detalle-item">
                    <label>Lugar</label>
                    <input type="text" class="input-lugar" value="${conv.lugar || ''}">
                </div>

                <div class="detalle-item">
                    <label>Hora</label>
                    <input type="text" class="input-hora" value="${conv.hora || ''}">
                </div>

                <div class="detalle-item" style="grid-column: span 2;">
                    <label>Comentarios</label>
                    <textarea class="input-comentarios" rows="2">${conv.comentarios || ''}</textarea>
                </div>
            </div>
        `;

        const btnGuardar = card.querySelector(".btn-guardar-conv");
        btnGuardar.addEventListener("click", () => guardarConvocatoria(conv.id, card));

        contenedor.appendChild(card);
    });
}

async function guardarConvocatoria(id, cardElement) {
    const convocatoriaVal = cardElement.querySelector(".input-convocatoria").value.trim();
    const tipoVal = cardElement.querySelector(".select-tipo").value;
    const lugarVal = cardElement.querySelector(".input-lugar").value.trim();
    const horaVal = cardElement.querySelector(".input-hora").value.trim();
    const comentariosVal = cardElement.querySelector(".input-comentarios").value.trim();
    const activaVal = cardElement.querySelector(".input-activa").checked;

    try {
        // Si marcamos esta como activa, desactivamos las demás
        if (activaVal) {
            await supabaseClient
                .from("convocatorias")
                .update({ activa: false })
                .neq("id", id);
        }

        const { error } = await supabaseClient
            .from("convocatorias")
            .update({
                convocatoria: convocatoriaVal,
                tipo_convocatoria: tipoVal,
                lugar: lugarVal,
                hora: horaVal,
                comentarios: comentariosVal,
                activa: activaVal
            })
            .eq("id", id);

        if (error) throw error;

        alert("¡Convocatoria actualizada correctamente!");
        await cargarConvocatorias();
    } catch (err) {
        console.error("Error al guardar convocatoria:", err);
        alert("Hubo un error al guardar los cambios: " + (err.message || ''));
    }
}

async function aniadirNuevaConvocatoriaUI() {
    try {
        const nuevaConvocatoriaData = {
            convocatoria: "Nuevo Partido / Evento",
            users: [],
            lugar: "Por determinar",
            hora: "10:00:00",
            comentarios: "",
            activa: false,
            tipo_convocatoria: "Oficial"
        };

        const { error } = await supabaseClient
            .from("convocatorias")
            .insert([nuevaConvocatoriaData]);

        if (error) throw error;

        await cargarConvocatorias();
    } catch (err) {
        console.error("Error al crear nueva convocatoria:", JSON.stringify(err, null, 2));
        alert("Error al añadir la nueva convocatoria: " + (err.message || ''));
    }
}
