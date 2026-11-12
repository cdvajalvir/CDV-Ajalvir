import { supabaseClient } from "./supabase.js";

document.addEventListener("DOMContentLoaded", () => {
    generarFilasJugadores();
    generarMatrizGoles();
    inicializarListenersControl();
    cargarSociosActivos();
});

function generarFilasJugadores() {
    const cuerpoJugadores = document.getElementById("cuerpo-jugadores");
    if (!cuerpoJugadores) return;

    let htmlFilas = "";
    for (let i = 1; i <= 30; i++) {
        htmlFilas += `
            <tr style="height: 15.2px;">
                <td style="text-align: center;">${i}</td>
                <td class="td-jugador"></td>
                <td style="text-align: center;" class="td-dorsal"></td>
                <td style="text-align: center;" class="td-dni"></td>
                <td style="text-align: center;" class="td-edad"></td>
                <td style="text-align: center;"></td>
                <td style="text-align: center;"></td>
                <td style="text-align: center;"></td>
            </tr>
        `;
    }
    cuerpoJugadores.innerHTML = htmlFilas;
}

function generarMatrizGoles() {
    const matrizGoles = document.getElementById('matriz-goles');
    if (matrizGoles) {
        let htmlGoles = '<tr><th colspan="7" style="background: #f2f2f2; font-size: 8.5px; height: 16px; text-align: center; border: 1px solid #000;">GOLES</th></tr>';
    
        let golActual = 1;
        for (let f = 0; f < 4; f++) {
            htmlGoles += '<tr>';
            for (let c = 0; c < 7; c++) {
                htmlGoles += `<td style="width: 14.28%; height: 26px; position: relative; text-align: center; vertical-align: middle; border: 1px solid #000; font-size: 8px;">
                    <span style="position: absolute; top: 2px; left: 3px; font-size: 7px; color: #555;">${golActual}</span>
                    <span style="display: inline-block; margin-top: 6px;">:</span>
                </td>`;
                golActual++;
            }
            htmlGoles += '</tr>';
        }
        matrizGoles.innerHTML = htmlGoles;
    }
}

// Sincronizar inputs de la card lateral con la cabecera del acta
function inicializarListenersControl() {
    const inputFase = document.getElementById('input-fase');
    const inputFecha = document.getElementById('input-fecha');
    const inputHorario = document.getElementById('input-horario');
    const inputSitio = document.getElementById('input-sitio');
    const inputLocal = document.getElementById('input-local');

    if (inputFase) inputFase.addEventListener('input', (e) => document.getElementById('val-fase').textContent = e.target.value);
    
    if (inputFecha) inputFecha.addEventListener('input', (e) => {
        const partes = e.target.value.split('-');
        if (partes.length === 3) {
            document.getElementById('val-fecha').textContent = `${partes[2]}/${partes[1]}/${partes[0]}`;
        } else {
            document.getElementById('val-fecha').textContent = e.target.value;
        }
    });

    if (inputHorario) inputHorario.addEventListener('input', (e) => document.getElementById('val-horario').textContent = e.target.value);
    if (inputSitio) inputSitio.addEventListener('input', (e) => document.getElementById('val-sitio').textContent = e.target.value);
    
    if (inputLocal) inputLocal.addEventListener('input', (e) => {
        const badge = document.getElementById('val-local-badge');
        if (badge) badge.textContent = e.target.value ? e.target.value.toUpperCase() : "LOCAL";
    });

    // Botón para volcar socios seleccionados a la tabla
    const btnCargar = document.getElementById('btn-cargar-plantilla');
    if (btnCargar) {
        btnCargar.addEventListener('click', volcarJugadoresSeleccionados);
    }
}

// Cargar socios activos llamando a la Edge Function get-socios mediante supabaseClient
async function cargarSociosActivos() {
    const selectSocios = document.getElementById('select-socios');
    if (!selectSocios) return;

    try {
        const { data, error } = await supabaseClient.functions.invoke('get-socios', {
            body: { temporada: "26/27" }
        });

        if (error) throw error;

        const socios = data?.data || [];

        selectSocios.innerHTML = "";
        socios.forEach(socio => {
            const option = document.createElement('option');
            option.value = socio.id;

            // Calcular edad a partir de fecha_nacimiento si existe
            let edadCalculada = "";
            if (socio.fecha_nacimiento) {
                const hoy = new Date();
                const nacimiento = new Date(socio.fecha_nacimiento);
                edadCalculada = hoy.getFullYear() - nacimiento.getFullYear();
                const m = hoy.getMonth() - nacimiento.getMonth();
                if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
                    edadCalculada--;
                }
            }

            option.dataset.nombre = `${socio.nombre || ''} ${socio.apellido || ''}`.trim();
            option.dataset.dni = socio.dni || '';
            option.dataset.edad = edadCalculada;
            option.dataset.dorsal = socio.numero || ''; // Mapeado correctamente a 'numero'

            option.textContent = `${socio.apellido || ''}, ${socio.nombre || ''}`.trim();
            selectSocios.appendChild(option);
        });

    } catch (error) {
        console.error("Error al cargar los socios desde la Edge Function:", error);
    }
}

// Volcar los socios seleccionados en el selector múltiple a las filas del acta
function volcarJugadoresSeleccionados() {
    const selectSocios = document.getElementById('select-socios');
    if (!selectSocios) return;

    const seleccionados = Array.from(selectSocios.selectedOptions);
    const filas = document.querySelectorAll("#cuerpo-jugadores tr");

    // Limpiar filas antes de volcar
    filas.forEach(fila => {
        fila.querySelector('.td-jugador').textContent = "";
        fila.querySelector('.td-dorsal').textContent = "";
        fila.querySelector('.td-dni').textContent = "";
        fila.querySelector('.td-edad').textContent = "";
    });

    // Rellenar con los seleccionados
    seleccionados.forEach((opt, index) => {
        if (index < filas.length) {
            const fila = filas[index];
            fila.querySelector('.td-jugador').textContent = opt.dataset.nombre || "";
            fila.querySelector('.td-dorsal').textContent = opt.dataset.dorsal || "";
            fila.querySelector('.td-dni').textContent = opt.dataset.dni || "";
            fila.querySelector('.td-edad').textContent = opt.dataset.edad || "";
        }
    });
}
