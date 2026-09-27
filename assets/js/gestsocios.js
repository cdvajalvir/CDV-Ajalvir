import { supabaseClient } from "./supabase.js";

// Verificación de permisos para administradores y directiva
async function verificarPermisoAdmin() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = "../index.html";
        return;
    }

    const { data: socio } = await supabaseClient
        .from("socios")
        .select("rol")
        .eq("id", session.user.id)
        .single();

    // Comprobamos que el rol sea administrador, admin o directiva
    const rolUsuario = socio ? socio.rol : "";
    const rolesPermitidos = ["administrador", "directiva"];

    if (!socio || !rolesPermitidos.includes(rolUsuario)) {
        alert("Acceso denegado: Se requieren permisos de administración o directiva.");
        window.location.href = "../index.html";
    }
}

verificarPermisoAdmin();

window.addEventListener("DOMContentLoaded", async () => {
    const tablaBody = document.querySelector("#tablaGestSocios tbody");
    const contadorSocios = document.getElementById("contadorSocios");
    const buscador = document.getElementById("buscadorSocios");

    let listaSociosGlobal = [];
    const temporadaActual = "2026/2027"; // Temporada fija actual

    // Cargar datos desde Supabase / Edge Function
    async function cargarSocios() {
        try {
            contadorSocios.textContent = "Cargando socios...";
            
            const { data, error } = await supabaseClient.functions.invoke('get-socios', {
                body: { temporada: temporadaActual }
            });

            if (error) throw error;

            listaSociosGlobal = data.data || [];
            renderizarSocios(listaSociosGlobal);

        } catch (err) {
            console.error("Error al cargar socios:", err);
            tablaBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 2rem; color: #dc2626;">Error al cargar los datos de los socios.</td></tr>`;
            contadorSocios.textContent = "Error de carga";
        }
    }

    // Renderizar la tabla de socios aplicando filtros de búsqueda
    function renderizarSocios(socios) {
        const textoBusqueda = buscador.value.toLowerCase().trim();

        const sociosFiltrados = socios.filter(s => {
            const nombreCompleto = `${s.nombre || ''} ${s.apellido || ''}`.toLowerCase();
            return nombreCompleto.includes(textoBusqueda);
        });

        if (sociosFiltrados.length === 0) {
            tablaBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 2rem; color: #666;">No se encontraron socios.</td></tr>`;
            contadorSocios.textContent = "0 socios encontrados";
            return;
        }

        contadorSocios.textContent = `${sociosFiltrados.length} socio(s) mostrados`;

        tablaBody.innerHTML = sociosFiltrados.map(socio => {
            const esActivo = socio.activo === true;
            const colorEstado = esActivo ? "#16a34a" : "#dc2626";
            const textoEstado = esActivo ? "Activo" : "Inactivo";

            let cuotaTotal = 0;
            let cuotaPagada = 0;

            try {
                let cuotasArray = socio.cantidad_pagada;
                if (typeof cuotasArray === 'string') {
                    cuotasArray = JSON.parse(cuotasArray);
                }
                if (Array.isArray(cuotasArray)) {
                    const infoTemporada = cuotasArray.find(c => c.temporada === temporadaActual);
                    if (infoTemporada) {
                        cuotaTotal = infoTemporada.cuota || 0;
                        cuotaPagada = infoTemporada.pagado || 0;
                    }
                }
            } catch (e) {
                console.error("Error al parsear cuotas para socio:", socio.id);
            }

            const colorPago = cuotaPagada >= cuotaTotal && cuotaTotal > 0 ? "#16a34a" : (cuotaPagada > 0 ? "#d97706" : "#dc2626");

            return `
                <tr style="border-bottom: 1px solid var(--border-color, #e5e7eb);">
                    <td style="padding: 0.75rem; white-space: nowrap;">
                        <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${colorEstado}; margin-right: 6px;"></span>
                        <span style="font-size: 0.85rem; font-weight: 500; color: ${colorEstado};">${textoEstado}</span>
                    </td>
                    <td style="padding: 0.75rem; font-weight: 500;">
                        ${socio.apellido || ''}, ${socio.nombre || ''}
                    </td>
                    <td style="padding: 0.75rem; text-align: center; font-weight: 600; color: ${colorPago};">
                        ${cuotaPagada}€ <span style="font-weight: normal; font-size: 0.85rem; color: #666;">/ ${cuotaTotal}€</span>
                    </td>
                    <td style="padding: 0.75rem; text-align: center; font-weight: 500;">
                        ${socio.visitas ?? 0}
                    </td>
                </tr>
            `;
        }).join("");
    }

    buscador.addEventListener("input", () => {
        renderizarSocios(listaSociosGlobal);
    });

    await cargarSocios();
});
