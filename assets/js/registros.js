import { supabaseClient } from "./supabase.js";

let todosLosRegistros = [];
let mapaSocios = {};

async function cargarDatos() {
    const tbody = document.getElementById("tbodyMovimientos");
    
    try {
        // 1. Cargar la tabla de socios
        const { data: sociosData, error: errorSocios } = await supabaseClient
            .from("socios")
            .select("id, nombre, apellido");

        if (errorSocios) {
            console.error("Error al cargar la tabla socios:", errorSocios);
        } else if (sociosData) {
            sociosData.forEach(socio => {
                const idSocio = socio.id ? String(socio.id).trim() : "";
                const nombre = socio.nombre || "";
                const apellido = socio.apellido || "";
                const nombreCompleto = `${nombre} ${apellido}`.trim();
                
                if (idSocio) {
                    mapaSocios[idSocio] = nombreCompleto || idSocio;
                }
            });
        }

        // 2. Cargar los movimientos
        const { data, error } = await supabaseClient
            .from("movimientos")
            .select("*")
            .order("create_at", { ascending: true });

        if (error) throw error;

        todosLosRegistros = data || [];
        console.log("Registros cargados para los filtros:", todosLosRegistros);

        // 3. Renderizar y poblar
        renderizarTabla(todosLosRegistros);
        poblarFiltros();

    } catch (err) {
        console.error("Error al cargar los registros:", err);
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: red;">Error al cargar los datos de la base de datos.</td></tr>`;
    }
}

function renderizarTabla(registros) {
    const tbody = document.getElementById("tbodyMovimientos");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (registros.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #94a3b8;">No se encontraron registros.</td></tr>`;
        return;
    }

    registros.forEach(item => {
        const tr = document.createElement("tr");
        const uuidSocio = item.codigo_cuenta ? String(item.codigo_cuenta).trim() : "";
        const nombreSocio = mapaSocios[uuidSocio] || uuidSocio || "";

        tr.innerHTML = `
            <td>${item.temporada || ""}</td>
            <td>${item.fecha_contable || ""}</td>
            <td>${item.fecha_apunte || ""}</td>
            <td>${item.concepto || ""}</td>
            <td>${item.tipo || ""}</td>
            <td>${nombreSocio}</td>
            <td>${item.importe !== null && item.importe !== undefined ? Number(item.importe).toFixed(2) : ""}</td>
            <td>${item.saldo !== null && item.saldo !== undefined ? Number(item.saldo).toFixed(2) : ""}</td>
        `;
        tbody.appendChild(tr);
    });
}

function poblarFiltros() {
    const selects = document.querySelectorAll(".filter-select");
    console.log("Selects de filtro encontrados:", selects.length);

    selects.forEach(select => {
        const colIndex = parseInt(select.getAttribute("data-column"));
        const valoresUnicos = new Set();

        todosLosRegistros.forEach(item => {
            let val = "";
            
            if (colIndex === 0) {
                val = item.temporada;
            } else if (colIndex === 2) {
                val = item.fecha_apunte;
            } else if (colIndex === 4) {
                val = item.tipo;
            } else if (colIndex === 5) {
                const uuidSocio = item.codigo_cuenta ? String(item.codigo_cuenta).trim() : "";
                val = mapaSocios[uuidSocio] || uuidSocio;
            }

            if (val !== null && val !== undefined && String(val).trim() !== "") {
                valoresUnicos.add(String(val).trim());
            }
        });

        const valoresOrdenados = Array.from(valoresUnicos).sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));

        // Limpiar opciones previas manteniendo "Todos"
        select.innerHTML = `<option value="">Todos</option>`;

        valoresOrdenados.forEach(valor => {
            const option = document.createElement("option");
            option.value = valor;
            option.textContent = valor;
            select.appendChild(option);
        });
    });
}

function aplicarFiltros() {
    const selectsFiltro = document.querySelectorAll(".filter-select");
    
    const filtrosActivos = Array.from(selectsFiltro)
        .map(select => ({
            columna: parseInt(select.getAttribute("data-column")),
            valor: select.value.toLowerCase().trim()
        }))
        .filter(f => f.valor !== "");

    const filtrados = todosLosRegistros.filter(item => {
        const uuidSocio = item.codigo_cuenta ? String(item.codigo_cuenta).trim() : "";
        const nombreSocio = mapaSocios[uuidSocio] || uuidSocio || "";

        const valoresItem = {
            0: String(item.temporada || "").toLowerCase().trim(),
            2: String(item.fecha_apunte || "").toLowerCase().trim(),
            4: String(item.tipo || "").toLowerCase().trim(),
            5: String(nombreSocio).toLowerCase().trim()
        };

        return filtrosActivos.every(f => valoresItem[f.columna] === f.valor);
    });

    renderizarTabla(filtrados);
}

document.addEventListener("DOMContentLoaded", () => {
    cargarDatos();

    document.querySelectorAll(".filter-select").forEach(select => {
        select.addEventListener("change", aplicarFiltros);
    });
});
