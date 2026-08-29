// assets/js/activasocio.js
import { comprobarAcceso, cerrarSesion } from "./auth.js";
import { supabaseClient } from "./supabase.js";

window.cerrarSesion = cerrarSesion;

comprobarAcceso(["administrador"], async (socioAdmin) => {
    await cargarTemporadasPendientes();
});

async function cargarTemporadasPendientes() {
    const selectTemporada = document.getElementById("selectTemporada");
    const tbodyPendientes = document.getElementById("tbodyPendientes");
    const mensajeActiva = document.getElementById("mensajeActiva");

    if (!selectTemporada || !tbodyPendientes) return;

    tbodyPendientes.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 2rem;">Cargando temporadas...</td></tr>`;

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
            tbodyPendientes.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 2rem;">No hay temporadas registradas.</td></tr>`;
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
                tbodyPendientes.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 2rem;">Selecciona una temporada...</td></tr>`;
            }
        };

    } catch (err) {
        console.error("Error al cargar temporadas:", err);
        if (mensajeActiva) {
            mensajeActiva.style.color = "#d9534f";
            mensajeActiva.textContent = `Error: ${err.message}`;
        }
        tbodyPendientes.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 2rem; color: #d9534f;">Error al cargar datos.</td></tr>`;
    }
}

async function cargarSociosPendientes(temporada) {
    const tbodyPendientes = document.getElementById("tbodyPendientes");
    const mensajeActiva = document.getElementById("mensajeActiva");
    if (!tbodyPendientes) return;

    tbodyPendientes.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 2rem;">Cargando socios pendientes...</td></tr>`;
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
            tbodyPendientes.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 2rem;">No hay socios registrados en la temporada ${temporada}.</td></tr>`;
            return;
        }

        const userIds = tempRecord.users;

        // 3. Buscar en la tabla 'socios' los que estén en ese array y tengan activo = false (sin pedir email ni estado)
        const { data: sociosPendientes, error: errSocios } = await supabaseClient
            .from("socios")
            .select("id, nombre, apellido, dni, activo")
            .in("id", userIds)
            .eq("activo", false);

        if (errSocios) throw errSocios;

        if (!sociosPendientes || sociosPendientes.length === 0) {
            tbodyPendientes.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 2rem;">¡Genial! No hay socios pendientes de activar para la temporada ${temporada}.</td></tr>`;
            return;
        }

        tbodyPendientes.innerHTML = "";

        sociosPendientes.forEach((socio) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${socio.nombre || ""} ${socio.apellido || ""}</strong></td>
                <td>${socio.dni || "-"}</td>
                <td style="text-align: right;">
                    <button class="btn btn-primary btn-sm btn-activar-socio" data-id="${socio.id}" data-temporada="${temporada}">Activar</button>
                </td>
            `;
            tbodyPendientes.appendChild(tr);
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

                    // Recargar la tabla para reflejar los cambios
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
        tbodyPendientes.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 2rem; color: #d9534f;">Error al cargar la lista de pendientes.</td></tr>`;
    }
}
