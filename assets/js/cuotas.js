// assets/js/cuotas.js
import { comprobarAcceso, cerrarSesion } from "./auth.js";
import { supabaseClient } from "./supabase.js";

window.cerrarSesion = cerrarSesion;

comprobarAcceso(["administrador"], async (socioAdmin) => {
    await cargarValoresTemporadas();
});

async function cargarValoresTemporadas() {
    const tbody = document.getElementById("tbodyValoresCuota");
    const mensaje = document.getElementById("mensajeCuotas");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 2rem;">Cargando valores de cuota...</td></tr>`;

    // Obtenemos los datos actualizados del admin para pintar las temporadas existentes
    const { data: adminData, error } = await supabaseClient
        .from("socios")
        .select("cantidad_pagada")
        .eq("rol", "administrador")
        .limit(1)
        .maybeSingle();

    if (error || !adminData) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 2rem; color: #d9534f;">Error al cargar las temporadas.</td></tr>`;
        return;
    }

    let cuotasArray = adminData.cantidad_pagada;

    if (typeof cuotasArray === "string") {
        try { cuotasArray = JSON.parse(cuotasArray); } catch (e) { cuotasArray = []; }
    }
    if (cuotasArray && !Array.isArray(cuotasArray) && typeof cuotasArray === "object") {
        cuotasArray = Object.values(cuotasArray);
    }

    if (!Array.isArray(cuotasArray) || cuotasArray.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 2rem;">No hay temporadas registradas.</td></tr>`;
        return;
    }

    tbody.innerHTML = "";

    cuotasArray.forEach((item, index) => {
        if (!item) return;

        const temporada = item.temporada || "-";
        const cuotaValor = Number(item.cuota) || 0;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${temporada}</strong></td>
            <td>
                <input type="number" step="0.01" class="input-cuota-edit" id="input-cuota-${index}" value="${cuotaValor}">
            </td>
            <td>
                <button class="btn btn-primary btn-sm" data-temporada="${temporada}" data-index="${index}">Actualizar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Añadir eventos a los botones de actualizar
    document.querySelectorAll(".btn-sm").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const temporadaMeta = e.target.getAttribute("data-temporada");
            const index = e.target.getAttribute("data-index");
            const inputVal = document.getElementById(`input-cuota-${index}`);
            const nuevoValorCuota = Number(inputVal.value);

            if (isNaN(nuevoValorCuota) || nuevoValorCuota < 0) {
                mensaje.style.color = "#d9534f";
                mensaje.textContent = "Por favor, introduce un valor de cuota válido.";
                return;
            }

            btn.disabled = true;
            btn.textContent = "Actualizando...";
            mensaje.textContent = "";

            try {
                // 1. Obtener todos los socios de la base de datos
                const { data: todosLosSocios, error: errSocios } = await supabaseClient
                    .from("socios")
                    .select("id, cantidad_pagada");

                if (errSocios) throw errSocios;

                // 2. Recorrer y actualizar el JSONB de cada socio que tenga esa temporada
                for (const socio of todosLosSocios) {
                    let arrSociosCuotas = socio.cantidad_pagada;

                    if (typeof arrSociosCuotas === "string") {
                        try { arrSociosCuotas = JSON.parse(arrSociosCuotas); } catch (err) { arrSociosCuotas = []; }
                    }
                    if (arrSociosCuotas && !Array.isArray(arrSociosCuotas) && typeof arrSociosCuotas === "object") {
                        arrSociosCuotas = Object.values(arrSociosCuotas);
                    }

                    if (Array.isArray(arrSociosCuotas)) {
                        let modificado = false;
                        
                        arrSociosCuotas = arrSociosCuotas.map(c => {
                            if (c && String(c.temporada).trim() === String(temporadaMeta).trim()) {
                                modificado = true;
                                return { ...c, cuota: nuevoValorCuota }; // Actualiza solo la cuota, preservando 'pagado'
                            }
                            return c;
                        });

                        if (modificado) {
                            const { error: errUpdate } = await supabaseClient
                                .from("socios")
                                .update({ cantidad_pagada: arrSociosCuotas })
                                .eq("id", socio.id);

                            if (errUpdate) {
                                console.warn(`Error al actualizar socio ID ${socio.id}:`, errUpdate.message);
                            }
                        }
                    }
                }

                mensaje.style.color = "#2e7d32";
                mensaje.textContent = `¡Cuota de la temporada ${temporadaMeta} actualizada correctamente para todos los socios afectados!`;
            } catch (err) {
                mensaje.style.color = "#d9534f";
                mensaje.textContent = `Error al actualizar: ${err.message}`;
            } finally {
                btn.disabled = false;
                btn.textContent = "Actualizar";
            }
        });
    });
}
