import { supabaseClient } from "./supabase.js";
import { comprobarAcceso, cerrarSesion } from "./auth.js";

window.cerrarSesion = cerrarSesion;

let chartCuotasInstance = null; // Control de instancia del gráfico de tarta
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
        // 1. Obtener socios, movimientos (con fecha_contable y tipo) y las temporadas desde la tabla 'temporada'
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
            
            // Recorrer los resultados de la tabla temporada de forma segura
            if (resTemps.data && Array.isArray(resTemps.data)) {
                resTemps.data.forEach(t => {
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

    // --- CÁLCULO DEL GRÁFICO DE TARTA (3 ESTADOS Y FILTRADO POR TEMPORADA) ---
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
    // ---------------------------------------------------------------------

    // --- CÁLCULO Y RENDERIZADO DEL GRÁFICO DE BARRAS DE INGRESOS Y GASTOS ---
    procesarYRenderizarGraficoBarras(globalMovimientos, temporadaSeleccionada);
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

// Función encargada de pintar o actualizar el gráfico de tarta con 3 estados en Chart.js
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
                    '#10b981', // Verde para total pagado
                    '#f59e0b', // Amarillo/Ámbar para pago parcial
                    '#ef4444'  // Rojo para pendientes / sin pagar
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
                    labels: {
                        color: '#ffffff',
                        font: { size: 12 }
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

// Función para procesar movimientos por mes, calcular saldo acumulado y renderizar gráfico mixto (barras + línea)
function procesarYRenderizarGraficoBarras(movimientos, temporadaSeleccionada) {
    const canvasElement = document.getElementById("graficoIngresosGastos");
    if (!canvasElement) return;

    // 1. Extraer los años de la temporada
    const partes = temporadaSeleccionada.split("/");
    if (partes.length !== 2) return;
    const anioInicio = parseInt(partes[0]);
    const anioFin = parseInt(partes[1]);

    // 2. Definir los 12 meses de la temporada (Septiembre a Agosto)
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

    // 3. Filtrar movimientos de la temporada seleccionada
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

    // 4. Calcular el saldo acumulado mes a mes para la línea
    let saldoAcumulado = 0;
    const saldoEvolucionPorMes = mesesDefinicion.map((_, index) => {
        const ingresoMes = ingresosPorMes[index];
        const gastoMes = gastosPorMes[index];
        saldoAcumulado += (ingresoMes - gastoMes);
        return saldoAcumulado;
    });

    // 5. Renderizar con Chart.js (Gráfico Mixto: Bar + Line)
    const ctx = canvasElement.getContext("2d");

    if (chartIngresosGastosInstance) {
        chartIngresosGastosInstance.destroy();
    }

    chartIngresosGastosInstance = new Chart(ctx, {
        type: 'bar', // Tipo base por defecto
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
                    borderColor: '#38bdf8', // Azul claro brillante para la línea
                    backgroundColor: '#38bdf8',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.1, // Línea ligeramente suavizada
                    order: 1 // Se dibuja por encima de las barras
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
