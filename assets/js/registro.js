const form = document.getElementById("registroForm");
const mensaje = document.getElementById("registroMensaje");

form.addEventListener("submit", async(e)=>{
    e.preventDefault();
    mensaje.textContent="";

    const datos={
        nombre: document.getElementById("nombre").value,
        apellido: document.getElementById("apellido").value,
        dni: document.getElementById("dni").value,
        email: document.getElementById("email").value,
        telefono: document.getElementById("telefono").value,
        password: document.getElementById("password").value
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
