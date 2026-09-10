import { supabaseClient } from "./supabase.js";

const form = document.getElementById("loginForm");
const error = document.getElementById("loginError");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  error.textContent = "";
  
  const dni = document.getElementById("dni").value;
  const password = document.getElementById("password").value;

  try {

    // Obtener email mediante DNI
    const respuesta = await fetch("https://lqqqbiltwrmkjmrmpwpu.supabase.co/functions/v1/login",
      {
          method:"POST",
          headers:{
              "Content-Type":"application/json"
          },
          body:JSON.stringify({
              dni
          })
      });

    const resultado = await respuesta.json();

    if(!respuesta.ok){
      alert(resultado.error);
      return;
    }

    const email = resultado.email;

    // Login Supabase Auth
    const { data, error:authError } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      alert(authError.message);
      return;
    }

    // Obtener perfil
    const respuestaPerfil = await fetch("https://lqqqbiltwrmkjmrmpwpu.supabase.co/functions/v1/perfil",
        {
            method:"GET",
            headers:{
                "Authorization":
                    `Bearer ${data.session.access_token}`
            }
        }
    );

    const textoPerfil = await respuestaPerfil.text();

    const socio = JSON.parse(textoPerfil);

    if (!respuestaPerfil.ok) {
      alert(socio.error);
      await supabaseClient.auth.signOut();
      return;
    }

    // Usuario pendiente
    if (!socio.activo) {
      await supabaseClient.auth.signOut();
      alert("Tu solicitud todavía está pendiente de aprobación.");
      return;
    }

    // --- INCREMENTAR VISITAS DE FORMA BLINDADA ---
    try {
        // 1. Consultamos el valor real directamente de la tabla socios
        const { data: socioDb, error: fetchError } = await supabaseClient
            .from("socios")
            .select("visitas")
            .eq("id", data.user.id)
            .single();

        if (!fetchError && socioDb) {
            const visitasActuales = socioDb.visitas ? socioDb.visitas : 0;
            
            // 2. Actualizamos sumando 1 al valor real obtenido
            const { error: visitaError } = await supabaseClient
                .from("socios")
                .update({ visitas: visitasActuales + 1 })
                .eq("id", data.user.id);

            if (visitaError) {
                console.error("No se pudo actualizar el contador de visitas:", visitaError);
            }
        }
    } catch (visitaErr) {
        console.error("Error en el proceso de incremento de visitas:", visitaErr);
    }
    // ---------------------------------------------

    if (socio.rol === "administrador") 
      window.location.href = "admin/administracion.html";
    else if (socio.rol === "directiva") 
      window.location.href = "directiva/directiva.html";
    else 
      window.location.href = "socios/socios.html";
    
    } catch (err) {
        console.error(err);
        error.textContent = err.code ? `${err.code}: ${err.message}` : err.message;
    }
});
