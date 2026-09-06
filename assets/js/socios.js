// assets/js/socios.js

import { supabaseClient } from "./supabase.js"; // <--- Importante para conectar con el storage
import { inicializarControlNotificaciones } from "./notificaciones.js";

// Ejecutamos la función de las notificaciones al cargar el script
inicializarControlNotificaciones();

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
], async (socio) => { // <--- Añadido 'async' para permitir await

    document.getElementById("nombreSocio").textContent =
        socio.nombre ||
        socio.alias ||
        socio.idSocio ||
        "socio";

    const temporadaActual = obtenerTemporadaActual();

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
        estadoCuotaElem.querySelector("span").textContent = `${pagado} €`;
        
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

    // 5. Carga de la foto privada desde el bucket 'fotos-socios' de Supabase
    const imgElement = document.getElementById("fotoSocio");
    
    console.log("Valor de socio recibido:", socio); // <--- Nos mostrará todos los datos del usuario en la consola
    console.log("Valor de socio.foto:", socio.foto); // <--- Nos dirá si tiene algo escrito o viene vacío/null

    if (socio.foto && imgElement) {
        try {
            console.log("Intentando generar URL firmada para:", socio.foto);
            
            const { data, error } = await supabaseClient.storage
                .from("fotos-socios")
                .createSignedUrl(socio.foto, 60);

            if (error) throw error;

            if (data && data.signedUrl) {
                console.log("URL firmada generada con éxito:", data.signedUrl);
                imgElement.src = data.signedUrl;
            }
        } catch (err) {
            console.error("Error al obtener la imagen privada del socio:", err);
        }
    } else {
        console.warn("No se pudo ejecutar: o falta el elemento HTML 'fotoSocio' o 'socio.foto' está vacío.");
    }

});
