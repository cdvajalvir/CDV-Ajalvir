const form = document.getElementById("registroForm");
const mensaje = document.getElementById("registroMensaje");

// Función para calcular la temporada actual en formato xxxx/xxxx (ej: 2026/2027)
function calcularTemporadaActual() {
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = ahora.getMonth(); // 0 = Enero, 8 = Septiembre

    if (mes >= 8) {
        return `${anio}/${anio + 1}`;
    } else {
        return `${anio - 1}/${anio}`;
    }
}

// Mostrar automáticamente la temporada junto al título al cargar la página
document.addEventListener("DOMContentLoaded", () => {
    const spanTemporada = document.getElementById("temporadaActualLabel");
    if (spanTemporada) {
        spanTemporada.textContent = `(${calcularTemporadaActual()})`;
    }
});

form.addEventListener("submit", async(e)=>{
    e.preventDefault();
    mensaje.textContent="";

    const datos={
        nombre: document.getElementById("nombre").value,
        apellido: document.getElementById("apellido").value,
        dni: document.getElementById("dni").value,
        email: document.getElementById("email").value,
        telefono: document.getElementById("telefono").value,
        password: document.getElementById("password").value,
        temporada: document.getElementById("temporadaActualLabel").textContent
    };

    try{
        const respuesta =
        await fetch("https://lqqqbiltwrmkjmrmpwpu.supabase.co/functions/v1/crear-registro", {
            method:"POST",
            headers:{
                "Content-Type":"application/json"
            },
            body:
            JSON.stringify(datos)
        });

        const resultado = await respuesta.json();

        if(!respuesta.ok){
            mensaje.textContent =
            resultado.error;
            return;
        }

        mensaje.textContent = resultado.mensaje;
        form.reset();

    } catch(error){
        console.error(error);
        mensaje.textContent = "Error de conexión";
    }
});
