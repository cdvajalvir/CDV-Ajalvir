function validarDocumento(documento) {
    if (!documento) return false;

    documento = documento.trim().toUpperCase();

    const letras = "TRWAGMYFPDXBNJZSQVHLCKE";

    // DNI
    const dniRegex = /^(\d{8})([A-Z])$/;

    // NIE
    const nieRegex = /^([XYZ])(\d{7})([A-Z])$/;

    let match = documento.match(dniRegex);

    if (match) {
        const numero = parseInt(match[1], 10);
        const letra = match[2];
        return letras[numero % 23] === letra;
    }

    match = documento.match(nieRegex);

    if (match) {
        const prefijo = {
            X: "0",
            Y: "1",
            Z: "2"
        }[match[1]]!;

        const numero = parseInt(prefijo + match[2], 10);
        const letra = match[3];

        return letras[numero % 23] === letra;
    }

    return false;
}