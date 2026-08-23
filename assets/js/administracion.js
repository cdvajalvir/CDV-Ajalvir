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

    // Cargar socios al iniciar
    cargarSociosDirectiva();
});

// 2. Función para obtener socios con rol administrador o directiva desde Supabase
async function cargarSociosDirectiva() {
    const selectSocio = document.getElementById("codigo_cuenta");
    if (!selectSocio) return;

    try {
        // Asegúrate de que 'supabase' está inicializado globalmente en tu proyecto
        const { data: socios, error } = await supabase
            .from("socios")
            .select("id, nombre, apellidos, rol")
            .in("rol", ["administrador", "directiva"])
            .order("nombre", { ascending: true });

        if (error) throw error;

        selectSocio.innerHTML = '<option value="">-- Seleccionar Socio --</option>';

        if (socios && socios.length > 0) {
            socios.forEach(socio => {
                const option = document.createElement("option");
                option.value = socio.id; // Asigna el UUID como valor para la base de datos
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

// 3. Formatear números a 2 decimales automáticamente al salir del input
function formatearDecimales(input) {
    if (input && input.value !== "") {
        const valor = parseFloat(input.value);
        if (!isNaN(valor)) {
            input.value = valor.toFixed(2);
        }
    }
}

// 4. Convierte DD-MM-AAAA a AAAA-MM-DD para Supabase
function formatearFechaParaBackend(fechaDMY) {
    if (!fechaDMY) return null;
    const partes = fechaDMY.split("-");
    if (partes.length !== 3) return fechaDMY;
    return `${partes[2]}-${partes[1]}-${partes[0]}`;
}

// 5. Manejo del formulario
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("formMovimiento");
    const mensaje = document.getElementById("mensajeMovimiento");
    const btnLimpiar = document.getElementById("btnLimpiar");
    const inputFechaApunte = document.getElementById("fecha_apunte");
    const inputImporte = document.getElementById("importe");
    const inputSaldo = document.getElementById("saldo");

    const SUPABASE_FUNCTION_URL = "https://<TU_PROYECTO>.supabase.co/functions/v1/crear-movimiento";

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
                codigo_cuenta: document.getElementById("codigo_cuenta").value, // Envía el UUID seleccionado
                importe: parseFloat(document.getElementById("importe").value),
                saldo: document.getElementById("saldo").value ? parseFloat(document.getElementById("saldo").value) : null
            };

            try {
                mostrarMensaje("Guardando registro...");

                const respuesta = await fetch(SUPABASE_FUNCTION_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(movimiento)
                });

                const resultado = await respuesta.json();

                if (!respuesta.ok) {
                    throw new Error(resultado.error || "Error al registrar el movimiento");
                }

                mostrarMensaje("Movimiento registrado correctamente.");
                limpiarFormulario();

            } catch (error) {
                console.error(error);
                mostrarMensaje(error.message, true);
            }
        });
    }

    if (btnLimpiar) {
        btnLimpiar.addEventListener("click", limpiarFormulario);
    }
});
