import { supabaseClient } from "./supabase.js";
import { comprobarAcceso, cerrarSesion } from "./auth.js";

window.cerrarSesion = cerrarSesion;

document.addEventListener("DOMContentLoaded", () => {
    // Protección estricta de la página de directiva
    comprobarAcceso(["administrador", "directiva"], async (usuario) => {
        console.log("Acceso concedido a Directiva:", usuario);
        await cargarDatosDirectiva();
    });
});

async function cargarDatosDirectiva() {
    try {
        // 1. Obtener todos los socios que tengan rol 'directiva' o 'administrador'
        const { data: directivos, error: errorSocios } = await supabaseClient
            .from("socios")
            .select("id, nombre, apellido, rol, activo");

        if (errorSocios) throw errorSocios;

        // Filtrar perfiles de directiva o administradores
        const miembrosGestion = directivos.filter(s => s.rol === "directiva" || s.rol === "administrador");

        // Rellenar métricas rápidas del panel superior si existen los elementos
        const elemSociosActivos = document.getElementById("sociosActivos");
        const elemTotalDirectiva = document.getElementById("totalDirectiva");
        const elemTotalAdmin = document.getElementById("totalAdmin");

        if (elemSociosActivos) elemSociosActivos.textContent = directivos.filter(s => s.activo).length;
        if (elemTotalDirectiva) elemTotalDirectiva.textContent = directivos.filter(s => s.rol === "directiva").length;
        if (elemTotalAdmin) elemTotalAdmin.textContent = directivos.filter(s => s.rol === "administrador").length;

        // 2. Obtener todos los movimientos financieros para calcular saldos
        // Nota: Asegúrate de que el campo que vincula el movimiento con el socio en tu tabla se llama 'codigo_cuenta' o 'id_socio' (aquí usaremos 'codigo_cuenta' que es el estándar habitual en tu proyecto)
        const { data: movimientos, error: errorMovs } = await supabaseClient
            .from("movimientos")
            .select("codigo_cuenta, importe");

        if (errorMovs) {
            console.warn("No se pudo cargar la tabla de movimientos o está vacía:", errorMovs.message);
        }

        // Agrupar y sumar los importes por UUID
        const saldosPorUuid = {};
        if (movimientos) {
            movimientos.forEach(mov => {
                const uuid = mov.codigo_cuenta;
                const importe = parseFloat(mov.importe) || 0;
                if (!saldosPorUuid[uuid]) {
                    saldosPorUuid[uuid] = 0;
                }
                saldosPorUuid[uuid] += importe;
            });
        }

        // 3. Cruzar los datos de los miembros con sus saldos calculados
        const tbody = document.querySelector("#tablaSaldosDirectiva tbody");
        if (!tbody) return;

        tbody.innerHTML = "";

        let filasRenderizadas = 0;

        miembrosGestion.forEach(miembro => {
            const saldoTotal = saldosPorUuid[miembro.id] || 0;

            // Filtro: Si el saldo es 0, no se muestra
            if (saldoTotal !== 0) {
                filasRenderizadas++;
                const tr = document.createElement("tr");

                const tdNombre = document.createElement("td");
                tdNombre.textContent = `${miembro.nombre} ${miembro.apellido}`;

                const tdSaldo = document.createElement("td");
                tdSaldo.style.textAlign = "right";
                tdSaldo.textContent = `${saldoTotal.toFixed(2)} €`;
                // Opcional: Dar color según si debe o tiene saldo a favor
                tdSaldo.style.color = saldoTotal < 0 ? "#d9534f" : "#2b542c";

                tr.appendChild(tdNombre);
                tr.appendChild(tdSaldo);
                tbody.appendChild(tr);
            }
        });

        if (filasRenderizadas === 0) {
            tbody.innerHTML = `<tr><td colspan="2" style="text-align: center;">No hay miembros de directiva o administración con saldo pendiente o a favor.</td></tr>`;
        }

    } catch (err) {
        console.error("Error al cargar los datos del panel de directiva:", err);
        const tbody = document.querySelector("#tablaSaldosDirectiva tbody");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="2" style="text-align: center; color: red;">Error al cargar los saldos.</td></tr>`;
        }
    }
}
