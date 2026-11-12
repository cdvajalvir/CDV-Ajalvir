import { supabaseClient } from "./supabase.js";

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Verificación estricta de sesión y rol de Administrador
    const autorizado = await verificarAccesoAdministrador();
    if (!autorizado) return;

    // 2. Configurar botón de volver atrás
    const btnVolver = document.getElementById("btn-volver-atras");
    if (btnVolver) {
        btnVolver.addEventListener("click", (e) => {
            e.preventDefault();
            window.history.back();
        });
    }

    // 3. Inicializar componentes del acta
    generarFilasJugadores();
    generarMatrizGoles();
    inicializarListenersControl();
    cargarSociosActivos();
    cargarDatosConvocatoriaActiva();
});

// Función para verificar sesión y rol administrador
async function verificarAccesoAdministrador() {
    try {
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
        if (sessionError || !session) {
            window.location.href = "../index.html";
            return false;
        }

        const user = session.user;
        const { data: perfil, error: perfilError } = await supabaseClient
            .from('socios')
            .select('rol')
            .eq('id', user.id)
            .single();

        if (perfilError || !perfil || perfil.rol !== 'administrador') {
            alert("Acceso denegado. Se requieren privilegios de administrador.");
            window.location.href = "../index.html";
            return false;
        }

        return true;
    } catch (err) {
        console.error("Error verificando permisos:", err);
        window.location.href = "../index.html";
        return false;
    }
}

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
            body: { temporada: "2026/2027" }
        });

        if (error) throw error;
        // Comprobamos si viene en data.data o directamente en data
        const socios = data?.data || (Array.isArray(data) ? data : []);

        selectSocios.innerHTML = "";
        
        if (socios.length === 0) {
            return;
        }

        socios.forEach(socio => {
            const option = document.createElement('option');
            option.value = socio.id;

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
            option.dataset.dorsal = socio.numero || '';

            option.textContent = `${socio.apellido || ''}, ${socio.nombre || ''}`.trim();
            selectSocios.appendChild(option);
        });

    } catch (error) {
        console.error("Error al cargar los socios desde la Edge Function:", error);
    }
}

async function cargarDatosConvocatoriaActiva() {
    try {
        const { data, error } = await supabaseClient.functions.invoke('gestion-convocatorias', {
            body: { action: 'cargar' }
        });

        if (error) throw error;
        // Adaptamos la respuesta de la Edge Function
        const listaConvocatorias = data?.data || (Array.isArray(data) ? data : []);

        // Filtrar la convocatoria que cumple con activa === true y tipo_convocatoria === "Oficial"
        const oficialActiva = listaConvocatorias.find(c => c.activa === true && c.tipo_convocatoria === "Oficial);

        if (!oficialActiva) {
            return;
        }

        // 1. Campo LOCAL (Evaluación del lugar)
        const inputLocal = document.getElementById('input-local');
        const valLocalBadge = document.getElementById('val-local-badge');
        
        let textoLocal = "";
        if (oficialActiva.lugar === "Polideportivo Ajalvir") {
            textoLocal = "LOCAL -- CDV Ajalvir";
        } else {
            textoLocal = "VISITANTE -- CDV Ajalvir";
        }

        if (inputLocal) inputLocal.value = textoLocal;
        if (valLocalBadge) valLocalBadge.textContent = textoLocal;

        // 2. Campo Sitio / Campo
        const inputSitio = document.getElementById('input-sitio');
        const valSitio = document.getElementById('val-sitio');
        
        if (inputSitio) inputSitio.value = oficialActiva.lugar || "";
        if (valSitio) valSitio.textContent = oficialActiva.lugar || "";

        // 3. Extraer Fecha y Horario del campo "hora" (Formato esperado: "22/11/26 - 09:30")
        if (oficialActiva.hora) {
            const partes = oficialActiva.hora.split(" - ");
            const fechaExtraida = partes[0] ? partes[0].trim() : "";
            const horaExtraida = partes[1] ? partes[1].trim() : "";

            // Adaptar fecha a formato ISO (YYYY-MM-DD) si el input es de tipo date
            let fechaIso = fechaExtraida;
            if (fechaExtraida.includes("/")) {
                const [dia, mes, anioCorto] = fechaExtraida.split("/");
                if (dia && mes && anioCorto) {
                    fechaIso = `20${anioCorto}-${mes}-${dia}`;
                }
            }

            const inputFecha = document.getElementById('input-fecha');
            const valFecha = document.getElementById('val-fecha');
            if (inputFecha) inputFecha.value = fechaIso;
            if (valFecha) valFecha.textContent = fechaExtraida;

            const inputHorario = document.getElementById('input-horario');
            const valHorario = document.getElementById('val-horario');
            if (inputHorario) inputHorario.value = horaExtraida;
            if (valHorario) valHorario.textContent = horaExtraida;
        } else {
            console.warn("⚠️ La convocatoria activa no tiene definido el campo 'hora'.");
        }

        // 4. Preseleccionar automáticamente los socios que han confirmado asistencia
        if (oficialActiva.users && oficialActiva.users.length > 0) {
            precargarSociosConfirmados(oficialActiva.users);

    } catch (error) {
        console.error("❌ Error crítico al obtener los datos de la convocatoria oficial:", error);
    }
}

function precargarSociosConfirmados(usuariosConfirmados) {
    const selectSocios = document.getElementById('select-socios');
    if (!selectSocios || !Array.isArray(usuariosConfirmados)) return;

    // Extraer los IDs de los socios que están en la convocatoria oficial
    const idsConfirmados = usuariosConfirmados.map(socio => socio.id);

    // Recorrer las opciones del select múltiple y marcar las que coincidan
    Array.from(selectSocios.options).forEach(option => {
        // option.value contiene el id del socio (según lo configuramos al cargar la lista de socios)
        if (idsConfirmados.includes(option.value)) {
            option.selected = true; // Los deja seleccionados automáticamente
        }
    });

    console.log(`✅ Se han preseleccionado ${idsConfirmados.length} jugadores confirmados en la convocatoria.`);
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
