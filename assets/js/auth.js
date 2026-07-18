async function comprobarAcceso(rolesPermitidos){
    const {
        data:{
            session
        }
    } = await supabase.auth.getSession();

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

    if(!usuario.activo){
        window.location.href="/pendiente.html";
        return;
    }

    if(!rolesPermitidos.includes(usuario.rol)){
        window.location.href="/403.html";
        return;
    }

    return usuario;
}