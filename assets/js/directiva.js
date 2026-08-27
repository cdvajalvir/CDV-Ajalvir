import { supabaseClient } from "./supabase.js";
import { comprobarAcceso, cerrarSesion } from "./auth.js";

window.cerrarSesion = cerrarSesion;

let chartCuotasInstance = null; // Variable para controlar la instancia del gráfico y evitar duplicados

document.addEventListener("DOMContentLoaded", () => {
    // Protección estricta de la página de directiva
    comprobarAcceso(["administrador", "directiva"], async (usuario) => {
        console.log("Acceso concedido a Directiva:", usuario);
        await cargarDatosDirectiva();
    });
});

async function cargarDatosDirectiva() {
    try {
        // 1. Obtener todos los socios (para métricas, listados y gráfico de cuotas)
        const { data: directivos, error: errorSocios } = await supabaseClient
            .from("socios")
            .select("id, nombre, apellido, rol, activo, cantidad_pagada"); // Aseguramos traer cantidad_pagada

        if (errorSocios) throw errorSocios;

        // Filtrar perfiles de directiva o administradores para la tabla de saldos
        const miembrosGestion = directivos.filter(s => s.rol === "directiva" || s.rol === "administrador");

        // Rellenar métricas rápidas del panel superior si existen los elementos
        const elemSociosActivos = document.getElementById("sociosActivos");
        const elemTotalDirectiva = document.getElementById("totalDirectiva");
        const elemTotalAdmin = document.getElementById("totalAdmin");

        if (elemSociosActivos) elemSociosActivos.textContent = directivos.filter(s => s.activo).length;
        if (elemTotalDirectiva) elemTotalDirectiva.textContent = directivos.filter(s => s.rol === "directiva").length;
        if (elemTotalAdmin) elemTotalAdmin.textContent = directivos.filter(s => s.rol === "administrador").length;

        // --- CÁLCULO Y RENDERIZADO DEL GRÁFICO DE TARTA (CUOTAS) ---
        // Socios con cantidad pagada diferente de 0 vs cantidad pagada igual a 0 (o nula)
        let totalPagados = 0;
        let totalPendientes = 0;

        directivos.forEach(socio => {
            const pagado = parseFloat(socio.cantidad_pagada) || 0;
            if (pagado !== 0) {
                totalPagados++;
            } else {
                totalPendientes++;
            }
        });

        renderizarGraficoCuotas(totalPagados, totalPendientes);
        // -----------------------------------------------------------

        // 2. Obtener todos los movimientos financieros para calcular saldos
        const { data: movimientos, error: errorMovs } = await supabaseClient
            .from("movimientos")
            .select("codigo_cuenta, importe");

        if (errorMovs) {
            console.warn("No se pudo cargar la tabla de movimientos o está vacía:", errorMovs.message);
        }

        // Agrupar y sumar los importes por UUID
        const saldosPorUuid = {};
        if (movimientos) {
            movimientos.forEach(mov => {
                const uuid = mov.codigo_cuenta;
                const importe = parseFloat(mov.importe) || 0;
                if (!saldosPorUuid[uuid]) {
                    saldosPorUuid[uuid] = 0;
                }
                saldosPorUuid[uuid] += importe;
            });
        }

        // 3. Cruzar los datos de los miembros con sus saldos calculados
        const tbody = document.querySelector("#tablaSaldosDirectiva tbody");
        if (!tbody) return;

        tbody.innerHTML = "";

        let filasRenderizadas = 0;

        miembrosGestion.forEach(miembro => {
            const saldoTotal = saldosPorUuid[miembro.id] || 0;

            // Filtro: Si el saldo es 0, no se muestra
            if (saldoTotal !== 0) {
                filasRenderizadas++;
                const tr = document.createElement("tr");

                const tdNombre = document.createElement("td");
                tdNombre.textContent = `${miembro.nombre} ${miembro.apellido}`;
                tdNombre.style.whiteSpace = "nowrap";

                const tdSaldo = document.createElement("td");
                tdSaldo.style.textAlign = "right";
                tdSaldo.textContent = `${saldoTotal.toFixed(2)} €`;
                
                // Color con alta visibilidad y !important para evitar conflictos
                tdSaldo.style.setProperty("color", saldoTotal < 0 ? "#f87171" : "#86efac", "important");
                tdSaldo.style.whiteSpace = "nowrap";
                
                tr.appendChild(tdNombre);
                tr.appendChild(tdSaldo);
                tbody.appendChild(tr);
            }
        });

        if (filasRenderizadas === 0) {
            tbody.innerHTML = `<tr><td colspan="2" style="text-align: center;">No hay miembros de directiva o administración con saldo pendiente o a favor.</td></tr>`;
        }

    } catch (err) {
        console.error("Error al cargar los datos del panel de directiva:", err);
        const tbody = document.querySelector("#tablaSaldosDirectiva tbody");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="2" style="text-align: center; color: red;">Error al cargar los saldos.</td></tr>`;
        }
    }
}

// Función encargada de pintar o actualizar el gráfico de tarta con Chart.js
function renderizarGraficoCuotas(pagados, pendientes) {
    const canvasElement = document.getElementById("graficoCuotas");
    if (!canvasElement) return;

    const ctx = canvasElement.getContext("2d");

    // Si ya existía una instancia previa, la destruimos para evitar solapamientos al recargar
    if (chartCuotasInstance) {
        chartCuotasInstance.destroy();
    }

    const totalSocios = pagados + pendientes;

    chartCuotasInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Pagados', 'Pendientes'],
            datasets: [{
                data: [pagados, pendientes],
                backgroundColor: [
                    '#3b82f6', // Azul para los pagados
                    '#f97316'  // Naranja para los pendientes
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#ffffff',
                        font: {
                            size: 13
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const valor = context.raw || 0;
                            const porcentaje = totalSocios > 0 ? ((valor / totalSocios) * 100).toFixed(1) : 0;
                            return ` ${context.label}: ${porcentaje}% (${valor} socios)`;
                        }
                    }
                }
            }
        }
    });
}
