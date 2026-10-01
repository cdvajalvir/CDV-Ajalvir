import { supabaseClient } from "./supabase.js";
import { comprobarAcceso, cerrarSesion } from "./auth.js";

window.cerrarSesion = cerrarSesion;

let listaGlobalConvocatorias = [];

document.addEventListener("DOMContentLoaded", () => {
    comprobarAcceso(["administrador", "directiva"], async (usuario) => {
        await cargarConvocatorias();

        const btnNuevo = document.getElementById("btnNuevaConvocatoria");
        if (btnNuevo) {
            btnNuevo.addEventListener("click", aniadirNuevaConvocatoriaUI);
        }

        const filtroTemporada = document.getElementById("filtroTemporada");
        if (filtroTemporada) {
            filtroTemporada.addEventListener("change", () => {
                renderizarHistorico(listaGlobalConvocatorias);
            });
        }
    });
});

async function cargarConvocatorias() {
    const contenedorActiva = document.getElementById("seccionConvocatoriaActiva");
    const contenedorHistorico = document.getElementById("seccionHistoricoConvocatorias");
    
    if (contenedorActiva) contenedorActiva.innerHTML = `<p style="text-align: center; padding: 1rem; color: #fff;">Cargando...</p>`;
    if (contenedorHistorico) contenedorHistorico.innerHTML = `<p style="text-align: center; padding: 1rem; color: #fff;">Cargando...</p>`;

    try {
        const { data: response, error } = await supabaseClient.functions.invoke('gestion-convocatorias', {
            body: { action: 'cargar' }
        });

        if (error) throw error;
        if (response && response.error) throw new Error(response.error);

        listaGlobalConvocatorias = (response && response.data) ? response.data : [];
        
        poblarFiltroTemporadas(listaGlobalConvocatorias);
        renderizarConvocatoriaActiva(listaGlobalConvocatorias);
        renderizarHistorico(listaGlobalConvocatorias);
        actualizarPanelSocios(listaGlobalConvocatorias);
    } catch (err) {
        console.error("Error al cargar convocatorias:", err);
        if (contenedorActiva) contenedorActiva.innerHTML = `<p style="text-align: center; color: #ef4444;">Error: ${err.message}</p>`;
    }
}

function poblarFiltroTemporadas(lista) {
    const select = document.getElementById("filtroTemporada");
    if (!select) return;

    const temporadaActualSeleccionada = select.value;
    
    // Extraer temporadas únicas (asumiendo que viene una propiedad temporada o extrayéndola del campo fecha/nombre)
    // Si tus convocatorias tienen campo temporada, úsalo. Si no, agrupamos por defecto.
    const temporadasSet = new Set();
    lista.forEach(c => {
        if (c.temporada) temporadasSet.add(c.temporada);
    });

    let temporadas = Array.from(temporadasSet).sort().reverse();
    if (temporadas.length === 0) {
        temporadas = ["Actual"];
    }

    select.innerHTML = "";
    temporadas.forEach(temp => {
        const opt = document.createElement("option");
        opt.value = temp;
        opt.textContent = temp;
        if (temp === temporadaActualSeleccionada) opt.selected = true;
        select.appendChild(opt);
    });
}

function renderizarConvocatoriaActiva(lista) {
    const contenedor = document.getElementById("seccionConvocatoriaActiva");
    if (!contenedor) return;

    contenedor.innerHTML = "";

    const activa = lista.find(c => c.activa === true);

    if (!activa) {
        contenedor.innerHTML = `<p style="text-align: center; padding: 1.5rem; background: rgba(255,255,255,0.02); border-radius: 8px; color: #94a3b8; font-size: 0.9rem;">No hay ninguna convocatoria marcada como activa actualmente.</p>`;
        return;
    }

    const fila = document.createElement("article");
    fila.className = "convocatoria-fila";
    fila.dataset.id = activa.id;

    fila.innerHTML = `
        <div class="convocatoria-fila-top">
            <div class="campo-grupo">
                <label>Convocatoria</label>
                <input type="text" class="input-convocatoria" value="${activa.convocatoria || ''}">
            </div>
            <div class="campo-grupo">
                <label>Tipo</label>
                <select class="select-tipo">
                    <option value="Oficial" ${activa.tipo_convocatoria === 'Oficial' ? 'selected' : ''}>Oficial</option>
                    <option value="Amistoso" ${activa.tipo_convocatoria === 'Amistoso' ? 'selected' : ''}>Amistoso</option>
                    <option value="Entrenamiento" ${activa.tipo_convocatoria === 'Entrenamiento' ? 'selected' : ''}>Entrenamiento</option>
                </select>
            </div>
            <div class="campo-grupo">
                <label>Lugar</label>
                <input type="text" class="input-lugar" value="${activa.lugar || ''}">
            </div>
            <div></div>
            <div></div>
        </div>
        <div class="convocatoria-fila-bottom">
            <div class="campo-grupo">
                <label>Fecha (dd/mm/aa - hh:mm)</label>
                <input type="text" class="input-hora" placeholder="ej. 12/09/26 - 09:00" value="${activa.hora || ''}">
            </div>
            <div class="campo-grupo">
                <label>Comentarios</label>
                <input type="text" class="input-comentarios" value="${activa.comentarios || ''}">
            </div>
            <div class="toggle-activo-container" title="Marcar como convocatoria activa">
                <input type="checkbox" class="input-activa" checked>
                <span class="label-activo-texto" style="color: #34d399;">Activa</span>
            </div>
            <button class="btn-guardar btn-guardar-conv" data-id="${activa.id}">Guardar</button>
        </div>
    `;

    const checkboxActiva = fila.querySelector(".input-activa");
    checkboxActiva.addEventListener("change", () => {
        if (!checkboxActiva.checked) {
            activa.activa = false;
            actualizarPanelSocios(lista);
            guardarConvocatoria(activa.id, fila);
        }
    });

    const btnGuardar = fila.querySelector(".btn-guardar-conv");
    btnGuardar.addEventListener("click", () => guardarConvocatoria(activa.id, fila));

    contenedor.appendChild(fila);
}

function renderizarHistorico(lista) {
    const contenedor = document.getElementById("seccionHistoricoConvocatorias");
    const filtroTemporada = document.getElementById("filtroTemporada");
    if (!contenedor) return;

    contenedor.innerHTML = "";

    const temporadaSeleccionada = filtroTemporada ? filtroTemporada.value : null;

    // Filtrar pasadas (no activas o según temporada)
    const historicas = lista.filter(c => {
        if (c.activa) return false; // La activa ya está arriba
        if (temporadaSeleccionada && temporadaSeleccionada !== "Actual" && c.temporada !== temporadaSeleccionada) {
            return false;
        }
        return true;
    });

    if (historicas.length === 0) {
        contenedor.innerHTML = `<p style="text-align: center; padding: 1rem; color: #94a3b8; font-size: 0.85rem;">No hay más convocatorias en el histórico.</p>`;
        return;
    }

    historicas.forEach((conv) => {
        const item = document.createElement("div");
        item.className = "convocatoria-historico-item";
        item.innerHTML = `
            <div>
                <strong style="color: #fff; display: block; margin-bottom: 2px;">${conv.convocatoria || 'Sin título'}</strong>
                <span style="font-size: 0.75rem; color: #94a3b8;">${conv.hora || 'Sin fecha'} · ${conv.tipo_convocatoria || 'General'} · ${conv.lugar || ''}</span>
            </div>
            <button class="btn-guardar btn-activar-historico" data-id="${conv.id}" style="padding: 4px 10px; font-size: 0.75rem; background: #334155;">Activar</button>
        `;

        const btnActivar = item.querySelector(".btn-activar-historico");
        btnActivar.addEventListener("click", async () => {
            // Marcar esta como activa en memoria y guardar
            lista.forEach(item => item.id === conv.id ? item.activa = true : item.activa = false);
            renderizarConvocatoriaActiva(lista);
            renderizarHistorico(lista);
            actualizarPanelSocios(lista);
            await guardarConvocatoriaDirecta(conv.id, true);
        });

        contenedor.appendChild(item);
    });
}

function actualizarPanelSocios(lista) {
    const tituloCard = document.getElementById("tituloConvocatoriaActiva");
    const listaCard = document.getElementById("listaSociosApuntados");

    const tituloCardNook = document.getElementById("tituloConvocatoriaIndisponibles");
    const listaCardNook = document.getElementById("listaSociosIndisponibles");

    if (!tituloCard || !listaCard) return;

    const activa = lista.find(c => c.activa === true);

    if (!activa) {
        tituloCard.textContent = "Ninguna activa";
        listaCard.innerHTML = `<li style="color: #94a3b8; font-size: 0.85rem; text-align: center; padding: 1rem 0;">Selecciona o marca una convocatoria como activa.</li>`;
        
        if (tituloCardNook) tituloCardNook.textContent = "Ninguna activa";
        if (listaCardNook) listaCardNook.innerHTML = `<li style="color: #94a3b8; font-size: 0.85rem; text-align: center; padding: 1rem 0;">Selecciona o marca una convocatoria como activa.</li>`;
        return;
    }

    // 1. Apuntados
    tituloCard.textContent = activa.convocatoria || "Convocatoria Activa";
    const sociosApuntados = activa.users || activa.socios || activa.usuarios || [];

    if (sociosApuntados.length === 0) {
        listaCard.innerHTML = `<li style="color: #94a3b8; font-size: 0.85rem; text-align: center; padding: 1rem 0;">No hay socios apuntados.</li>`;
    } else {
        listaCard.innerHTML = "";
        sociosApuntados.forEach((socio, index) => {
            const li = document.createElement("li");
            li.style.cssText = "background: rgba(255, 255, 255, 0.03); padding: 0.5rem 0.75rem; border-radius: 4px; font-size: 0.85rem; color: #fff; border: 1px solid rgba(255, 255, 255, 0.05); display: flex; align-items: center; gap: 0.5rem;";
            
            let nombreMostrar = "Socio";
            if (typeof socio === 'string') {
                nombreMostrar = `ID: ${socio.substring(0, 8)}...`;
            } else if (socio) {
                nombreMostrar = socio.nombreCompleto || `${socio.nombre || ''} ${socio.apellido || ''}`.trim() || "Socio";
            }

            li.innerHTML = `<span style="color: #38bdf8; font-weight: bold; font-size: 0.75rem;">${index + 1}.</span> ${nombreMostrar}`;
            listaCard.appendChild(li);
        });
    }

    // 2. Indisponibles
    if (tituloCardNook && listaCardNook) {
        tituloCardNook.textContent = activa.convocatoria || "Convocatoria Activa";
        const sociosIndisponibles = activa.users_nook || [];

        if (sociosIndisponibles.length === 0) {
            listaCardNook.innerHTML = `<li style="color: #94a3b8; font-size: 0.85rem; text-align: center; padding: 1rem 0;">No hay socios indisponibles.</li>`;
        } else {
            listaCardNook.innerHTML = "";
            sociosIndisponibles.forEach((socio, index) => {
                const li = document.createElement("li");
                li.style.cssText = "background: rgba(255, 255, 255, 0.03); padding: 0.5rem 0.75rem; border-radius: 4px; font-size: 0.85rem; color: #fff; border: 1px solid rgba(255, 255, 255, 0.05); display: flex; align-items: center; gap: 0.5rem;";
                
                let nombreMostrar = "Socio";
                if (typeof socio === 'string') {
                    nombreMostrar = `ID: ${socio.substring(0, 8)}...`;
                } else if (socio) {
                    nombreMostrar = socio.nombreCompleto || `${socio.nombre || ''} ${socio.apellido || ''}`.trim() || "Socio";
                }

                li.innerHTML = `<span style="color: #f43f5e; font-weight: bold; font-size: 0.75rem;">${index + 1}.</span> ${nombreMostrar}`;
                listaCardNook.appendChild(li);
            });
        }
    }
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

async function guardarConvocatoriaDirecta(id, estadoActiva) {
    try {
        await supabaseClient.functions.invoke('gestion-convocatorias', {
            body: {
                action: 'actualizar',
                payload: { id, activa: estadoActiva }
            }
        });
        await cargarConvocatorias();
    } catch (err) {
        console.error("Error al cambiar estado activo:", err);
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
