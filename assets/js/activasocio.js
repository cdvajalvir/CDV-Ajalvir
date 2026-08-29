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
        // 1. Cargar las temporadas disponibles desde la tabla 'temporada'
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

        // Seleccionar por defecto la primera (la más reciente) y cargar sus socios pendientes
        if (selectTemporada.options.length > 1) {
            selectTemporada.selectedIndex = 1;
            const temporadaSeleccionada = selectTemporada.value;
            await cargarSociosPendientes(temporadaSeleccionada);
        }

        // Evento al cambiar de temporada en el desplegable
        selectTemporada.onchange = async (e) => {
            const temporadaVal = e.target.value;
            if (temporadaVal) {
                await cargarSociosPendientes(temporadaVal);
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

async function cargarSociosPendientes(temporada) {
    const gridPendientes = document.getElementById("gridPendientes");
    const mensajeActiva = document.getElementById("mensajeActiva");
    if (!gridPendientes) return;

    gridPendientes.innerHTML = `<div style="grid-column: span 5; text-align: center; padding: 2rem; color: #fff;">Cargando socios pendientes...</div>`;
    if (mensajeActiva) mensajeActiva.textContent = "";

    try {
        // 2. Obtener el array de usuarios asociados a esa temporada
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

        // 3. Buscar en la tabla 'socios' los que estén en ese array y tengan activo = false
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

        // 4. Asignar eventos a los botones de activar
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

                    // Recargar la rejilla para reflejar los cambios
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
