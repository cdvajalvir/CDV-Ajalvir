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

    if (socio.rol === "administrador") 
      window.location.href = "directiva/socios.html";
    else if (socio.rol === "directiva") 
      window.location.href = "directiva/index.html";
    else 
      window.location.href = "socios/index.html";
    
    } catch (err) {
        console.error(err);
        error.textContent = err.code ? `${err.code}: ${err.message}` : err.message;
    }
});
