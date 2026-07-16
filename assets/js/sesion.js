function obtenerUsuario(){
    const usuario = sessionStorage.getItem("usuario");

    if (!usuario) {
        return null;
    }
    return JSON.parse(usuario);
}


function protegerPagina(){
    const usuario = obtenerUsuario();

    if(!usuario){
        window.location.href="../login.html";
    }
}
