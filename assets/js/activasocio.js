import { supabase } from "./supabaseClient.js";

document.addEventListener("DOMContentLoaded", async () => {
    const selectTemporada = document.getElementById("selectTemporada");
    const tbodyPendientes = document.getElementById("tbodyPendientes");
    const mensajeActiva = document.getElementById("mensajeActiva");

    let temporadaActualSeleccionada = "";

    // 1. Cargar las temporadas disponibles en el desplegable
    async function cargarTemporadas() {
        try {
            console.log("Consultando temporadas en Supabase...");
            
            // Consultamos la tabla temporada ordenadas por temporada descendente
            const { data, error } = await supabase
                .from("temporada")
                .select("temporada")
                .order("temporada", { ascending: false });

            if (error) {
                console.error("Error devuelto por Supabase:", error);
                throw error;
            }

            console.log("Datos de temporadas recibidos:", data);

            selectTemporada.innerHTML = '<option value="">-- Selecciona una temporada --</option>';

            if (data && data.length > 0) {
                data.forEach((item) => {
                    // Verificamos que el campo exista (puede venir como item.temporada)
                    const valorTemporada = item.temporada;
                    if (valorTemporada) {
                        const option = document.createElement("option");
                        option.value = valorTemporada;
                        option.textContent = valorTemporada;
                        selectTemporada.appendChild(option);
                    }
                });

                // Si se cargaron opciones válidas, seleccionamos la primera por defecto
                if (selectTemporada.options.length > 1) {
                    selectTemporada.selectedIndex = 1;
                    temporadaActualSeleccionada = selectTemporada.value;
                    console.log("Temporada seleccionada por defecto:", temporadaActualSeleccionada);
                    cargarSociosPendientes(temporadaActualSeleccionada);
                } else {
                    selectTemporada.innerHTML = '<option value="">No hay temporadas válidas</option>';
                }
            } else {
                selectTemporada.innerHTML = '<option value="">No hay temporadas registradas</option>';
            }
        } catch (err) {
            console.error("Excepción en cargarTemporadas:", err);
            mensajeActiva.textContent = "Error al cargar las temporadas. Revisa la consola.";
            mensajeActiva.style.color = "#ff6b6b";
            selectTemporada.innerHTML = '<option value="">Error de carga</option>';
        }
    }

    // 2. Cargar socios que están en la temporada pero tienen activo = false
    async function cargarSociosPendientes(temporada) {
        tbodyPendientes.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2rem;">Cargando socios pendientes...</td></tr>`;
        mensajeActiva.textContent = "";

        try {
            console.log(`Buscando registro para la temporada: ${temporada}`);

            // Paso A: Obtener el registro de la temporada seleccionada
            const { data: tempRecord, error: tempError } = await supabase
                .from("temporada")
                .select("users")
                .eq("temporada", temporada)
                .maybeSingle();

            if (tempError) throw tempError;

            if (!tempRecord || !tempRecord.users || tempRecord.users.length === 0) {
                tbodyPendientes.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2rem;">No hay socios registrados en la temporada ${temporada}.</td></tr>`;
                return;
            }

            const userIds = tempRecord.users;
            console.log("IDs de usuarios en esta temporada:", userIds);

            // Paso B: Cruzar con la tabla socios filtrando aquellos cuyo activo sea false
            const { data: sociosPendientes, error: sociosError } = await supabase
                .from("socios")
                .select("id, nombre, apellido, dni, email, activo")
                .in("id", userIds)
                .eq("activo", false);

            if (sociosError) throw sociosError;

            console.log("Socios pendientes encontrados:", sociosPendientes);

            if (!sociosPendientes || sociosPendientes.length === 0) {
                tbodyPendientes.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2rem;">¡Genial! No hay socios pendientes de activar para la temporada ${temporada}.</td></tr>`;
                return;
            }

            // Paso C: Renderizar la tabla con los pendientes
            tbodyPendientes.innerHTML = "";
            sociosPendientes.forEach((socio) => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td><strong>${socio.nombre || ""} ${socio.apellido || ""}</strong></td>
                    <td>${socio.dni || "-"}</td>
                    <td>${socio.email || "-"}</td>
                    <td><span class="badge-pending">Pendiente activar</span></td>
                    <td style="text-align: right;">
                        <button class="btn btn-primary btn-sm btn-activar" data-id="${socio.id}">Activar</button>
                    </td>
                `;
                tbodyPendientes.appendChild(tr);
            });

            // Asignar eventos a los botones de activar
            document.querySelectorAll(".btn-activar").forEach((btn) => {
                btn.addEventListener("click", async (e) => {
                    const socioId = e.target.getAttribute("data-id");
                    await activarSocio(socioId, temporada);
                });
            });

        } catch (err) {
            console.error("Error cargando socios pendientes:", err);
            tbodyPendientes.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2rem; color: #ff6b6b;">Error al cargar los datos.</td></tr>`;
        }
    }

    // 3. Función para cambiar el campo activo a true en la tabla socios
    async function activarSocio(socioId, temporada) {
        try {
            const { error } = await supabase
                .from("socios")
                .update({ activo: true })
                .eq("id", socioId);

            if (error) throw error;

            mensajeActiva.textContent = "¡Socio activado correctamente!";
            mensajeActiva.style.color = "#4ade80";

            // Recargar la lista para que desaparezca de pendientes
            cargarSociosPendientes(temporada);

        } catch (err) {
            console.error("Error al activar socio:", err);
            mensajeActiva.textContent = "Hubo un error al activar el socio.";
            mensajeActiva.style.color = "#ff6b6b";
        }
    }

    // Evento al cambiar de temporada en el desplegable
    selectTemporada.addEventListener("change", (e) => {
        temporadaActualSeleccionada = e.target.value;
        if (temporadaActualSeleccionada) {
            cargarSociosPendientes(temporadaActualSeleccionada);
        } else {
            tbodyPendientes.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2rem;">Selecciona una temporada...</td></tr>`;
        }
    });

    // Inicializar carga al abrir la página
    cargarTemporadas();
});
