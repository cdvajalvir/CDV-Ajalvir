document.addEventListener("DOMContentLoaded", () => {
    generarFilasJugadores();
    generarMatrizGoles();
});

function generarFilasJugadores() {
    const tabla = document.querySelector(".acta-grid-maestra");
    if (!tabla) return;

    let htmlFilas = "";
    for (let i = 1; i <= 30; i++) {
        htmlFilas += `
            <tr style="height: 15.2px;">
                <td style="text-align: center;">${i}</td>
                <td></td>
                <td style="text-align: center;"></td>
                <td style="text-align: center;"></td>
                <td style="text-align: center;"></td>
                <td style="text-align: center;"></td>
                <td style="text-align: center;"></td>
                <td style="text-align: center;"></td>
            </tr>
        `;
    }
    // Insertamos las 30 filas después de las cabeceras
    tabla.insertAdjacentHTML('beforeend', htmlFilas);
}

function generarMatrizGoles() {
    const matrizGoles = document.querySelector("#matriz-goles");
    if (!matrizGoles) return;

    let html = `<tr><th colspan="14" style="background:#f2f2f2; font-size:8.5px; text-align:center;">GOLES</th></tr>`;
    let golNum = 1;
    for (let f = 0; f < 4; f++) {
        html += "<tr>";
        for (let c = 0; c < 7; c++) {
            if (golNum <= 28) {
                html += `<td style="text-align:center;"><strong>${golNum}</strong>:</td>`;
                golNum++;
            }
        }
        html += "</tr>";
    }
    matrizGoles.innerHTML = html;
}
