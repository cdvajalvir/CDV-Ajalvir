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
    contenedor.innerHTML = `<p style="text-align: center; padding: 2rem; color: #fff;">Cargando convocatorias...</p>`;

    try {
        const { data: convocatorias, error } = await supabaseClient
            .from("convocatorias")
            .select("*");

        if (error) throw error;

        renderizarConvocatorias(convocatorias || []);
    } catch (err) {
        console.error("Error al cargar convocatorias:", err);
        contenedor.innerHTML = `<p style="text-align: center; padding: 2rem; color: #ef4444;">Error al cargar las convocatorias.</p>`;
    }
}

function renderizarConvocatorias(lista) {
    const contenedor = document.getElementById("contenedorConvocatoria");
    contenedor.innerHTML = "";

    if (lista.length === 0) {
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
                <span style="color: ${conv.activa ? '#34d399' : '#94a3b8'};">Activa</span>
            </div>

            <button class="btn-guardar btn-guardar-conv" data-id="${conv.id}">Guardar</button>
        `;

        const btnGuardar = fila.querySelector(".btn-guardar-conv");
        btnGuardar.addEventListener("click", () => guardarConvocatoria(conv.id, fila));

        contenedor.appendChild(fila);
    });
}

async function guardarConvocatoria(id, filaElement) {
    const convocatoriaVal = filaElement.querySelector(".input-convocatoria").value.trim();
    const tipoVal = filaElement.querySelector(".select-tipo").value;
    const lugarVal = filaElement.querySelector(".input-lugar").value.trim();
    const horaVal = filaElement.querySelector(".input-hora").value.trim();
    const comentariosVal = filaElement.querySelector(".input-comentarios").value.trim();
    const activaVal = filaElement.querySelector(".input-activa").checked;

    // VALIDACIÓN: Comprobar cuántas convocatorias están marcadas como activas en pantalla
    if (activaVal) {
        const todasLasFilas = document.querySelectorAll(".convocatoria-fila");
        let activasEnPantalla = 0;

        todasLasFilas.forEach(fila => {
            const checkbox = fila.querySelector(".input-activa");
            // Si está marcada y pertenece a otra fila diferente a la que estamos guardando
            if (checkbox && checkbox.checked && fila.dataset.id !== id) {
                activasEnPantalla++;
            }
        });

        if (activasEnPantalla > 0) {
            alert("⚠️ ¡Atención! Ya existe otra convocatoria marcada como activa. Solo puede haber una convocatoria activa al mismo tiempo.");
            return; // Detenemos el guardado
        }
    }

    try {
        // Si esta se marca como activa, desmarcamos automáticamente las demás en la base de datos
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
        alert("Hubo un error al guardar los cambios.");
    }
}

async function aniadirNuevaConvocatoriaUI() {
    try {
        const nuevaConvocatoriaData = {
            convocatoria: "Nuevo Partido",
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
        console.error("Error al crear nueva convocatoria:", err);
        alert("Error al añadir la nueva convocatoria.");
    }
}
