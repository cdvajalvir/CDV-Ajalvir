// assets/js/socios.js
import { comprobarAcceso, cerrarSesion } from "./auth.js";

window.cerrarSesion = cerrarSesion;

/**
 * Función auxiliar para determinar la temporada actual de forma automática.
 * Ejemplo: Si estamos entre septiembre y diciembre de 2026, la temporada es "2026-2027".
 * Si estamos entre enero y agosto de 2026, es "2025-2026".
 */
function obtenerTemporadaActual() {
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = ahora.getMonth() + 1; // Enero es 1

    // Si el mes es septiembre o posterior (>= 9), la temporada empieza en el año actual
    if (mes >= 9) {
        return `${anio}-${anio + 1}`;
    } else {
        // Si es anterior a septiembre, pertenece a la temporada que empezó el año pasado
        return `${anio - 1}-${anio}`;
    }
}

comprobarAcceso([
    "administrador",
    "directiva",
    "socio"
], (socio) => {

    // 1. Mostrar nombre o alias del socio
    document.getElementById("nombreSocio").textContent =
        socio.nombre ||
        socio.alias ||
        socio.idSocio ||
        "socio";

    // 2. Obtener la temporada actual
    const temporadaActual = obtenerTemporadaActual();
    
    // 3. Extraer los datos del campo JSON de cuotas adaptado a la temporada actual
    // Suponemos que 'socio.cuotas' es un objeto JSON del tipo: socio.cuotas['2026-2027'] = { pagado: X, pendiente: Y }
    // O en su defecto, mantiene compatibilidad con campos planos si todavía conviven.
    let pagado = 0;
    let pendiente = 0;

    if (socio.cuotas && typeof socio.cuotas === "object") {
        const datosTemporada = socio.cuotas[temporadaActual] || socio.cuotas[String(temporadaActual)];
        if (datosTemporada) {
            pagado = datosTemporada.pagado ?? datosTemporada.cantidad_pagada ?? 0;
            pendiente = datosTemporada.pendiente ?? datosTemporada.cantidad_pendiente ?? 0;
        }
    } else {
        // Fallback por si en algún registro todavía llega plano
        pagado = socio.cantidad_pagada ?? 0;
        pendiente = socio.cantidad_pendiente ?? 0;
    }

    // 4. Pintar los valores en el DOM de la tarjeta
    const estadoCuotaElem = document.getElementById("estadoCuota");
    const cuotaPendienteElem = document.getElementById("cuotaPendiente");

    if (estadoCuotaElem && cuotaPendienteElem) {
        // Muestra la cantidad realmente pagada para la temporada actual
        estadoCuotaElem.querySelector("span").textContent = `${pagado} €`;
        
        // Muestra el texto dinámico según si tiene importe pendiente o está al día
        if (pendiente > 0) {
            cuotaPendienteElem.textContent = `(${pendiente} € pendiente)`;
            cuotaPendienteElem.style.color = "#d9534f"; // Rojo alerta
        } else {
            cuotaPendienteElem.textContent = `(al día)`;
            cuotaPendienteElem.style.color = "#2e7d32"; // Verde OK
        }
    }

    // 5. Dorsal del socio
    const dorsalTexto = socio.numero ? String(socio.numero).trim() : "";
    document.getElementById("dorsalSocio").textContent =
        dorsalTexto !== "" ? dorsalTexto : "-";

    // 6. Foto personalizada del socio
    const imgElement = document.getElementById("fotoSocio");
    if (socio.foto) {
        imgElement.src = `../assets/img/${socio.foto}`;
    }

});
