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
    console.log("Datos de cantidad_pagada del socio:", socio.cantidad_pagada);

    let totalCuota = 0;
    let pagado = 0;
    let pendiente = 0;

    // Asegurar que socio.cantidad_pagada sea un array (por si viene como string JSON)
    let cuotasArray = socio.cantidad_pagada;
    if (typeof cuotasArray === "string") {
        try {
            cuotasArray = JSON.parse(cuotasArray);
        } catch (e) {
            cuotasArray = [];
        }
    }

    if (Array.isArray(cuotasArray) && cuotasArray.length > 0) {
        // Buscar la temporada actual limpiando espacios y barras por seguridad
        let datosTemporada = cuotasArray.find(
            item => String(item.temporada).trim() === temporadaActual.trim()
        );

        // Si no encuentra la exacta por fecha, cogemos la última del array como seguridad
        if (!datosTemporada) {
            datosTemporada = cuotasArray[cuotasArray.length - 1];
        }

        if (datosTemporada) {
            totalCuota = Number(datosTemporada.cuota) || 0;
            pagado = Number(datosTemporada.pagado) || 0;
            pendiente = Math.max(0, totalCuota - pagado);
        }
    }

    // Pintar los valores en el DOM
    const estadoCuotaElem = document.getElementById("estadoCuota");
    const cuotaPendienteElem = document.getElementById("cuotaPendiente");

    if (estadoCuotaElem && cuotaPendienteElem) {
        estadoCuotaElem.querySelector("span").textContent = `${pagado} €`;
        
        if (pendiente > 0) {
            cuotaPendienteElem.textContent = `(${pendiente} € pendiente)`;
            cuotaPendienteElem.style.color = "#d9534f"; // Rojo
        } else {
            cuotaPendienteElem.textContent = `(al día)`;
            cuotaPendienteElem.style.color = "#2e7d32"; // Verde
        }
    }

    // Dorsal
    const dorsalTexto = socio.numero ? String(socio.numero).trim() : "";
    document.getElementById("dorsalSocio").textContent =
        dorsalTexto !== "" ? dorsalTexto : "-";

    // Foto
    const imgElement = document.getElementById("fotoSocio");
    if (socio.foto) {
        imgElement.src = `../assets/img/${socio.foto}`;
    }

});
