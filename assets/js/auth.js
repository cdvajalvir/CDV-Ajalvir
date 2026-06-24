import { auth, db } from "./firebase-config.js";
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

function idSocioToEmail(idSocio) {
    return String(idSocio || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "") + "@cdv-ajalvir.local";
}

export async function loginConIdSocio(idSocio, password) {
    const email = idSocioToEmail(idSocio);

    const cred = await signInWithEmailAndPassword(auth, email, password);

    const ref = doc(db, "usuarios", cred.user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
        await signOut(auth);
        throw new Error("Usuario sin ficha interna.");
    }

    const usuario = snap.data();

    if (!usuario.activo) {
        await signOut(auth);
        throw new Error("Usuario desactivado.");
    }

    return usuario;
}
export async function cerrarSesion() {
    await signOut(auth);
    window.location.href = getLoginUrl();
}

export function protegerPagina(rolNecesario) {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = "../login.html";
            return;
        }

        const ref = doc(db, "usuarios", user.uid);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
            await signOut(auth);
            window.location.href = "../login.html";
            return;
        }

        const data = snap.data();

        if (!data.activo) {
            await signOut(auth);
            window.location.href = "../login.html";
            return;
        }

        const rol = data.rol;

        if (rolNecesario === "socio") {
            if (
                rol !== "socio" &&
                rol !== "directiva" &&
                rol !== "administrador"
            ) {
                window.location.href = "../login.html";
            }
        }

        if (rolNecesario === "directiva") {
            if (
                rol !== "directiva" &&
                rol !== "administrador"
            ) {
                window.location.href = "../login.html";
            }
        }

        if (rolNecesario === "administrador") {
            if (rol !== "administrador") {
                window.location.href = "../login.html";
            }
        }
    });
}

function getLoginUrl() {
    const path = window.location.pathname;

    if (path.includes("/socios/") || path.includes("/directiva/")) {
        return "../login.html";
    }

    return "login.html";
}
