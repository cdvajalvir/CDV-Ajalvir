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
              dni,
              password
          })
      });

    const usuario = await respuesta.json();

    if(!respuesta.ok){
      alert(usuario.error);
      return;
    }

    sessionStorage.setItem(
        "usuario",
        JSON.stringify(usuario)
    );

    if (usuario.rol === "administrador") window.location.href = "directiva/socios.html";
    else if (usuario.rol === "directiva") window.location.href = "directiva/index.html";
    else window.location.href = "socios/index.html";
    
    } catch (err) {
        console.error(err);
        error.textContent = err.code ? `${err.code}: ${err.message}` : err.message;
    }
});
