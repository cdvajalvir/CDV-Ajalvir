// Función para inicializar la fecha apunte (DD-MM-AAAA)
function inicializarFechaApunte() {
    const inputFechaApunte = document.getElementById("fecha_apunte");
    if (inputFechaApunte) {
        const hoy = new Date();
        const dia = String(hoy.getDate()).padStart(2, "0");
        const mes = String(hoy.getMonth() + 1).padStart(2, "0");
        const anio = hoy.getFullYear();

        const fechaFormateada = `${dia}-${mes}-${anio}`;
        inputFechaApunte.value = fechaFormateada;
        inputFechaApunte.setAttribute("value", fechaFormateada); // Fuerza el atributo HTML
        inputFechaApunte.readOnly = true;
    }
}

// Convierte DD-MM-AAAA a AAAA-MM-DD para Supabase
function formatearFechaParaBackend(fechaDMY) {
    if (!fechaDMY) return null;
    const partes = fechaDMY.split("-");
    if (partes.length !== 3) return fechaDMY;
    return `${partes[2]}-${partes[1]}-${partes[0]}`;
}

function inicializarFormulario() {
    if (typeof protegerPagina === "function") {
        protegerPagina();
    }

    inicializarFechaApunte();

    const form = document.getElementById("formMovimiento");
    const mensaje = document.getElementById("mensajeMovimiento");
    const btnLimpiar = document.getElementById("btnLimpiar");
    const inputFechaApunte = document.getElementById("fecha_apunte");

    const SUPABASE_FUNCTION_URL = "https://<TU_PROYECTO>.supabase.co/functions/v1/crear-movimiento";

    function mostrarMensaje(texto, esError = false) {
        if (mensaje) {
            mensaje.textContent = texto;
            mensaje.className = esError ? "status danger" : "status ok";
        }
    }

    function limpiarFormulario() {
        if (form) form.reset();
        inicializarFechaApunte();
        mostrarMensaje("");
    }

    async function guardarMovimiento(evento) {
        evento.preventDefault();

        const fechaApunteFormateada = formatearFechaParaBackend(inputFechaApunte ? inputFechaApunte.value : "");

        const movimiento = {
            temporada: document.getElementById("temporada").value,
            fecha_contable: document.getElementById("fecha_contable").value,
            fecha_apunte: fechaApunteFormateada,
            concepto: document.getElementById("concepto").value,
            importe: parseFloat(document.getElementById("importe").value),
            tipo: document.getElementById("tipo").value || null,
            saldo: document.getElementById("saldo").value ? parseFloat(document.getElementById("saldo").value) : null,
            codigo_cuenta: document.getElementById("codigo_cuenta").value
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
    }

    if (form) {
        form.addEventListener("submit", guardarMovimiento);
    }

    if (btnLimpiar) {
        btnLimpiar.addEventListener("click", limpiarFormulario);
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inicializarFormulario);
} else {
    inicializarFormulario();
}
