// assets/js/socios.js
import { comprobarAcceso, cerrarSesion } from "./auth.js";

window.cerrarSesion = cerrarSesion;

/**
 * Función para obtener la temporada actual en formato "YYYY/YYYY"
 * Ejemplo: Si estamos en agosto de 2026, pertenece a "2026/2027".
 */
function obtenerTemporadaActual() {
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = ahora.getMonth() + 1; // Enero es 1

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

    // 1. Mostrar nombre o alias del socio
    document.getElementById("nombreSocio").textContent =
        socio.nombre ||
        socio.alias ||
        socio.idSocio ||
        "socio";

    // 2. Obtener la temporada actual
    const temporadaActual = obtenerTemporadaActual();
    
    let totalCuota = 0;
    let pagado = 0;
    let pendiente = 0;

    // 3. Procesar el campo JSON 'cantidad_pagada' que es un array de objetos
    // Formato esperado: [{"cuota": 100, "pagado": 0, "temporada": "2026/2027"}, ...]
    if (Array.isArray(socio.cantidad_pagada)) {
        const datosTemporada = socio.cantidad_pagada.find(
            item => String(item.temporada).trim() === temporadaActual
        );

        if (datosTemporada) {
            totalCuota = Number(datosTemporada.cuota) || 0;
            pagado = Number(datosTemporada.pagado) || 0;
            pendiente = Math.max(0, totalCuota - pagado);
        }
    } else if (typeof socio.cantidad_pagada === "object" && socio.cantidad_pagada !== null) {
        // Por si viniera en formato objeto clave-valor antiguo
        const datosObj = socio.cantidad_pagada[temporadaActual];
        if (datosObj) {
            totalCuota = Number(datosObj.cuota) || 100;
            pagado = Number(datosObj.pagado) || 0;
            pendiente = Math.max(0, totalCuota - pagado);
        }
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
