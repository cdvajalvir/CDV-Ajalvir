export async function comprobarAcceso(rolesPermitidos, callback){
    const {
        data:{
            session
        }
    } = await supabaseClient.auth.getSession();

    if(!session){
        window.location.href="/login.html";
        return;
    }

    const respuesta = await fetch(
        "/functions/v1/perfil",
        {
            headers:{
                Authorization:
                `Bearer ${session.access_token}`
            }
        }
    );

    const usuario = await respuesta.json();

    if(!respuesta.ok){
        await supabaseClient.auth.signOut();
        window.location.href="/login.html";
        return;
    }

    if(!socio.activo){
        await supabaseClient.auth.signOut();
        alert("Tu cuenta está pendiente de aprobación.");
        window.location.href ="/login.html";
        return;
    }



    if(!rolesPermitidos.includes(usuario.rol)){
        window.location.href="/403.html";
        return;
    }

    if (callback) {
        callback(usuario);
    }

    return usuario;
}

export async function cerrarSesion() {
    await supabaseClient.auth.signOut();
    window.location.href ="/login.html";
}