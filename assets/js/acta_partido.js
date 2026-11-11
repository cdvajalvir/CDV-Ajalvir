document.addEventListener("DOMContentLoaded", () => {
    inicializarTablaJugadores();
    inicializarMatrizGoles();
});

// Genera exactamente las 30 líneas de jugadores de la plantilla oficial
function inicializarTablaJugadores() {
    const tbody = document.querySelector("#tabla-jugadores tbody");
    if (!tbody) return;

    let html = "";
    for (let i = 1; i <= 30; i++) {
        html += `
            <tr>
                <td class="col-num">${i}</td>
                <td class="col-jugador"></td>
                <td class="col-dorsal"></td>
                <td class="col-dni"></td>
                <td class="col-edad"></td>
                <td class="col-tarjeta-celda"></td>
                <td class="col-tarjeta-celda"></td>
                <td class="col-tarjeta-celda"></td>
            </tr>
        `;
    }
    tbody.innerHTML = html;
}

// Genera la cuadrícula de goles (del 1 al 28 como en la plantilla original)
function inicializarMatrizGoles() {
    const tbodyGoles = document.querySelector("#matriz-goles");
    if (!tbodyGoles) return;

    let html = "";
    // Creamos filas de 7 columnas
    let golNum = 1;
    for (let fila = 0; fila < 4; fila++) {
        html += "<tr>";
        // Celda de números de gol y espacio para minútos
        for (let col = 0; col < 7; col++) {
            if (golNum <= 28) {
                html += `
                    <td class="celda-gol-item">
                        <span class="num-gol">${golNum}</span>
                        <span class="min-gol">:</span>
                    </td>
                `;
                golNum++;
            }
        }
        html += "</tr>";
    }
    tbodyGoles.innerHTML = html;
}
