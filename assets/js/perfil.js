import { comprobarAcceso, cerrarSesion } from "./auth.js";

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
    tipo: "number"
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
    titulo: "Cuota",
    campo: "cantidad_pagada",
    editable: false,
    tipo: "number"
}

];

const grid = document.getElementById("perfilGrid");
const btnEditar = document.getElementById("btnEditar");
const btnGuardar = document.getElementById("btnGuardar");
const btnCancelar = document.getElementById("btnCancelar");

console.log(btnEditar, btnGuardar, btnCancelar);

let socioActual;

comprobarAcceso([
    "administrador",
    "directiva",
    "socio"
], (socio) => {
    socioActual = socio;
    mostrarPerfil();
});

document.getElementById("btnLogout").addEventListener(
    "click",
    cerrarSesion
);


btnEditar.addEventListener(
    "click",
    editarPerfil
);

btnCancelar.addEventListener(
    "click",
    mostrarPerfil
);

btnGuardar.addEventListener(
    "click",
    guardarPerfil
);

function mostrarPerfil(){

    console.log("mostrarPerfil");

    btnEditar.hidden = false;
    btnGuardar.hidden = true;
    btnCancelar.hidden = true;

    console.log(
        btnEditar.hidden,
        btnGuardar.hidden,
        btnCancelar.hidden
    );

    grid.innerHTML = "";

    campos.forEach((campo)=>{

        const valor =
            campo.campo === "nombreCompleto"
            ? `${socioActual.nombre} ${socioActual.apellido}`
            : socioActual[campo.campo];

        grid.insertAdjacentHTML(
            "beforeend",
            `
                <div class="profile-item">

                    <span>${campo.titulo}</span>

                    <strong>${valor ?? "-"}</strong>

                </div>
            `
        );
    });
}

function editarPerfil(){

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

            <input
                id="nombre"
                value="${socioActual.nombre ?? ""}">

        </div>
        `
    );

    // Apellidos

    grid.insertAdjacentHTML(
        "beforeend",
        `
        <div class="profile-item">

            <span>Apellidos</span>

            <input
                id="apellido"
                value="${socioActual.apellido ?? ""}">

        </div>
        `
    );

    campos
        .filter(
            c=>c.campo!=="nombreCompleto"
        )
        .forEach((campo)=>{

            if(campo.editable){

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

                grid.insertAdjacentHTML(
                    "beforeend",
                    `
                    <div class="profile-item">

                        <span>${campo.titulo}</span>

                        <strong>${socioActual[campo.campo] ?? "-"}</strong>

                    </div>
                    `
                );
            }
        });
}

async function guardarPerfil(){

    // aquí llamaremos a la edge function

}
