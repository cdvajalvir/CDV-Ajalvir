import { supabaseClient } from "./supabase.js";

let todosLosRegistros = [];
let mapaSocios = {};

async function cargarDatos() {
    const tbody = document.getElementById("tbodyMovimientos");
    
    try {
        // 1. Cargar la tabla de socios usando id, nombre y apellido
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
        renderizarTabla(todosLosRegistros);

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

// Lógica de filtrado en tiempo real por columnas
function aplicarFiltros() {
    const inputsFiltro = document.querySelectorAll(".filter-input");
    const filtros = Array.from(inputsFiltro).map(input => ({
        columna: parseInt(input.getAttribute("data-column")),
        valor: input.value.toLowerCase().trim()
    }));

    const filtrados = todosLosRegistros.filter(item => {
        const uuidSocio = item.codigo_cuenta ? String(item.codigo_cuenta).trim() : "";
        const nombreSocio = mapaSocios[uuidSocio] || uuidSocio || "";

        const valoresItem = [
            String(item.temporada || "").toLowerCase(),
            String(item.fecha_contable || "").toLowerCase(),
            String(item.fecha_apunte || "").toLowerCase(),
            String(item.concepto || "").toLowerCase(),
            String(item.tipo || "").toLowerCase(),
            String(nombreSocio).toLowerCase(),
            String(item.importe || "").toLowerCase(),
            String(item.saldo || "").toLowerCase()
        ];

        return filtros.every(f => {
            if (!f.valor) return true;
            return valoresItem[f.columna].includes(f.valor);
        });
    });

    renderizarTabla(filtrados);
}

document.addEventListener("DOMContentLoaded", () => {
    cargarDatos();

    document.querySelectorAll(".filter-input").forEach(input => {
        input.addEventListener("input", aplicarFiltros);
    });
});
