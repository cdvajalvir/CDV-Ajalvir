# CDV-Ajalvir v3

Versión 3 de la web del CD Veteranos Ajalvir.

## Qué mantiene

- Login por ID de socio: `CDV0001`.
- Email interno Firebase: `CDV0001@cdv-ajalvir.local`.
- Contraseña inicial: DNI.
- Colección Firestore existente: `usuarios`.
- Campos existentes: `activo`, `alias`, `cuota`, `dni`, `dorsal`, `email`, `fecNacimiento`, `idSocio`, `nombre`, `observaciones`, `rol`, `telefono`.
- Roles: `socio`, `directiva`, `administrador`.

## Antes de subir

Copia tus datos reales de Firebase en:

`assets/js/firebase-config.js`

También puedes copiar directamente tu archivo `firebase-config.js` actual encima del que viene en este ZIP.

## Estructura principal

- `index.html`: web pública.
- `login.html`: acceso privado.
- `socios/index.html`: área de socio.
- `socios/perfil.html`: ficha privada del socio.
- `directiva/index.html`: panel directiva.
- `directiva/socios.html`: gestión de socios, solo administrador.

## Reglas

Incluye `firestore.rules` preparado para usar la colección `usuarios`.

## Supabase

To download functions from UI: `npx supabase functions download`

To deploy local functions: `npx supabase functions deploy <function name>`
