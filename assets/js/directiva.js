import { supabaseClient } from "./supabase.js";
import { comprobarAcceso, cerrarSesion } from "./auth.js";

window.cerrarSesion = cerrarSesion;

let chartCuotasInstance = null; // Control de instancia del gráfico
let globalDirectivos = [];
let globalMovimientos = [];

document.addEventListener("DOMContentLoaded", () => {
    // Protección estricta de la página de directiva
    comprobarAcceso(["administrador", "directiva"], async (usuario) => {
        console.log("Acceso concedido a Directiva:", usuario);
        await inicializarPanelDirectiva();
    });
});

// Función para calcular la temporada actual en formato xxxx/xxxx según el mes actual (Septiembre -> Agosto)
function calcularTemporadaActual() {
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = ahora.getMonth(); // 0 = Enero, 8 = Septiembre
    return mes >= 8 ? `${anio}/${anio + 1}` : `${anio - 1}/${anio}`;
}

async function inicializarPanelDirectiva() {
    try {
        // 1. Obtener socios, movimientos y las temporadas desde Supabase
        const [resSocios, resMovs, resTemps] = await Promise.all([
            supabaseClient.from("socios").select("id, nombre, apellido, rol, activo, cantidad_pagada"),
            supabaseClient.from("movimientos").select("codigo_cuenta, importe, temporada"),
            supabaseClient.from("temporadas").select("temporada")
        ]);

        if (resSocios.error) throw resSocios.error;
        globalDirectivos = resSocios.data || [];
        globalMovimientos = resMovs.data || [];

        // 2. Poblar el selector de temporadas en el menú lateral (<select id="selectTemporada">)
        const selectTemp = document.getElementById("selectTemporada");
        if (selectTemp) {
            let temporadasSet = new Set();
            
            // Recorrer los resultados de la tabla temporadas de forma segura
            if (resTemps.data && Array.isArray(resTemps.data)) {
                resTemps.data.forEach(t => {
                    // Extraemos la propiedad temporada y evitamos nulos
                    const valorTemp = t.temporada;
                    if (valorTemp) {
                        temporadasSet.add(String(valorTemp).trim());
                    }
                });
            }

            const temporadaActualCalculada = calcularTemporadaActual();
            temporadasSet.add(temporadaActualCalculada); // Asegurar que la temporada actual esté presente

            // Ordenar de forma descendente (ej. 2025/2026, 2024/2025, 2023/2024)
            const listaOrdenada = Array.from(temporadasSet).sort().reverse();

            selectTemp.innerHTML = "";
            listaOrdenada.forEach(temp => {
                const opt = document.createElement("option");
                opt.value = temp;
                opt.textContent = temp;
                if (temp === temporadaActualCalculada) {
                    opt.selected = true;
                }
                selectTemp.appendChild(opt);
            });

            // Escuchar cambios en el selector para actualizar dinámicamente todo el panel
            selectTemp.removeEventListener("change", manejadorCambioTemporada);
            selectTemp.addEventListener("change", manejadorCambioTemporada);
        }

        // Carga inicial del panel usando la temporada seleccionada por defecto (la actual)
        const temporadaInicial = selectTemp ? selectTemp.value : calcularTemporadaActual();
        actualizarVistaPorTemporada(temporadaInicial);

    } catch (err) {
        console.error("Error al inicializar el panel de directiva:", err);
    }
}

function manejadorCambioTemporada(e) {
    actualizarVistaPorTemporada(e.target.value);
}

// Función que actualiza métricas, gráfico y tabla según la temporada elegida
function actualizarVistaPorTemporada(temporadaSeleccionada) {
    console.log("Actualizando panel para la temporada:", temporadaSeleccionada);

    // Filtrar perfiles de directiva o administradores
    const miembrosGestion = globalDirectivos.filter(s => s.rol === "directiva" || s.rol === "administrador");

    // Rellenar métricas rápidas del panel superior si existen los elementos
    const elemSociosActivos = document.getElementById("sociosActivos");
    const elemTotalDirectiva = document.getElementById("totalDirectiva");
    const elemTotalAdmin = document.getElementById("totalAdmin");

    if (elemSociosActivos) elemSociosActivos.textContent = globalDirectivos.filter(s => s.activo).length;
    if (elemTotalDirectiva) elemTotalDirectiva.textContent = globalDirectivos.filter(s => s.rol === "directiva").length;
    if (elemTotalAdmin) elemTotalAdmin.textContent = globalDirectivos.filter(s => s.rol === "administrador").length;

    // --- CÁLCULO DEL GRÁFICO DE TARTA LEYENDO EL JSONB 'cantidad_pagada' ---
    let totalPagados = 0;
    let totalPendientes = 0;

    globalDirectivos.forEach(socio => {
        let pagadoCantidad = 0;

        // Comprobamos la estructura JSONB de cantidad_pagada para la temporada seleccionada
        if (socio.cantidad_pagada && typeof socio.cantidad_pagada === 'object') {
            const datosTemporada = socio.cantidad_pagada[temporadaSeleccionada];
            if (datosTemporada) {
                pagadoCantidad = parseFloat(datosTemporada.pagado || datosTemporada.cuota || 0);
            }
        }

        if (pagadoCantidad !== 0) {
            totalPagados++;
        } else {
            totalPendientes++;
        }
    });

    renderizarGraficoCuotas(totalPagados, totalPendientes, temporadaSeleccionada);
    // ---------------------------------------------------------------------

    // --- CÁLCULO Y RENDERIZADO DE LA TABLA DE SALDOS ---
    const tbody = document.querySelector("#tablaSaldosDirectiva tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    // Filtrar movimientos de la temporada seleccionada
    const movimientosFiltrados = globalMovimientos.filter(m => !m.temporada || m.temporada === temporadaSeleccionada);

    // Agrupar y sumar los importes por UUID
    const saldosPorUuid = {};
    movimientosFiltrados.forEach(mov => {
        const uuid = mov.codigo_cuenta;
        const importe = parseFloat(mov.importe) || 0;
        if (!saldosPorUuid[uuid]) {
            saldosPorUuid[uuid] = 0;
        }
        saldosPorUuid[uuid] += importe;
    });

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
            
            tdSaldo.style.setProperty("color", saldoTotal < 0 ? "#f87171" : "#86efac", "important");
            tdSaldo.style.whiteSpace = "nowrap";
            
            tr.appendChild(tdNombre);
            tr.appendChild(tdSaldo);
            tbody.appendChild(tr);
        }
    });

    if (filasRenderizadas === 0) {
        tbody.innerHTML = `<tr><td colspan="2" style="text-align: center;">No hay miembros de directiva con saldo pendiente en la temporada ${temporadaSeleccionada}.</td></tr>`;
    }
}

// Función encargada de pintar o actualizar el gráfico de tarta con Chart.js
function renderizarGraficoCuotas(pagados, pendientes, temporadaLabel) {
    const canvasElement = document.getElementById("graficoCuotas");
    if (!canvasElement) return;

    const ctx = canvasElement.getContext("2d");

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
                title: {
                    display: true,
                    text: `Temporada ${temporadaLabel}`,
                    color: '#ffffff',
                    font: { size: 14 }
                },
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#ffffff',
                        font: { size: 13 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const valor = context.raw || 0;
                            const porcentaje = totalSocios >0 ? ((valor / totalSocios) * 100).toFixed(1) : 0;
                            return ` ${context.label}: ${porcentaje}% (${valor} socios)`;
                        }
                    }
                }
            }
        }
    });
}
