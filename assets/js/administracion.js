import { supabaseClient } from "./supabase.js";

// Variable global para guardar el saldo de la caja antes del nuevo movimiento
let saldoBaseGlobal = 0;

// 1. Asignar la fecha de apunte e inicializar datos al cargar la página
window.addEventListener("DOMContentLoaded", async () => {
    if (typeof protegerPagina === "function") {
        try {
            protegerPagina();
        } catch (err) {
            console.warn("Error al verificar sesión:", err);
        }
    }

    const inputFechaApunte = document.getElementById("fecha_apunte");
    if (inputFechaApunte) {
        const hoy = new Date();
        const dia = String(hoy.getDate()).padStart(2, "0");
        const mes = String(hoy.getMonth() + 1).padStart(2, "0");
        const anio = hoy.getFullYear();

        const fechaFormateada = `${dia}-${mes}-${anio}`;
        
        inputFechaApunte.value = fechaFormateada;
        inputFechaApunte.setAttribute("value", fechaFormateada);
        inputFechaApunte.readOnly = true;
    }

    // Cargar la lista de socios directiva/admin
    cargarSociosDirectiva();

    // Obtener el último saldo global registrado en la base de datos
    await obtenerUltimoSaldoGlobal();
});

// 2. Cargar socios usando supabaseClient exportado
async function cargarSociosDirectiva() {
    const selectSocio = document.getElementById("codigo_cuenta");
    if (!selectSocio) return;

    try {
        const { data: socios, error } = await supabaseClient
            .from("socios")
            .select("id, nombre, apellido, rol")
            .or("rol.eq.administrador,rol.eq.directiva")
            .order("nombre", { ascending: true });

        if (error) throw error;

        selectSocio.innerHTML = '<option value="">-- Seleccionar Socio --</option>';

        if (socios && socios.length > 0) {
            socios.forEach(socio => {
                const option = document.createElement("option");
                option.value = socio.id;
                option.textContent = `${socio.nombre} ${socio.apellido || ""}`.trim();
                selectSocio.appendChild(option);
            });
        } else {
            selectSocio.innerHTML = '<option value="">Sin socios directiva/admin encontrados</option>';
        }

    } catch (err) {
        console.error("Error al cargar los socios:", err);
        selectSocio.innerHTML = '<option value="">Error al cargar lista</option>';
    }
}

// 3. Obtener el último saldo global acumulado del club
async function obtenerUltimoSaldoGlobal() {
    const inputSaldo = document.getElementById("saldo");

    try {
        // Ordenamos por 'id' en lugar de 'created_at'
        const { data: ultimosMovimientos, error } = await supabaseClient
            .from("movimientos")
            .select("saldo")
            .order("id", { ascending: false })
            .limit(1);

        if (error) throw error;

        if (ultimosMovimientos && ultimosMovimientos.length > 0 && ultimosMovimientos[0].saldo !== null) {
            saldoBaseGlobal = parseFloat(ultimosMovimientos[0].saldo);
        } else {
            saldoBaseGlobal = 0;
        }

        if (inputSaldo) {
            inputSaldo.value = saldoBaseGlobal.toFixed(2);
        }

    } catch (err) {
        console.error("Error al obtener el último saldo global:", err);
        saldoBaseGlobal = 0;
        if (inputSaldo) inputSaldo.value = "0.00";
    }
}

// 4. Recalcular el saldo en tiempo real según el importe introducido
function calcularNuevoSaldo() {
    const inputImporte = document.getElementById("importe");
    const inputSaldo = document.getElementById("saldo");

    if (!inputSaldo) return;

    const valorImporte = parseFloat(inputImporte ? inputImporte.value : 0);

    if (!isNaN(valorImporte)) {
        const nuevoSaldo = saldoBaseGlobal + valorImporte;
        inputSaldo.value = nuevoSaldo.toFixed(2);
    } else {
        inputSaldo.value = saldoBaseGlobal.toFixed(2);
    }
}

// 5. Formatear números a 2 decimales
function formatearDecimales(input) {
    if (input && input.value !== "") {
        const valor = parseFloat(input.value);
        if (!isNaN(valor)) {
            input.value = valor.toFixed(2);
        }
    }
}

// 6. Formatear fecha para enviar a backend (DD-MM-AAAA -> AAAA-MM-DD)
function formatearFechaParaBackend(fechaDMY) {
    if (!fechaDMY) return null;
    const partes = fechaDMY.split("-");
    if (partes.length !== 3) return fechaDMY;
    return `${partes[2]}-${partes[1]}-${partes[0]}`;
}

// 7. Envío del formulario y eventos
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("formMovimiento");
    const mensaje = document.getElementById("mensajeMovimiento");
    const btnLimpiar = document.getElementById("btnLimpiar");
    const inputFechaApunte = document.getElementById("fecha_apunte");
    const inputImporte = document.getElementById("importe");

    // Recalcular saldo dinámicamente al escribir o cambiar el importe
    if (inputImporte) {
        inputImporte.addEventListener("input", calcularNuevoSaldo);
        inputImporte.addEventListener("blur", () => {
            formatearDecimales(inputImporte);
            calcularNuevoSaldo();
        });
    }

    function mostrarMensaje(texto, esError = false) {
        if (mensaje) {
            mensaje.textContent = texto;
            mensaje.className = esError ? "status danger" : "status ok";
        }
    }

    function reponerFecha() {
        if (inputFechaApunte) {
            const hoy = new Date();
            const dia = String(hoy.getDate()).padStart(2, "0");
            const mes = String(hoy.getMonth() + 1).padStart(2, "0");
            const anio = hoy.getFullYear();
            inputFechaApunte.value = `${dia}-${mes}-${anio}`;
        }
    }

    async function limpiarFormulario() {
        if (form) form.reset();
        reponerFecha();
        mostrarMensaje("");
        // Al limpiar, volvemos a poner el saldo base original
        await obtenerUltimoSaldoGlobal();
    }

    if (form) {
        form.addEventListener("submit", async (evento) => {
            evento.preventDefault();

            formatearDecimales(inputImporte);
            calcularNuevoSaldo(); // Asegurar saldo calculado justo antes de enviar

            // Preparamos la fecha en formato ISO YYYY-MM-DD
            let fechaApunteVal = inputFechaApunte ? inputFechaApunte.value : "";
            let fechaApunteFormateada = fechaApunteVal;

            if (fechaApunteVal.includes("-")) {
                const partes = fechaApunteVal.split("-");
                if (partes[0].length === 2) {
                    // Si venía como DD-MM-YYYY, la invertimos a YYYY-MM-DD
                    fechaApunteFormateada = `${partes[2]}-${partes[1]}-${partes[0]}`;
                }
            }

            // Parsear socio/código de cuenta a número si aplica
            const valCodigoCuenta = document.getElementById("codigo_cuenta").value;
            const codigoCuentaParsed = !isNaN(valCodigoCuenta) && valCodigoCuenta !== "" 
                ? parseInt(valCodigoCuenta, 10) 
                : valCodigoCuenta;

            const movimiento = {
                temporada: document.getElementById("temporada").value,
                fecha_contable: document.getElementById("fecha_contable").value,
                fecha_apunte: fechaApunteFormateada,
                concepto: document.getElementById("concepto").value,
                tipo: document.getElementById("tipo").value || null,
                codigo_cuenta: codigoCuentaParsed,
                importe: parseFloat(document.getElementById("importe").value),
                saldo: parseFloat(document.getElementById("saldo").value)
            };

            try {
                mostrarMensaje("Guardando registro...");

                // Invocamos la Edge Function correcta
                const { data, error } = await supabaseClient.functions.invoke("crear-apunte", {
                    body: movimiento
                });

                if (error) throw error;

                mostrarMensaje("Movimiento registrado correctamente.");
                
                // Actualizamos el saldo base con el nuevo saldo guardado
                saldoBaseGlobal = movimiento.saldo;
                limpiarFormulario();

            } catch (error) {
                console.error("Error al guardar movimiento:", error);
                mostrarMensaje(error.message || "Error al registrar el movimiento", true);
            }
        });
    }

    if (btnLimpiar) {
        btnLimpiar.addEventListener("click", limpiarFormulario);
    }
});
