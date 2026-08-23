import { supabaseClient } from "./supabase.js";

// 1. Asignar la fecha de apunte INMEDIATAMENTE al cargar la página
window.addEventListener("DOMContentLoaded", () => {
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
});

// 2. Cargar socios usando supabaseClient exportado
async function cargarSociosDirectiva() {
    const selectSocio = document.getElementById("codigo_cuenta");
    if (!selectSocio) return;

    try {
        const { data: socios, error } = await supabaseClient
            .from("socios")
            .select("id, nombre, apellidos, rol")
            .in("rol", ["administrador", "directiva"])
            .order("nombre", { ascending: true });

        if (error) throw error;

        selectSocio.innerHTML = '<option value="">-- Seleccionar Socio --</option>';

        if (socios && socios.length > 0) {
            socios.forEach(socio => {
                const option = document.createElement("option");
                option.value = socio.id;
                option.textContent = `${socio.nombre} ${socio.apellidos || ""}`.trim();
                selectSocio.appendChild(option);
            });
        } else {
            selectSocio.innerHTML = '<option value="">Sin socios disponibles</option>';
        }

    } catch (err) {
        console.error("Error al cargar los socios:", err);
        selectSocio.innerHTML = '<option value="">Error al cargar lista</option>';
    }
}

// 3. Formatear números a 2 decimales
function formatearDecimales(input) {
    if (input && input.value !== "") {
        const valor = parseFloat(input.value);
        if (!isNaN(valor)) {
            input.value = valor.toFixed(2);
        }
    }
}

// 4. Formatear fecha para enviar a backend (DD-MM-AAAA -> AAAA-MM-DD)
function formatearFechaParaBackend(fechaDMY) {
    if (!fechaDMY) return null;
    const partes = fechaDMY.split("-");
    if (partes.length !== 3) return fechaDMY;
    return `${partes[2]}-${partes[1]}-${partes[0]}`;
}

// 5. Envío del formulario
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("formMovimiento");
    const mensaje = document.getElementById("mensajeMovimiento");
    const btnLimpiar = document.getElementById("btnLimpiar");
    const inputFechaApunte = document.getElementById("fecha_apunte");
    const inputImporte = document.getElementById("importe");
    const inputSaldo = document.getElementById("saldo");

    if (inputImporte) {
        inputImporte.addEventListener("blur", () => formatearDecimales(inputImporte));
    }
    if (inputSaldo) {
        inputSaldo.addEventListener("blur", () => formatearDecimales(inputSaldo));
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

    function limpiarFormulario() {
        if (form) form.reset();
        reponerFecha();
        mostrarMensaje("");
    }

    if (form) {
        form.addEventListener("submit", async (evento) => {
            evento.preventDefault();

            formatearDecimales(inputImporte);
            formatearDecimales(inputSaldo);

            const fechaApunteFormateada = formatearFechaParaBackend(inputFechaApunte ? inputFechaApunte.value : "");

            const movimiento = {
                temporada: document.getElementById("temporada").value,
                fecha_contable: document.getElementById("fecha_contable").value,
                fecha_apunte: fechaApunteFormateada,
                concepto: document.getElementById("concepto").value,
                tipo: document.getElementById("tipo").value || null,
                codigo_cuenta: document.getElementById("codigo_cuenta").value,
                importe: parseFloat(document.getElementById("importe").value),
                saldo: document.getElementById("saldo").value ? parseFloat(document.getElementById("saldo").value) : null
            };

            try {
                mostrarMensaje("Guardando registro...");

                const { data, error } = await supabaseClient.functions.invoke("crear-movimiento", {
                    body: movimiento
                });

                if (error) throw error;

                mostrarMensaje("Movimiento registrado correctamente.");
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
