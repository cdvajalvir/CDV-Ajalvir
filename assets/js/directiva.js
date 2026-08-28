import { supabaseClient } from "./supabase.js";
import { comprobarAcceso, cerrarSesion } from "./auth.js";

window.cerrarSesion = cerrarSesion;

let chartCuotasInstance = null; // Control de instancia del gráfico de tarta de cuotas
let chartDetalleGastosInstance = null; // Control de instancia del gráfico de tarta de detalle de gastos
let chartIngresosGastosInstance = null; // Control de instancia del gráfico de barras
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
        // 1. Obtener socios, movimientos y las temporadas desde la tabla 'temporada'
        const [resSocios, resMovs, resTemps] = await Promise.all([
            supabaseClient.from("socios").select("id, nombre, apellido, rol, activo, cantidad_pagada"),
            supabaseClient.from("movimientos").select("codigo_cuenta, importe, temporada, fecha_apunte, tipo"),
            supabaseClient.from("temporada").select("temporada")
        ]);

        if (resSocios.error) throw resSocios.error;
        globalDirectivos = resSocios.data || [];
        globalMovimientos = resMovs.data || [];

        // 2. Poblar el selector de temporadas en el menú lateral (<select id="selectTemporada">)
        const selectTemp = document.getElementById("selectTemporada");
        if (selectTemp) {
            let temporadasSet = new Set();
            
            if (resTemps.data && Array.isArray(resTemps.data)) {
                resTemps.data.forEach(t => {
                    const valorTemp = t.temporada;
                    if (valorTemp) {
                        temporadasSet.add(String(valorTemp).trim());
                    }
                });
            }

            const temporadaActualCalculada = calcularTemporadaActual();
            temporadasSet.add(temporadaActualCalculada);

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

            selectTemp.removeEventListener("change", manejadorCambioTemporada);
            selectTemp.addEventListener("change", manejadorCambioTemporada);
        }

        const temporadaInicial = selectTemp ? selectTemp.value : calcularTemporadaActual();
        actualizarVistaPorTemporada(temporadaInicial);

    } catch (err) {
        console.error("Error al inicializar el panel de directiva:", err);
    }
}

function manejadorCambioTemporada(e) {
    actualizarVistaPorTemporada(e.target.value);
}

// Función que actualiza métricas, gráficos y tabla según la temporada elegida
function actualizarVistaPorTemporada(temporadaSeleccionada) {
    console.log("Actualizando panel para la temporada:", temporadaSeleccionada);

    const miembrosGestion = globalDirectivos.filter(s => s.rol === "directiva" || s.rol === "administrador");

    const elemSociosActivos = document.getElementById("sociosActivos");
    const elemTotalDirectiva = document.getElementById("totalDirectiva");
    const elemTotalAdmin = document.getElementById("totalAdmin");

    if (elemSociosActivos) elemSociosActivos.textContent = globalDirectivos.filter(s => s.activo).length;
    if (elemTotalDirectiva) elemTotalDirectiva.textContent = globalDirectivos.filter(s => s.rol === "directiva").length;
    if (elemTotalAdmin) elemTotalAdmin.textContent = globalDirectivos.filter(s => s.rol === "administrador").length;

    // --- CÁLCULO DEL GRÁFICO DE TARTA DE CUOTAS (3 ESTADOS) ---
    let totalSociosTemporada = 0;
    let pagadasTotalidad = 0;
    let pagadasParciales = 0;
    let noPagadas = 0;

    globalDirectivos.forEach(socio => {
        if (socio.cantidad_pagada && Array.isArray(socio.cantidad_pagada)) {
            const datosTemporada = socio.cantidad_pagada.find(item => item.temporada === temporadaSeleccionada);
            
            if (datosTemporada) {
                totalSociosTemporada++;
                
                const cuota = parseFloat(datosTemporada.cuota || 0);
                const pagado = parseFloat(datosTemporada.pagado || 0);

                if (pagado >= cuota && cuota > 0) {
                    pagadasTotalidad++;
                } else if (pagado > 0 && pagado < cuota) {
                    pagadasParciales++;
                } else {
                    noPagadas++;
                }
            }
        }
    });

    renderizarGraficoCuotasTresEstados(pagadasTotalidad, pagadasParciales, noPagadas, temporadaSeleccionada, totalSociosTemporada);

    // --- CÁLCULO Y RENDERIZADO DEL GRÁFICO DE TARTA DE DETALLE DE GASTOS ---
    procesarYRenderizarDetalleGastos(globalMovimientos, temporadaSeleccionada);

    // --- CÁLCULO Y RENDERIZADO DEL GRÁFICO DE BARRAS DE INGRESOS Y GASTOS ---
    procesarYRenderizarGraficoBarras(globalMovimientos, temporadaSeleccionada);

    // --- CÁLCULO Y RENDERIZADO DE LA TABLA DE SALDOS ---
    const tbody = document.querySelector("#tablaSaldosDirectiva tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    const movimientosFiltrados = globalMovimientos.filter(m => !m.temporada || m.temporada === temporadaSeleccionada);

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

// Función encargada de pintar o actualizar el gráfico de tarta de cuotas en Chart.js
function renderizarGraficoCuotasTresEstados(totales, parciales, pendientes, temporadaLabel, totalSocios) {
    const canvasElement = document.getElementById("graficoCuotas");
    if (!canvasElement) return;

    const ctx = canvasElement.getContext("2d");

    if (chartCuotasInstance) {
        chartCuotasInstance.destroy();
    }

    chartCuotasInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Pagadas (Totalidad)', 'Pagadas (Parciales)', 'Pendientes (No pagadas)'],
            datasets: [{
                data: [totales, parciales, pendientes],
                backgroundColor: [
                    '#10b981', // Verde
                    '#f59e0b', // Amarillo/Ámbar
                    '#ef4444'  // Rojo
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
                    text: `Temporada ${temporadaLabel} (${totalSocios} socios)`,
                    color: '#ffffff',
                    font: { size: 14 }
                },
                legend: {
                    position: 'bottom',
                    align: 'start',
                    labels: {
                        color: '#ffffff',
                        font: { size: 12 },
                        textAlign: 'left',
                        boxWidth: 14,
                        padding: 12
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

// Función para procesar los gastos por tipo y renderizar el gráfico de tarta de detalle de gastos
function procesarYRenderizarDetalleGastos(movimientos, temporadaSeleccionada) {
    const canvasElement = document.getElementById("graficoDetalleGastos");
    if (!canvasElement) return;

    const movimientosTemporada = movimientos.filter(m => !m.temporada || m.temporada === temporadaSeleccionada);

    const gastosPorTipo = {};
    let totalGastosTemporada = 0;

    movimientosTemporada.forEach(mov => {
        const importe = parseFloat(mov.importe) || 0;
        
        // Consideramos gasto si el importe es negativo
        const esGasto = importe < 0;

        if (esGasto) {
            const valorGasto = Math.abs(importe);
            // Agrupamos por el campo tipo real de la base de datos; si viene null o vacío, va a 'Otros'
            const tipoGasto = mov.tipo && mov.tipo.trim() !== '' ? mov.tipo.trim() : 'Otros';

            if (!gastosPorTipo[tipoGasto]) {
                gastosPorTipo[tipoGasto] = 0;
            }
            gastosPorTipo[tipoGasto] += valorGasto;
            totalGastosTemporada += valorGasto;
        }
    });

    const labels = Object.keys(gastosPorTipo);
    const data = Object.values(gastosPorTipo);

    const coloresBase = [
        '#0284c7', // Azul
        '#f97316', // Naranja
        '#facc15', // Amarillo
        '#10b981', // Verde
        '#a855f7', // Morado
        '#ec4899'  // Rosa
    ];

    const backgroundColors = labels.map((_, index) => coloresBase[index % coloresBase.length]);

    const ctx = canvasElement.getContext("2d");

    if (chartDetalleGastosInstance) {
        chartDetalleGastosInstance.destroy();
    }

    chartDetalleGastosInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `Temporada ${temporadaSeleccionada}`,
                    color: '#ffffff',
                    font: { size: 14 }
                },
                legend: {
                    position: 'bottom',
                    align: 'start', // Leyenda alineada a la izquierda igual que el otro gráfico
                    labels: {
                        color: '#ffffff',
                        font: { size: 11 },
                        textAlign: 'left',
                        boxWidth: 14,
                        padding: 12
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const valor = context.raw || 0;
                            const porcentaje = totalGastosTemporada > 0 ? ((valor / totalGastosTemporada) * 100).toFixed(1) : 0;
                            return ` ${context.label}: ${valor.toFixed(2)} € (${porcentaje}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Función para procesar movimientos por mes, calcular saldo acumulado y renderizar gráfico mixto (barras + línea)
function procesarYRenderizarGraficoBarras(movimientos, temporadaSeleccionada) {
    const canvasElement = document.getElementById("graficoIngresosGastos");
    if (!canvasElement) return;

    const partes = temporadaSeleccionada.split("/");
    if (partes.length !== 2) return;
    const anioInicio = parseInt(partes[0]);
    const anioFin = parseInt(partes[1]);

    const mesesDefinicion = [
        { mesIndex: 8, nombre: `sep ${String(anioInicio).slice(-2)}`, anio: anioInicio },
        { mesIndex: 9, nombre: `oct ${String(anioInicio).slice(-2)}`, anio: anioInicio },
        { mesIndex: 10, nombre: `nov ${String(anioInicio).slice(-2)}`, anio: anioInicio },
        { mesIndex: 11, nombre: `dic ${String(anioInicio).slice(-2)}`, anio: anioInicio },
        { mesIndex: 0, nombre: `ene ${String(anioFin).slice(-2)}`, anio: anioFin },
        { mesIndex: 1, nombre: `feb ${String(anioFin).slice(-2)}`, anio: anioFin },
        { mesIndex: 2, nombre: `mar ${String(anioFin).slice(-2)}`, anio: anioFin },
        { mesIndex: 3, nombre: `abr ${String(anioFin).slice(-2)}`, anio: anioFin },
        { mesIndex: 4, nombre: `may ${String(anioFin).slice(-2)}`, anio: anioFin },
        { mesIndex: 5, nombre: `jun ${String(anioFin).slice(-2)}`, anio: anioFin },
        { mesIndex: 6, nombre: `jul ${String(anioFin).slice(-2)}`, anio: anioFin },
        { mesIndex: 7, nombre: `ago ${String(anioFin).slice(-2)}`, anio: anioFin }
    ];

    const ingresosPorMes = new Array(12).fill(0);
    const gastosPorMes = new Array(12).fill(0);
    const labelsMeses = mesesDefinicion.map(m => m.nombre);

    const movimientosTemporada = movimientos.filter(m => !m.temporada || m.temporada === temporadaSeleccionada);

    movimientosTemporada.forEach(mov => {
        if (!mov.fecha_apunte) return;
        const fecha = new Date(mov.fecha_apunte);
        if (isNaN(fecha)) return;

        const mIndex = fecha.getMonth();
        const fAnio = fecha.getFullYear();

        const indexEnTemporada = mesesDefinicion.findIndex(item => item.mesIndex === mIndex && item.anio === fAnio);
        
        if (indexEnTemporada !== -1) {
            const importe = parseFloat(mov.importe) || 0;
            const esIngreso = mov.tipo ? (mov.tipo.toLowerCase() === 'ingreso' || mov.tipo.toLowerCase() === 'ingresos') : (importe > 0);

            if (esIngreso) {
                ingresosPorMes[indexEnTemporada] += Math.abs(importe);
            } else {
                gastosPorMes[indexEnTemporada] += Math.abs(importe);
            }
        }
    });

    let saldoAcumulado = 0;
    const saldoEvolucionPorMes = mesesDefinicion.map((_, index) => {
        const ingresoMes = ingresosPorMes[index];
        const gastoMes = gastosPorMes[index];
        saldoAcumulado += (ingresoMes - gastoMes);
        return saldoAcumulado;
    });

    const ctx = canvasElement.getContext("2d");

    if (chartIngresosGastosInstance) {
        chartIngresosGastosInstance.destroy();
    }

    chartIngresosGastosInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labelsMeses,
            datasets: [
                {
                    type: 'bar',
                    label: 'Suma de INGRESOS',
                    data: ingresosPorMes,
                    backgroundColor: '#f97316',
                    borderWidth: 1,
                    order: 2
                },
                {
                    type: 'bar',
                    label: 'Suma de GASTOS',
                    data: gastosPorMes,
                    backgroundColor: '#fbbf24',
                    borderWidth: 1,
                    order: 2
                },
                {
                    type: 'line',
                    label: 'Evolución Saldo Acumulado',
                    data: saldoEvolucionPorMes,
                    borderColor: '#38bdf8',
                    backgroundColor: '#38bdf8',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.1,
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    ticks: { color: '#ffffff' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    ticks: { color: '#ffffff' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: '#ffffff', font: { size: 12 } }
                }
            }
        }
    });
}
