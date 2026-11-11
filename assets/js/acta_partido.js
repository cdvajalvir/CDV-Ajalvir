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
    // Generar matriz de goles (del 1 al 28 en 4 filas de 7 columnas)
    const matrizGoles = document.getElementById('matriz-goles');
        if (matrizGoles) {
            // Cabecera "GOLES"
            let htmlGoles = '<tr><th colspan="7" style="background: #f2f2f2; font-size: 8.5px; height: 16px; text-align: center; border: 1px solid #000;">GOLES</th></tr>';
    
            let golActual = 1;
            for (let f = 0; f < 4; f++) {
                htmlGoles += '<tr>';
                for (let c = 0; c < 7; c++) {
                    htmlGoles += `<td style="width: 14.28%; height: 20px; position: relative; text-align: center; vertical-align: middle; border: 1px solid #000; font-size: 8px;">
                        <span style="position: absolute; top: 1px; left: 2px; font-size: 7px; color: #555;">${golActual}</span>
                        <span style="display: inline-block; margin-top: 4px;">:</span>
                    </td>`;
                    golActual++;
                }
                htmlGoles += '</tr>';
            }
            matrizGoles.innerHTML = htmlGoles;
        }
}
