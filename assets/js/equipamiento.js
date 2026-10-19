import { supabaseClient } from "./supabase.js";

// Mapa global para relacionar ID de socio con su Nombre completo rápido en la tabla
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

// 2. Cargar socios y popular el selector múltiple
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
        } else {
            selectSocios.innerHTML = '<option value="">No hay socios registrados</option>';
        }

    } catch (err) {
        console.error("Error al cargar la lista de socios:", err);
        selectSocios.innerHTML = '<option value="">Error al cargar socios</option>';
    }
}

// 3. Cargar el listado de equipamientos invocando la Edge Function 'equipamiento'
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
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #ff6b6b;">Error al cargar registros: ${err.message}</td></tr>`;
    }
}

// 4. Renderizar la tabla de artículos con sus badges de socios
function renderizarTablaEquipamientos(items) {
    const tbody = document.getElementById("tablaEquipamientoBody");
    if (!tbody) return;

    if (!items || items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: rgba(255,255,255,0.5);">No hay artículos registrados.</td></tr>';
        return;
    }

    tbody.innerHTML = items.map((item) => {
        const arraySociosIds = Array.isArray(item.socio) ? item.socio : [];
        
        const badgesSocios = arraySociosIds.length > 0
            ? arraySociosIds.map(id => {
                const nombre = mapaSocios.get(id) || "Socio desconocido";
                return `<span class="badge-socios"><i class="fa-solid fa-user" style="font-size:0.7rem; margin-right:3px;"></i>${nombre}</span>`;
              }).join(" ")
            : '<span style="color: rgba(255,255,255,0.4); font-style: italic;">Sin socios asignados</span>';

        return `
            <tr>
                <td><strong>${item.articulo || '-'}</strong></td>
                <td>${item.referencia || '-'}</td>
                <td>${item.talla || '-'}</td>
                <td>${item.color || '-'}</td>
                <td>${badgesSocios}</td>
                <td style="text-align: center;">
                    <button class="btn btn-secondary btn-sm" onclick="prepararEdicion('${item.id}')" title="Editar">
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

// 5. Función para cargar datos en el formulario para Edición (Expuesta a window)
window.prepararEdicion = function(id) {
    const item = listaEquipamientos.find(e => e.id === id);
    if (!item) return;

    document.getElementById("articulo_id").value = item.id;
    document.getElementById("articulo").value = item.articulo || "";
    document.getElementById("referencia").value = item.referencia || "";
    document.getElementById("talla").value = item.talla || "";
    document.getElementById("color").value = item.color || "";

    // Marcar opciones seleccionadas en el select múltiple
    const selectSocios = document.getElementById("socios_select");
    const arraySocios = Array.isArray(item.socio) ? item.socio : [];

    Array.from(selectSocios.options).forEach(option => {
        option.selected = arraySocios.includes(option.value);
    });

    // Modificar interfaz para modo edición
    document.getElementById("formTitle").textContent = "Editar Artículo de Equipamiento";
    document.getElementById("btnGuardar").textContent = "Actualizar Artículo";
    document.getElementById("btnCancelar").style.display = "inline-block";

    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// 6. Función para eliminar artículo (Expuesta a window)
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

// Utilidad para mostrar mensajes
function mostrarMensaje(texto, esError = false) {
    const mensaje = document.getElementById("mensajeEquipamiento");
    if (mensaje) {
        mensaje.textContent = texto;
        mensaje.className = esError ? "status danger" : "status ok";
    }
}

// Reseteo del formulario
function limpiarFormulario() {
    const form = document.getElementById("formEquipamiento");
    if (form) form.reset();

    document.getElementById("articulo_id").value = "";
    document.getElementById("formTitle").textContent = "Nuevo Artículo de Equipamiento";
    document.getElementById("btnGuardar").textContent = "Guardar Artículo";
    document.getElementById("btnCancelar").style.display = "none";
    mostrarMensaje("");
}

// 7. Eventos al cargar la página
document.addEventListener("DOMContentLoaded", async () => {
    await cargarListaSocios();
    await cargarEquipamientos();

    const form = document.getElementById("formEquipamiento");
    const btnLimpiar = document.getElementById("btnLimpiar");
    const btnCancelar = document.getElementById("btnCancelar");

    if (btnLimpiar) btnLimpiar.addEventListener("click", limpiarFormulario);
    if (btnCancelar) btnCancelar.addEventListener("click", limpiarFormulario);

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const id = document.getElementById("articulo_id").value;
            const articulo = document.getElementById("articulo").value.trim();
            const referencia = document.getElementById("referencia").value.trim();
            const talla = document.getElementById("talla").value.trim();
            const color = document.getElementById("color").value.trim();

            // Obtener array de UUIDs de socios seleccionados en el select múltiple
            const selectSocios = document.getElementById("socios_select");
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
                socio: sociosSeleccionados
            };

            const accion = id ? "actualizar" : "crear";

            try {
                mostrarMensaje("Guardando cambios...");

                const { error } = await supabaseClient.functions.invoke("equipamiento", {
                    body: { action: accion, payload }
                });

                if (error) throw error;

                mostrarMensaje(id ? "Artículo actualizado correctamente." : "Artículo guardado correctamente.");
                limpiarFormulario();
                await cargarEquipamientos();

            } catch (err) {
                console.error("Error al guardar equipamiento:", err);
                mostrarMensaje(err.message || "Error al procesar la petición", true);
            }
        });
    }
});
