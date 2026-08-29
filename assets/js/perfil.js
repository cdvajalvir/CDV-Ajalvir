import { comprobarAcceso, cerrarSesion } from "./auth.js";
import { supabaseClient } from "./supabase.js";

const campos = [
    {
        titulo: "Nombre",
        campo: "nombreCompleto",
        editable: false,
        tipo: "text"
    },
    {
        titulo: "Alias",
        campo: "alias",
        editable: true,
        tipo: "text"
    },
    {
        titulo: "DNI",
        campo: "dni",
        editable: false,
        tipo: "text"
    },
    {
        titulo: "Teléfono",
        campo: "telefono",
        editable: true,
        tipo: "tel"
    },
    {
        titulo: "Email",
        campo: "email",
        editable: true,
        tipo: "email"
    },
    {
        titulo: "Fecha nacimiento",
        campo: "fecha_nacimiento",
        editable: true,
        tipo: "date"
    },
    {
        titulo: "Dorsal",
        campo: "numero",
        editable: true,
        tipo: "text"
    },
    {
        titulo: "Talla",
        campo: "talla",
        editable: true,
        tipo: "text"
    },
    {
        titulo: "Rol",
        campo: "rol",
        editable: false,
        tipo: "text"
    },
    {
        titulo: "Cantidad Abonada al Club",
        campo: "cantidad_pagada",
        editable: false,
        tipo: "number"
    }
];

const grid = document.getElementById("perfilGrid");
const btnEditar = document.getElementById("btnEditar");
const btnGuardar = document.getElementById("btnGuardar");
const btnCancelar = document.getElementById("btnCancelar");
const btnLogout = document.getElementById("btnLogout");

let socioActual;

comprobarAcceso([
    "administrador",
    "directiva",
    "socio"
], (socio) => {
    socioActual = socio;
    mostrarPerfil();
});

// Comprobación segura por si el botón de logout no está en la página
if (btnLogout) {
    btnLogout.addEventListener("click", cerrarSesion);
}

if (btnEditar) {
    btnEditar.addEventListener("click", editarPerfil);
}

if (btnCancelar) {
    btnCancelar.addEventListener("click", mostrarPerfil);
}

if (btnGuardar) {
    btnGuardar.addEventListener("click", guardarPerfil);
}

function mostrarPerfil() {
    if (!grid) return;

    grid.classList.remove("editing"); // Vuelve al diseño normal de lectura
    
    btnEditar.hidden = false;
    btnGuardar.hidden = true;
    btnCancelar.hidden = true;

    grid.innerHTML = "";

    // Cálculo automático de la temporada actual (de septiembre a agosto)
    const fechaActual = new Date();
    const anioActual = fechaActual.getFullYear();
    const mesActual = fechaActual.getMonth() + 1; // Enero es 1, Diciembre es 12

    let temporadaActual = "";
    if (mesActual >= 9) {
        // De septiembre a diciembre: Ej. Sep 2026 -> 2026/2027
        temporadaActual = `${anioActual}/${anioActual + 1}`;
    } else {
        // De enero a agosto: Ej. Feb 2026 -> 2025/2026
        temporadaActual = `${anioActual - 1}/${anioActual}`;
    }

    campos.forEach((campo) => {
        let valor = "";

        if (campo.campo === "nombreCompleto") {
            valor = `${socioActual.nombre || ""} ${socioActual.apellido || ""}`.trim();
        } else if (campo.campo === "cantidad_pagada") {
            const pagos = socioActual[campo.campo];
            if (Array.isArray(pagos) && pagos.length > 0) {
                // Buscamos el registro que coincida con la temporada actual calculada
                const pagoTemporada = pagos.find(p => p.temporada === temporadaActual);
                
                if (pagoTemporada) {
                    valor = `${pagoTemporada.pagado} € (Cuota: ${pagoTemporada.cuota} €)`;
                } else {
                    valor = `0 € (Temporada ${temporadaActual} no registrada)`;
                }
            } else {
                valor = "0 €";
            }
        } else {
            valor = socioActual[campo.campo];
        }

        grid.insertAdjacentHTML(
            "beforeend",
            `
                <div class="profile-item">
                    <span>${campo.titulo}</span>
                    <strong>${valor || "-"}</strong>
                </div>
            `
        );
    });
}

function editarPerfil() {
    if (!grid) return;

    grid.classList.add("editing"); // Activa las 3 columnas en edición
    
    btnEditar.hidden = true;
    btnGuardar.hidden = false;
    btnCancelar.hidden = false;

    grid.innerHTML = "";

    // Nombre
    grid.insertAdjacentHTML(
        "beforeend",
        `
        <div class="profile-item">
            <span>Nombre</span>
            <input id="nombre" value="${socioActual.nombre ?? ""}">
        </div>
        `
    );

    // Apellidos
    grid.insertAdjacentHTML(
        "beforeend",
        `
        <div class="profile-item">
            <span>Apellidos</span>
            <input id="apellido" value="${socioActual.apellido ?? ""}">
        </div>
        `
    );

    campos
        .filter(c => c.campo !== "nombreCompleto")
        .forEach((campo) => {
            if (campo.editable) {
                grid.insertAdjacentHTML(
                    "beforeend",
                    `
                    <div class="profile-item">
                        <span>${campo.titulo}</span>
                        <input
                            type="${campo.tipo}"
                            id="${campo.campo}"
                            value="${socioActual[campo.campo] ?? ""}">
                    </div>
                    `
                );
            } else {
                // Si es un campo no editable como cantidad_pagada en modo edición, 
                // podemos mostrar también su valor actual formateado o en texto plano
                let valorNoEditable = socioActual[campo.campo];
                if (campo.campo === "cantidad_pagada" && Array.isArray(valorNoEditable)) {
                    valorNoEditable = valorNoEditable.map(p => `${p.temporada}: ${p.pagado}€`).join(", ");
                }

                grid.insertAdjacentHTML(
                    "beforeend",
                    `
                    <div class="profile-item">
                        <span>${campo.titulo}</span>
                        <strong>${valorNoEditable || "-"}</strong>
                    </div>
                    `
                );
            }
        });
}

async function guardarPerfil() {
    try {
        const {
            data: { session },
            error
        } = await supabaseClient.auth.getSession();

        if (error || !session) {
            alert("Sesión no válida");
            return;
        }

        const datos = {
            nombre: document.getElementById("nombre")?.value.trim(),
            apellido: document.getElementById("apellido")?.value.trim(),
            alias: document.getElementById("alias")?.value.trim() || null,
            telefono: document.getElementById("telefono")?.value.trim() || null,
            email: document.getElementById("email")?.value.trim().toLowerCase() || null,
            fecha_nacimiento: document.getElementById("fecha_nacimiento")?.value || null,
            numero: document.getElementById("numero")?.value || null,
            talla: document.getElementById("talla")?.value.trim() || null
        };

        const respuesta = await fetch(
            "https://lqqqbiltwrmkjmrmpwpu.supabase.co/functions/v1/actualizar-perfil",
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`
                },
                body: JSON.stringify(datos)
            }
        );

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            alert(resultado.error || "Error actualizando perfil");
            return;
        }

        // Actualizamos los datos locales
        socioActual = {
            ...socioActual,
            ...datos
        };

        alert("Perfil actualizado correctamente");
        mostrarPerfil();

    } catch (error) {
        console.error("Error al guardar perfil:", error);
        alert("Error de conexión");
    }
}
