// assets/js/cuotas.js
import { comprobarAcceso, cerrarSesion } from "./auth.js";

window.cerrarSesion = cerrarSesion;

// Comprobación estricta de seguridad: solo rol "administrador"
comprobarAcceso(["administrador"], (socioAdmin) => {

    const tbody = document.getElementById("tbodyValoresCuota");
    if (!tbody) return;

    tbody.innerHTML = "";

    // Extraer y normalizar el array de cantidad_pagada del administrador
    let cuotasArray = socioAdmin.cantidad_pagada;

    if (typeof cuotasArray === "string") {
        try {
            cuotasArray = JSON.parse(cuotasArray);
        } catch (e) {
            cuotasArray = [];
        }
    }

    if (cuotasArray && !Array.isArray(cuotasArray) && typeof cuotasArray === "object") {
        cuotasArray = Object.values(cuotasArray);
    }

    if (!Array.isArray(cuotasArray) || cuotasArray.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" style="text-align: center; padding: 2rem;">No hay temporadas registradas.</td></tr>`;
        return;
    }

    // Recorrer el array y pintar cada temporada con su valor de cuota
    cuotasArray.forEach(item => {
        if (!item) return;

        const temporada = item.temporada || "-";
        const cuotaValor = Number(item.cuota) || 0;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${temporada}</strong></td>
            <td>${cuotaValor.toFixed(2)} €</td>
        `;
        tbody.appendChild(tr);
    });

});
