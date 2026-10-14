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
        
        // Asignar la temporada calculada a cada convocatoria
        listaGlobalConvocatorias.forEach(c => {
            c.temporadaCalculada = obtenerTemporadaDesdeFecha(c.hora);
        });

        poblarFiltroTemporadas(listaGlobalConvocatorias);
        renderizarConvocatoriasActivas(listaGlobalConvocatorias);
        renderizarHistorico(listaGlobalConvocatorias);
        actualizarPanelesSocios(listaGlobalConvocatorias);
    } catch (err) {
        console.error("Error al cargar convocatorias:", err);
        if (contenedorActiva) contenedorActiva.innerHTML = `<p style="text-align: center; color: #ef4444;">Error: ${err.message}</p>`;
    }
}

// Función para calcular la temporada (ej: "2026/2027") basándose en la fecha
function obtenerTemporadaDesdeFecha(textoHora) {
    if (!textoHora || typeof textoHora !== 'string') return "Sin Temporada";
    
    const partesFecha = textoHora.split("-")[0].trim().split("/");
    if (partesFecha.length < 3) return "Sin Temporada";

    const mes = parseInt(partesFecha[1], 10);
    let anio = parseInt(partesFecha[2], 10);

    if (anio < 100) {
        anio += 2000;
    }

    if (isNaN(mes) || isNaN(anio)) return "Sin Temporada";

    if (mes >= 9) {
        return `${anio}/${anio + 1}`;
    } else {
        return `${anio - 1}/${anio}`;
    }
}

function poblarFiltroTemporadas(lista) {
    const select = document.getElementById("filtroTemporada");
    if (!select) return;

    const temporadaSeleccionadaAnterior = select.value;
    const temporadasSet = new Set();

    lista.forEach(c => {
        if (c.temporadaCalculada) {
            temporadasSet.add(c.temporadaCalculada);
        }
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
        select.appendChild(opt);
    });

    if (temporadaSeleccionadaAnterior && temporadas.includes(temporadaSeleccionadaAnterior)) {
        select.value = temporadaSeleccionadaAnterior;
    } else if (temporadas.length > 0) {
        select.value = temporadas[0];
    }
}

// Renderiza TODas las convocatorias que tengan activa: true (máximo dos visualmente arriba)
function renderizarConvocatoriasActivas(lista) {
    const contenedor = document.getElementById("seccionConvocatoriaActiva");
    if (!contenedor) return;

    contenedor.innerHTML = "";

    const activas = lista.filter(c => c.activa === true);

    if (activas.length === 0) {
        contenedor.innerHTML = `<p style="text-align: center; padding: 1.5rem; background: rgba(255,255,255,0.02); border-radius: 8px; color: #94a3b8; font-size: 0.9rem;">No hay ninguna convocatoria marcada como activa actualmente.</p>`;
        return;
    }

    activas.forEach(activa => {
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
                guardarConvocatoriaDirecta(activa.id, false);
            }
        });

        const btnGuardar = fila.querySelector(".btn-guardar-conv");
        btnGuardar.addEventListener("click", () => guardarConvocatoria(activa.id, fila));

        contenedor.appendChild(fila);
    });
}

function renderizarHistorico(lista) {
    const contenedor = document.getElementById("seccionHistoricoConvocatorias");
    const filtroTemporada = document.getElementById("filtroTemporada");
    if (!contenedor) return;

    contenedor.innerHTML = "";

    const temporadaSeleccionada = filtroTemporada ? filtroTemporada.value : null;

    const historicas = lista.filter(c => {
        if (c.activa) return false; // Las activas están arriba
        if (temporadaSeleccionada && c.temporadaCalculada !== temporadaSeleccionada) {
            return false;
        }
        return true;
    });

    if (historicas.length === 0) {
        contenedor.innerHTML = `<p style="text-align: center; padding: 1rem; color: #94a3b8; font-size: 0.85rem;">No hay más convocatorias en el histórico para esta temporada.</p>`;
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
            conv.activa = true; 
            renderizarConvocatoriasActivas(lista);
            renderizarHistorico(lista);
            actualizarPanelesSocios(lista);
            await guardarConvocatoriaDirecta(conv.id, true);
        });

        contenedor.appendChild(item);
    });
}

// Rellena los dos paneles laterales derechos con la Convocatoria 1 y la Convocatoria 2 activas
function actualizarPanelesSocios(lista) {
    const activas = lista.filter(c => c.activa === true);

    // Elementos Convocatoria 1
    const titulo1 = document.getElementById("tituloConv1");
    const listaApuntados1 = document.getElementById("listaApuntados1");
    const listaIndisponibles1 = document.getElementById("listaIndisponibles1");

    // Elementos Convocatoria 2
    const titulo2 = document.getElementById("tituloConv2");
    const listaApuntados2 = document.getElementById("listaApuntados2");
    const listaIndisponibles2 = document.getElementById("listaIndisponibles2");

    // --- PANEL 1 ---
    if (activas.length > 0) {
        const c1 = activas[0];
        titulo1.textContent = `${c1.convocatoria || "Sin nombre"} (${c1.hora || "Sin fecha"})`;
        renderizarListasSociosItem(c1, listaApuntados1, listaIndisponibles1);
    } else {
        titulo1.textContent = "Ninguna activa";
        listaApuntados1.innerHTML = `<li style="color: #94a3b8; font-size: 0.85rem; text-align: center; justify-content: center; padding: 0.5rem 0;">Sin datos</li>`;
        listaIndisponibles1.innerHTML = `<li style="color: #94a3b8; font-size: 0.85rem; text-align: center; justify-content: center; padding: 0.5rem 0;">Sin datos</li>`;
    }

    // --- PANEL 2 ---
    if (activas.length > 1) {
        const c2 = activas[1];
        titulo2.textContent = `${c2.convocatoria || "Sin nombre"} (${c2.hora || "Sin fecha"})`;
        renderizarListasSociosItem(c2, listaApuntados2, listaIndisponibles2);
    } else {
        titulo2.textContent = "Ninguna segunda convocatoria activa";
        listaApuntados2.innerHTML = `<li style="color: #94a3b8; font-size: 0.85rem; text-align: center; justify-content: center; padding: 0.5rem 0;">Sin datos</li>`;
        listaIndisponibles2.innerHTML = `<li style="color: #94a3b8; font-size: 0.85rem; text-align: center; justify-content: center; padding: 0.5rem 0;">Sin datos</li>`;
    }
}

// Función auxiliar para pintar los ul de apuntados e indisponibles de una convocatoria
function renderizarListasSociosItem(convocatoria, ulApuntados, ulIndisponibles) {
    // Apuntados
    const apuntados = convocatoria.users || convocatoria.socios || convocatoria.usuarios || [];
    if (apuntados.length === 0) {
        ulApuntados.innerHTML = `<li style="color: #94a3b8; font-size: 0.85rem; text-align: center; justify-content: center; padding: 0.5rem 0;">No hay socios apuntados.</li>`;
    } else {
        ulApuntados.innerHTML = "";
        apuntados.forEach((socio, index) => {
            const li = document.createElement("li");
            let nombreMostrar = "Socio";
            if (typeof socio === 'string') {
                nombreMostrar = `ID: ${socio.substring(0, 8)}...`;
            } else if (socio) {
                nombreMostrar = socio.nombreCompleto || `${socio.nombre || ''} ${socio.apellido || ''}`.trim() || "Socio";
            }
            li.innerHTML = `<span style="color: #38bdf8; font-weight: bold; font-size: 0.75rem;">${index + 1}.</span> ${nombreMostrar}`;
            ulApuntados.appendChild(li);
        });
    }

    // Indisponibles
    const indisponibles = convocatoria.users_nook || [];
    if (indisponibles.length === 0) {
        ulIndisponibles.innerHTML = `<li style="color: #94a3b8; font-size: 0.85rem; text-align: center; justify-content: center; padding: 0.5rem 0;">No hay indisponibles.</li>`;
    } else {
        ulIndisponibles.innerHTML = "";
        indisponibles.forEach((socio, index) => {
            const li = document.createElement("li");
            let nombreMostrar = "Socio";
            if (typeof socio === 'string') {
                nombreMostrar = `ID: ${socio.substring(0, 8)}...`;
            } else if (socio) {
                nombreMostrar = socio.nombreCompleto || `${socio.nombre || ''} ${socio.apellido || ''}`.trim() || "Socio";
            }
            li.innerHTML = `<span style="color: #f43f5e; font-weight: bold; font-size: 0.75rem;">${index + 1}.</span> ${nombreMostrar}`;
            ulIndisponibles.appendChild(li);
        });
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
