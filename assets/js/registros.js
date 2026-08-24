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

        // 2. Cargar los movimientos ordenados por create_at ascendente
        const { data, error } = await supabaseClient
            .from("movimientos")
            .select("*")
            .order("create_at", { ascending: true });

        if (error) throw error;

        todosLosRegistros = data || [];
        
        // 3. Renderizar la tabla primero y luego rellenar los selectores
        renderizarTabla(todosLosRegistros);
        poblarFiltros();

    } catch (err) {
        console.error("Error al cargar los registros:", err);
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: red;">Error al cargar los datos de la base de datos.</td></tr>`;
    }
}

function renderizarTabla(registros) {
    const tbody = document.getElementById("tbodyMovimientos");
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

// Extraer valores únicos y rellenar los selectores de filtro
function poblarFiltros() {
    const selects = document.querySelectorAll(".filter-select");

    selects.forEach(select => {
        const colIndex = parseInt(select.getAttribute("data-column"));
        const valoresUnicos = new Set();

        todosLosRegistros.forEach(item => {
            let val = "";
            
            switch (colIndex) {
                case 0:
                    val = item.temporada;
                    break;
                case 2:
                    val = item.fecha_apunte;
                    break;
                case 4:
                    val = item.tipo;
                    break;
                case 5:
                    const uuidSocio = item.codigo_cuenta ? String(item.codigo_cuenta).trim() : "";
                    val = mapaSocios[uuidSocio] || uuidSocio;
                    break;
            }

            if (val !== null && val !== undefined && String(val).trim() !== "") {
                valoresUnicos.add(String(val).trim());
            }
        });

        // Ordenar alfabéticamente
        const valoresOrdenados = Array.from(valoresUnicos).sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));

        // Guardar la selección actual si la hubiera
        const valorPrevio = select.value;

        // Limpiar y añadir la opción por defecto
        select.innerHTML = `<option value="">Todos</option>`;

        valoresOrdenados.forEach(valor => {
            const option = document.createElement("option");
            option.value = valor;
            option.textContent = valor;
            select.appendChild(option);
        });

        // Restaurar valor previo si sigue existiendo
        select.value = valorPrevio;
    });
}

// Lógica de filtrado combinada
function aplicarFiltros() {
    const selectsFiltro = document.querySelectorAll(".filter-select");
    
    const filtrosActivos = Array.from(selectsFiltro)
        .map(select => ({
            columna: parseInt(select.getAttribute("data-column")),
            valor: select.value.toLowerCase().trim()
        }))
        .filter(f => f.valor !== ""); // Solo considerar los filtros que tengan un valor seleccionado

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

    // Escuchar eventos en los selectores
    document.querySelectorAll(".filter-select").forEach(select => {
        select.addEventListener("change", aplicarFiltros);
    });
});
