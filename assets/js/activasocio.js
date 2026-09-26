// assets/js/activasocio.js
import { comprobarAcceso, cerrarSesion } from "./auth.js";
import { supabaseClient } from "./supabase.js";

window.cerrarSesion = cerrarSesion;

comprobarAcceso(["administrador"], async (socioAdmin) => {
    await cargarTemporadasPendientes();
});

async function cargarTemporadasPendientes() {
    const selectTemporada = document.getElementById("selectTemporada");
    const gridPendientes = document.getElementById("gridPendientes");
    const mensajeActiva = document.getElementById("mensajeActiva");

    if (!selectTemporada || !gridPendientes) return;

    gridPendientes.innerHTML = `<div style="grid-column: span 5; text-align: center; padding: 2rem; color: #fff;">Cargando temporadas...</div>`;

    try {
        // 1. Cargar las temporadas disponibles desde la tabla 'temporada' ordenadas de más reciente a más antigua
        const { data: temporadasData, error: errTemp } = await supabaseClient
            .from("temporada")
            .select("temporada")
            .order("temporada", { ascending: false });

        if (errTemp) throw errTemp;

        selectTemporada.innerHTML = '<option value="">-- Selecciona una temporada --</option>';

        if (!temporadasData || temporadasData.length === 0) {
            selectTemporada.innerHTML = '<option value="">No hay temporadas registradas</option>';
            gridPendientes.innerHTML = `<div style="grid-column: span 5; text-align: center; padding: 2rem; color: #fff;">No hay temporadas registradas.</div>`;
            return;
        }

        temporadasData.forEach((item) => {
            if (item.temporada) {
                const option = document.createElement("option");
                option.value = item.temporada;
                option.textContent = item.temporada;
                selectTemporada.appendChild(option);
            }
        });

        // La primera opción (índice 1) es siempre la temporada actual (la más reciente)
        const temporadaActualVigente = temporadasData.length > 0 ? temporadasData[0].temporada : null;

        // Seleccionar por defecto la primera (la más reciente)
        if (selectTemporada.options.length > 1) {
            selectTemporada.selectedIndex = 1;
            const temporadaSeleccionada = selectTemporada.value;
            await gestionarVistaTemporada(temporadaSeleccionada, temporadaActualVigente, temporadasData);
        }

        // Evento al cambiar de temporada en el desplegable
        selectTemporada.onchange = async (e) => {
            const temporadaVal = e.target.value;
            if (temporadaVal) {
                await gestionarVistaTemporada(temporadaVal, temporadaActualVigente, temporadasData);
            } else {
                gridPendientes.innerHTML = `<div style="grid-column: span 5; text-align: center; padding: 2rem; color: #fff;">Selecciona una temporada...</div>`;
            }
        };

    } catch (err) {
        console.error("Error al cargar temporadas:", err);
        if (mensajeActiva) {
            mensajeActiva.style.color = "#d9534f";
            mensajeActiva.textContent = `Error: ${err.message}`;
        }
        gridPendientes.innerHTML = `<div style="grid-column: span 5; text-align: center; padding: 2rem; color: #d9534f;">Error al cargar datos.</div>`;
    }
}

// Función enrutadora: decide si cargar el flujo de activación (actual) o el flujo de histórico (pasadas)
async function gestionarVistaTemporada(temporadaSeleccionada, temporadaActualVigente, todasLasTemporadas) {
    // Determinamos si es la temporada actual (la primera de la lista)
    const esActual = (temporadaSeleccionada === temporadaActualVigente);

    if (esActual) {
        await cargarSociosPendientes(temporadaSeleccionada);
    } else {
        await cargarHistoricoTemporada(temporadaSeleccionada);
    }
}

// --- FLUJO 1: TEMPORADA ACTUAL (Activación de pendientes) ---
async function cargarSociosPendientes(temporada) {
    const gridPendientes = document.getElementById("gridPendientes");
    const mensajeActiva = document.getElementById("mensajeActiva");
    if (!gridPendientes) return;

    gridPendientes.innerHTML = `<div style="grid-column: span 5; text-align: center; padding: 2rem; color: #fff;">Cargando socios pendientes...</div>`;
    if (mensajeActiva) mensajeActiva.textContent = "";

    try {
        const { data: tempRecord, error: errTempRecord } = await supabaseClient
            .from("temporada")
            .select("users")
            .eq("temporada", temporada)
            .maybeSingle();

        if (errTempRecord) throw errTempRecord;

        if (!tempRecord || !tempRecord.users || tempRecord.users.length === 0) {
            gridPendientes.innerHTML = `<div style="grid-column: span 5; text-align: center; padding: 2rem; color: #fff;">No hay socios registrados en la temporada ${temporada}.</div>`;
            return;
        }

        const userIds = tempRecord.users;

        const { data: sociosPendientes, error: errSocios } = await supabaseClient
            .from("socios")
            .select("id, nombre, apellido, dni, activo")
            .in("id", userIds)
            .eq("activo", false);

        if (errSocios) throw errSocios;

        if (!sociosPendientes || sociosPendientes.length === 0) {
            gridPendientes.innerHTML = `<div style="grid-column: span 5; text-align: center; padding: 2rem; color: #fff;">¡Genial! No hay socios pendientes de activar para la temporada ${temporada}.</div>`;
            return;
        }

        gridPendientes.innerHTML = "";

        sociosPendientes.forEach((socio) => {
            const card = document.createElement("div");
            card.className = "socio-card-item";
            card.innerHTML = `
                <div class="socio-info">
                    <h4>${socio.nombre || ""} ${socio.apellido || ""}</h4>
                    <p>DNI: ${socio.dni || "-"}</p>
                </div>
                <div class="socio-action">
                    <button class="btn btn-primary btn-sm btn-activar-socio" data-id="${socio.id}" data-temporada="${temporada}">Activar</button>
                </div>
            `;
            gridPendientes.appendChild(card);
        });

        document.querySelectorAll(".btn-activar-socio").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                const socioId = e.target.getAttribute("data-id");
                const temporadaActual = e.target.getAttribute("data-temporada");

                btn.disabled = true;
                btn.textContent = "Activando...";

                try {
                    const { error: errUpdate } = await supabaseClient
                        .from("socios")
                        .update({ activo: true })
                        .eq("id", socioId);

                    if (errUpdate) throw errUpdate;

                    if (mensajeActiva) {
                        mensajeActiva.style.color = "#2e7d32";
                        mensajeActiva.textContent = "¡Socio activado correctamente!";
                    }

                    await cargarSociosPendientes(temporadaActual);

                } catch (err) {
                    console.error("Error al activar socio:", err);
                    if (mensajeActiva) {
                        mensajeActiva.style.color = "#d9534f";
                        mensajeActiva.textContent = `Error al activar: ${err.message}`;
                    }
                    btn.disabled = false;
                    btn.textContent = "Activar";
                }
            });
        });

    } catch (err) {
        console.error("Error al cargar socios pendientes:", err);
        gridPendientes.innerHTML = `<div style="grid-column: span 5; text-align: center; padding: 2rem; color: #d9534f;">Error al cargar la lista de pendientes.</div>`;
    }
}

// --- FLUJO 2: TEMPORADAS PASADAS (Histórico basado en la diferencia pagado - cuota) ---
async function cargarHistoricoTemporada(temporada) {
    const gridPendientes = document.getElementById("gridPendientes");
    const mensajeActiva = document.getElementById("mensajeActiva");
    if (!gridPendientes) return;

    gridPendientes.innerHTML = `<div style="grid-column: span 5; text-align: center; padding: 2rem; color: #fff;">Cargando histórico de la temporada ${temporada}...</div>`;
    if (mensajeActiva) mensajeActiva.textContent = "";

    try {
        // 1. Obtener los usuarios vinculados a esa temporada en la tabla 'temporada'
        const { data: tempRecord, error: errTempRecord } = await supabaseClient
            .from("temporada")
            .select("users")
            .eq("temporada", temporada)
            .maybeSingle();

        if (errTempRecord) throw errTempRecord;

        if (!tempRecord || !tempRecord.users || tempRecord.users.length === 0) {
            gridPendientes.innerHTML = `<div style="grid-column: span 5; text-align: center; padding: 2rem; color: #fff;">No hay registros históricos en la temporada ${temporada}.</div>`;
            return;
        }

        const userIds = tempRecord.users;

        // 2. Cargar los datos de esos socios y su array de pagos/cuotas
        const { data: sociosHistorico, error: errSocios } = await supabaseClient
            .from("socios")
            .select("id, nombre, apellido, dni, cantidad_pagada")
            .in("id", userIds);

        if (errSocios) throw errSocios;

        if (!sociosHistorico || sociosHistorico.length === 0) {
            gridPendientes.innerHTML = `<div style="grid-column: span 5; text-align: center; padding: 2rem; color: #fff;">No se encontraron socios para esta temporada.</div>`;
            return;
        }

        const sociosActivos = [];
        const sociosNoActivos = [];

        // 3. Clasificar comprobando si (pagado - cuota) es negativo
        sociosHistorico.forEach(socio => {
            let esActivo = false;
            const pagosArray = socio.cantidad_pagada;

            if (Array.isArray(pagosArray)) {
                const registroTemp = pagosArray.find(p => p.temporada === temporada);
                if (registroTemp) {
                    const pagado = Number(registroTemp.pagado || 0);
                    const cuota = Number(registroTemp.cuota || 0);
                    
                    // Si cuota - pagado NO es negativo (es decir, >= 0), se considera cubierto/activo
                    if ((cuota - pagado) >= 0) {
                        if (cuota - pagado < cuota) {
                            esActivo = true;
                        }
                    }
                }
            }

            if (esActivo) {
                sociosActivos.push(socio);
            } else {
                sociosNoActivos.push(socio);
            }
        });

        // 4. Renderizar las dos listas históricas
        gridPendientes.innerHTML = `
            <div style="grid-column: span 5; margin-bottom: 1rem;">
                <h3 style="color: #fff; border-bottom: 2px solid #2e7d32; padding-bottom: 0.5rem;">
                    🟢 Socios Activos / Cuota Cubierta (${sociosActivos.length})
                </h3>
            </div>
        `;

        if (sociosActivos.length === 0) {
            gridPendientes.innerHTML += `<div style="grid-column: span 5; color: #aaa; margin-bottom: 1.5rem; padding-left: 0.5rem;">Ningún socio cumple con la cuota cubierta en esta temporada.</div>`;
        } else {
            sociosActivos.forEach(socio => {
                const card = document.createElement("div");
                card.className = "socio-card-item";
                card.style.borderLeft = "4px solid #2e7d32";
                card.innerHTML = `
                    <div class="socio-info">
                        <h4>${socio.nombre || ""} ${socio.apellido || ""}</h4>
                        <p>DNI: ${socio.dni || "-"}</p>
                    </div>
                    <div class="socio-action">
                        <span style="color: #2e7d32; font-weight: bold; font-size: 0.9rem;">Activo (Al corriente)</span>
                    </div>
                `;
                gridPendientes.appendChild(card);
            });
        }

        // Sección de No Activos (pagado - cuota negativo)
        const headerNoActivos = document.createElement("div");
        headerNoActivos.style.gridColumn = "span 5";
        headerNoActivos.style.marginTop = "1.5rem";
        headerNoActivos.style.marginBottom = "1rem";
        headerNoActivos.innerHTML = `
            <h3 style="color: #fff; border-bottom: 2px solid #d9534f; padding-bottom: 0.5rem;">
                🔴 Socios No Activos / (Pagado - Cuota Negativo) (${sociosNoActivos.length})
            </h3>
        `;
        gridPendientes.appendChild(headerNoActivos);

        if (sociosNoActivos.length === 0) {
            const msgVacio = document.createElement("div");
            msgVacio.style.gridColumn = "span 5";
            msgVacio.style.color = "#aaa";
            msgVacio.style.paddingLeft = "0.5rem";
            msgVacio.textContent = "No hay socios con saldo negativo en esta temporada.";
            gridPendientes.appendChild(msgVacio);
        } else {
            sociosNoActivos.forEach(socio => {
                const card = document.createElement("div");
                card.className = "socio-card-item";
                card.style.borderLeft = "4px solid #d9534f";
                card.innerHTML = `
                    <div class="socio-info">
                        <h4>${socio.nombre || ""} ${socio.apellido || ""}</h4>
                        <p>DNI: ${socio.dni || "-"}</p>
                    </div>
                    <div class="socio-action">
                        <span style="color: #d9534f; font-weight: bold; font-size: 0.9rem;">No activado (Pendiente)</span>
                    </div>
                `;
                gridPendientes.appendChild(card);
            });
        }

    } catch (err) {
        console.error("Error al cargar histórico de la temporada:", err);
        gridPendientes.innerHTML = `<div style="grid-column: span 5; text-align: center; padding: 2rem; color: #d9534f;">Error al cargar el histórico.</div>`;
    }
}
