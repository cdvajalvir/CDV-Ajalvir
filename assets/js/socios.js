// assets/js/socios.js
import { comprobarAcceso, cerrarSesion } from "./auth.js";

window.cerrarSesion = cerrarSesion;

function obtenerTemporadaActual() {
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = ahora.getMonth() + 1; // Enero es 1, Agosto es 8, Septiembre es 9

    if (mes >= 9) {
        return `${anio}/${anio + 1}`;
    } else {
        return `${anio - 1}/${anio}`;
    }
}

comprobarAcceso([
    "administrador",
    "directiva",
    "socio"
], (socio) => {

    document.getElementById("nombreSocio").textContent =
        socio.nombre ||
        socio.alias ||
        socio.idSocio ||
        "socio";

    const temporadaActual = obtenerTemporadaActual();
    console.log("Temporada actual calculada:", temporadaActual);
    console.log("Valor crudo de cantidad_pagada:", socio.cantidad_pagada);

    let totalCuota = 0;
    let pagado = 0;
    let pendiente = 0;

    // Normalizar 'cantidad_pagada' sin importar cómo lo entregue Supabase (string, array u objeto)
    let cuotasArray = socio.cantidad_pagada;

    if (typeof cuotasArray === "string") {
        try {
            cuotasArray = JSON.parse(cuotasArray);
        } catch (e) {
            cuotasArray = [];
        }
    }

    // Si viene como un objeto único en lugar de array (por el tipo jsonb de la tabla)
    if (cuotasArray && !Array.isArray(cuotasArray) && typeof cuotasArray === "object") {
        // Lo convertimos en un array de los valores del objeto
        cuotasArray = Object.values(cuotasArray);
    }

    if (Array.isArray(cuotasArray) && cuotasArray.length > 0) {
        const datosTemporada = cuotasArray.find(
            item => item && String(item.temporada).trim() === temporadaActual.trim()
        );

        if (datosTemporada) {
            totalCuota = Number(datosTemporada.cuota) || 0;
            pagado = Number(datosTemporada.pagado) || 0;
            pendiente = Math.max(0, totalCuota - pagado);
        }
    }

    // 3. Pintar los valores en el DOM de la tarjeta
    const estadoCuotaElem = document.getElementById("estadoCuota");
    const cuotaPendienteElem = document.getElementById("cuotaPendiente");

    if (estadoCuotaElem && cuotaPendienteElem) {
        // Muestra en grande la cantidad pagada (ej: 100 €)
        estadoCuotaElem.querySelector("span").textContent = `${pagado} €`;
        
        // Muestra al día o el importe pendiente calculado
        if (pendiente > 0) {
            cuotaPendienteElem.textContent = `(${pendiente} € pendiente)`;
            cuotaPendienteElem.style.color = "#d9534f"; // Rojo alerta
        } else {
            cuotaPendienteElem.textContent = `(al día)`;
            cuotaPendienteElem.style.color = "#2e7d32"; // Verde OK
        }
    }

    // 4. Dorsal del socio
    const dorsalTexto = socio.numero ? String(socio.numero).trim() : "";
    document.getElementById("dorsalSocio").textContent =
        dorsalTexto !== "" ? dorsalTexto : "-";

    // 5. Foto personalizada del socio
    const imgElement = document.getElementById("fotoSocio");
    if (socio.foto) {
        imgElement.src = `../assets/img/${socio.foto}`;
    }

});
