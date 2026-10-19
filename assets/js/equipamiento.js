import { supabaseClient } from "./supabase.js";

let mapaSocios = new Map();
let listaEquipamientos = [];

// 1. Verificar permiso de Administrador
async function verificarPermisoAdmin() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = "../index.html";
        return;
    }

    const { data: socio } = await supabaseClient
        .from("socios")
        .select("rol")
        .eq("id", session.user.id)
        .single();

    if (!socio || (socio.rol !== "administrador" && socio.rol !== "admin")) {
        alert("Acceso denegado: Se requieren permisos de administrador.");
        window.location.href = "../index.html";
    }
}

verificarPermisoAdmin();

// 2. Cargar socios y popular selector
async function cargarListaSocios() {
    const selectSocios = document.getElementById("socios_select");
    if (!selectSocios) return;

    try {
        const { data: socios, error } = await supabaseClient
            .from("socios")
            .select("id, nombre, apellido")
            .order("nombre", { ascending: true });

        if (error) throw error;

        selectSocios.innerHTML = "";
        mapaSocios.clear();

        if (socios && socios.length > 0) {
            socios.forEach((s) => {
                const nombreCompleto = `${s.nombre} ${s.apellido || ""}`.trim();
                mapaSocios.set(s.id, nombreCompleto);

                const option = document.createElement("option");
                option.value = s.id;
                option.textContent = nombreCompleto;
                selectSocios.appendChild(option);
            });
        }
    } catch (err) {
        console.error("Error al cargar la lista de socios:", err);
    }
}

// Actualizar contador de Stock dinámicamente al cambiar la selección
function actualizarStockContador() {
    const selectSocios = document.getElementById("socios_select");
    const stockInput = document.getElementById("stock");
    if (!selectSocios || !stockInput) return;

    const seleccionados = Array.from(selectSocios.selectedOptions).filter(opt => opt.value !== "");
    stockInput.value = seleccionados.length;
}

// 3. Cargar el listado de equipamientos
async function cargarEquipamientos() {
    const tbody = document.getElementById("tablaEquipamientoBody");
    if (!tbody) return;

    try {
        const { data, error } = await supabaseClient.functions.invoke("equipamiento", {
            body: { action: "listar" }
        });

        if (error) throw error;

        listaEquipamientos = data?.data || [];
        renderizarTablaEquipamientos(listaEquipamientos);

    } catch (err) {
        console.error("Error al obtener los equipamientos:", err);
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #ff6b6b;">Error al cargar registros: ${err.message}</td></tr>`;
    }
}

// 4. Renderizar tabla con Reserva y Entregados
function renderizarTablaEquipamientos(items) {
    const tbody = document.getElementById("tablaEquipamientoBody");
    if (!tbody) return;

    if (!items || items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: rgba(255,255,255,0.5);">No hay artículos registrados.</td></tr>';
        return;
    }

    tbody.innerHTML = items.map((item) => {
        // Soporte para nombres de campos con guion o guion bajo
        const arrayReservas = Array.isArray(item["reserva-socio"]) ? item["reserva-socio"] : (Array.isArray(item["reserva_socio"]) ? item["reserva_socio"] : []);
        const arrayEntregados = Array.isArray(item["entregado-socio"]) ? item["entregado-socio"] : (Array.isArray(item["entregado_socio"]) ? item["entregado_socio"] : []);

        const stockReserva = arrayReservas.length;

        // Desplegable de Reservas
        let selectReservaHtml = "";
        if (arrayReservas.length > 0) {
            const options = arrayReservas.map(id => `<option value="${id}">${mapaSocios.get(id) || "Socio desconocido"}</option>`).join("");
            selectReservaHtml = `
                <select class="input select-socios-tabla" style="padding: 0.3rem 0.5rem; font-size: 0.85rem; width: 100%;">
                    <option value="" disabled selected>${arrayReservas.length} reserva(s) pendiente(s)</option>
                    ${options}
                </select>`;
        } else {
            selectReservaHtml = '<span style="color: rgba(255,255,255,0.4); font-style: italic; font-size: 0.85rem;">Sin reservas</span>';
        }

        // Desplegable de Entregados
        let selectEntregadosHtml = "";
        if (arrayEntregados.length > 0) {
            const options = arrayEntregados.map(id => `<option value="${id}">${mapaSocios.get(id) || "Socio desconocido"}</option>`).join("");
            selectEntregadosHtml = `
                <select class="input select-socios-tabla" style="padding: 0.3rem 0.5rem; font-size: 0.85rem; width: 100%; border-color: rgba(40,167,69,0.4);">
                    <option value="" disabled selected>${arrayEntregados.length} entregado(s)</option>
                    ${options}
                </select>`;
        } else {
            selectEntregadosHtml = '<span style="color: rgba(255,255,255,0.4); font-style: italic; font-size: 0.85rem;">Ninguno entregado</span>';
        }

        return `
            <tr>
                <td><strong>${item.articulo || '-'}</strong></td>
                <td>${item.referencia || '-'}</td>
                <td>${item.talla || '-'}</td>
                <td>${item.color || '-'}</td>
                <td style="text-align: center;"><span class="badge-stock">${stockReserva}</span></td>
                <td style="min-width: 180px;">${selectReservaHtml}</td>
                <td style="min-width: 180px;">${selectEntregadosHtml}</td>
                <td style="text-align: center; white-space: nowrap;">
                    <button class="btn btn-secondary btn-sm" onclick="prepararEdicion('${item.id}')" title="Editar / Gestionar Entregas">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="eliminarArticulo('${item.id}')" title="Eliminar" style="margin-left: 0.3rem;">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

// 5. Preparar Edición
window.prepararEdicion = function(id) {
    const item = listaEquipamientos.find(e => String(e.id) === String(id));
    if (!item) return;

    document.getElementById("articulo_id").value = item.id;
    document.getElementById("articulo").value = item.articulo || "";
    document.getElementById("referencia").value = item.referencia || "";
    document.getElementById("talla").value = item.talla || "";
    document.getElementById("color").value = item.color || "";

    const arrayReservas = Array.isArray(item["reserva-socio"]) ? item["reserva-socio"] : (Array.isArray(item["reserva_socio"]) ? item["reserva_socio"] : []);

    const selectSocios = document.getElementById("socios_select");
    Array.from(selectSocios.options).forEach(option => {
        option.selected = arrayReservas.includes(option.value);
    });

    actualizarStockContador();

    document.getElementById("formTitle").textContent = "Editar / Gestionar Entrega de Artículo";
    document.getElementById("lblSociosSelect").textContent = "Marcar / Desmarcar Socios de la Reserva";
    document.getElementById("btnEntrega").style.display = "inline-block";

    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// 6. Eliminar Artículo
window.eliminarArticulo = async function(id) {
    if (!confirm("¿Estás seguro de que deseas eliminar este artículo de equipamiento?")) return;

    try {
        const { error } = await supabaseClient.functions.invoke("equipamiento", {
            body: { action: "eliminar", id }
        });

        if (error) throw error;

        mostrarMensaje("Artículo eliminado correctamente.");
        await cargarEquipamientos();

    } catch (err) {
        console.error("Error al eliminar artículo:", err);
        mostrarMensaje(err.message || "Error al eliminar el artículo", true);
    }
};

function mostrarMensaje(texto, esError = false) {
    const mensaje = document.getElementById("mensajeEquipamiento");
    if (mensaje) {
        mensaje.textContent = texto;
        mensaje.className = esError ? "status danger" : "status ok";
    }
}

function limpiarFormulario() {
    const form = document.getElementById("formEquipamiento");
    if (form) form.reset();

    document.getElementById("articulo_id").value = "";
    document.getElementById("stock").value = "0";
    document.getElementById("formTitle").textContent = "Nuevo Pedido / Reserva de Equipamiento";
    document.getElementById("lblSociosSelect").textContent = "Socios con Reserva Solicitada";
    document.getElementById("btnEntrega").style.display = "none";
    mostrarMensaje("");
}

// 7. Eventos DOM
document.addEventListener("DOMContentLoaded", async () => {
    await cargarListaSocios();
    await cargarEquipamientos();

    const btnReserva = document.getElementById("btnReserva");
    const btnEntrega = document.getElementById("btnEntrega");
    const btnLimpiar = document.getElementById("btnLimpiar");
    const selectSocios = document.getElementById("socios_select");

    if (selectSocios) {
        selectSocios.addEventListener("change", actualizarStockContador);
    }

    if (btnLimpiar) btnLimpiar.addEventListener("click", limpiarFormulario);

    // GUARDAR O ACTUALIZAR RESERVA
    if (btnReserva) {
        btnReserva.addEventListener("click", async () => {
            const id = document.getElementById("articulo_id").value;
            const articulo = document.getElementById("articulo").value.trim();
            const referencia = document.getElementById("referencia").value.trim();
            const talla = document.getElementById("talla").value.trim();
            const color = document.getElementById("color").value.trim();

            const sociosSeleccionados = Array.from(selectSocios.selectedOptions)
                .map(opt => opt.value)
                .filter(val => val !== "");

            if (!articulo) {
                mostrarMensaje("El campo 'Artículo' es obligatorio.", true);
                return;
            }

            const payload = {
                id: id || undefined,
                articulo,
                referencia,
                talla,
                color,
                "reserva-socio": sociosSeleccionados
            };

            const accion = id ? "actualizar_reserva" : "crear";

            try {
                mostrarMensaje("Guardando reserva...");

                const { error } = await supabaseClient.functions.invoke("equipamiento", {
                    body: { action: accion, payload }
                });

                if (error) throw error;

                mostrarMensaje(id ? "Reserva actualizada correctamente." : "Reserva creada correctamente.");
                limpiarFormulario();
                await cargarEquipamientos();

            } catch (err) {
                console.error("Error al procesar la reserva:", err);
                mostrarMensaje(err.message || "Error al procesar la reserva", true);
            }
        });
    }

    // REGISTRAR ENTREGA DE ARTÍCULO
    if (btnEntrega) {
        btnEntrega.addEventListener("click", async () => {
            const id = document.getElementById("articulo_id").value;
            if (!id) {
                mostrarMensaje("Selecciona primero un artículo para entregar.", true);
                return;
            }

            // Los socios que QUEDAN marcados en el selector son los que mantienen reserva.
            // Los que se hayan desmarcado pasarán a ENTREGADOS.
            const sociosConReserva = Array.from(selectSocios.selectedOptions)
                .map(opt => opt.value)
                .filter(val => val !== "");

            try {
                mostrarMensaje("Registrando entregas...");

                const { error } = await supabaseClient.functions.invoke("equipamiento", {
                    body: { 
                        action: "entregar", 
                        payload: { 
                            id, 
                            "reserva-socio": sociosConReserva 
                        } 
                    }
                });

                if (error) throw error;

                mostrarMensaje("Entrega de material procesada correctamente.");
                limpiarFormulario();
                await cargarEquipamientos();

            } catch (err) {
                console.error("Error al procesar la entrega:", err);
                mostrarMensaje(err.message || "Error al procesar la entrega", true);
            }
        });
    }
});
