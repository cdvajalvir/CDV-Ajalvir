# CD Veteranos Ajalvir - Web v2

## Archivos principales

- `index.html`: página pública principal.
- `login.html`: acceso privado con Firebase.
- `socios/index.html`: área privada de socios.
- `directiva/index.html`: panel de directiva.
- `directiva/usuarios.html`: gestión de fichas internas de usuarios.
- `assets/css/styles.css`: estilos completos.
- `assets/js/app.js`: menú móvil.
- `assets/js/firebase-config.js`: configuración de Firebase.
- `assets/js/auth.js`: login, logout y protección de áreas.

## Antes de publicar

Edita `assets/js/firebase-config.js` y sustituye los valores `PEGA_AQUI...` por los datos reales de Firebase.

## Usuarios

El usuario introduce DNI y contraseña. Internamente se transforma a:

`DNI@cdv-ajalvir.local`

Ejemplo:

`12345678A@cdv-ajalvir.local`
