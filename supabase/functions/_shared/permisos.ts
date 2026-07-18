export function puedeEntrar(
    rol:string,
    permitido:string[]
){
    return permitido.includes(rol);
}
