const form = document.getElementById("loginForm");
const error = document.getElementById("loginError");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  error.textContent = "";
  
  const dni = document.getElementById("dni").value;
  const password = document.getElementById("password").value;

  try {

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

    const email = await respuesta.json();

    if(!respuesta.ok){
      alert(usuario.error);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      alert(error.message);
      return;
    }

    // Pedir perfil
    const respuestaPerfil = await fetch("https://lqqqbiltwrmkjmrmpwpu.supabase.co/functions/v1/perfil",
        {
            method:"GET",
            headers:{
                "Authorization":
                    `Bearer ${data.session.access_token}`
            }
        }
    );

    const socio = await respuestaPerfil.json();
    if (!socio.activo) {
      await supabase.auth.signOut();
      alert("Tu solicitud todavía está pendiente de aprobación.");
      return;
    }

    if (usuario.rol === "administrador") window.location.href = "directiva/socios.html";
    else if (usuario.rol === "directiva") window.location.href = "directiva/index.html";
    else window.location.href = "socios/index.html";
    
    } catch (err) {
        console.error(err);
        error.textContent = err.code ? `${err.code}: ${err.message}` : err.message;
    }
});
