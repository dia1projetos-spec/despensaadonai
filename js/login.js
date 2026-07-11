import {
  auth,
  db,
  doc,
  getDoc,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from "./firebase-config.js?v=4";

const form = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const rememberInput = document.getElementById("remember");
const errorBox = document.getElementById("login-error");
const submitBtn = document.getElementById("login-submit");
const toggleBtn = document.getElementById("toggle-password");

const MENSAJES_ERROR = {
  "auth/invalid-email": "El correo electrónico no es válido.",
  "auth/user-disabled": "Este usuario fue deshabilitado. Contactá al administrador.",
  "auth/user-not-found": "No existe una cuenta con ese correo.",
  "auth/wrong-password": "La contraseña es incorrecta.",
  "auth/invalid-credential": "Correo o contraseña incorrectos.",
  "auth/too-many-requests": "Demasiados intentos. Esperá unos minutos e intentá de nuevo.",
  "auth/network-request-failed": "Sin conexión a internet. Revisá tu red.",
};

function mostrarError(mensaje) {
  errorBox.textContent = mensaje;
  errorBox.classList.add("is-visible");
}

function ocultarError() {
  errorBox.classList.remove("is-visible");
  errorBox.textContent = "";
}

function setCargando(cargando) {
  submitBtn.disabled = cargando;
  submitBtn.classList.toggle("is-loading", cargando);
}

// Ya logueado → redirige directo al panel
onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.replace("admin.html");
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  ocultarError();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    mostrarError("Completá correo y contraseña.");
    return;
  }

  setCargando(true);
  try {
    await setPersistence(
      auth,
      rememberInput.checked ? browserLocalPersistence : browserSessionPersistence
    );
    await signInWithEmailAndPassword(auth, email, password);
    window.location.replace("admin.html");
  } catch (err) {
    const msg = MENSAJES_ERROR[err.code] || "No se pudo iniciar sesión. Intentá de nuevo.";
    mostrarError(msg);
    setCargando(false);
  }
});

toggleBtn.addEventListener("click", () => {
  const isPassword = passwordInput.type === "password";
  passwordInput.type = isPassword ? "text" : "password";
  toggleBtn.textContent = isPassword ? "Ocultar" : "Mostrar";
  toggleBtn.setAttribute("aria-label", isPassword ? "Ocultar contraseña" : "Mostrar contraseña");
});

// ------------------------------------------------------------
// Branding dinámico: logo y fondo configurados desde el panel
// admin quedan guardados en Firestore → config/branding
// Campos esperados: { logoUrl, backgroundUrl, backgroundType: "image"|"video" }
// Si el documento no existe todavía, se queda con el diseño
// por defecto (listras + placeholder de logo).
// ------------------------------------------------------------
async function cargarBranding() {
  try {
    const ref = doc(db, "config", "branding");
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const data = snap.data();
    const logoWrap = document.getElementById("logo-wrap");
    const bgMedia = document.getElementById("bg-media");
    const bgStripes = document.getElementById("bg-stripes");

    if (data.logoUrl) {
      logoWrap.innerHTML = `<img src="${data.logoUrl}" alt="Logo Kiosko D. Diego" />`;
    }

    if (data.backgroundUrl) {
      bgStripes.style.display = "none";
      bgMedia.style.display = "block";
      if (data.backgroundType === "video") {
        bgMedia.innerHTML = `<video class="login-bg__media" style="display:block" autoplay muted loop playsinline src="${data.backgroundUrl}"></video>`;
      } else {
        bgMedia.innerHTML = `<img class="login-bg__media" style="display:block" src="${data.backgroundUrl}" alt="" />`;
      }
    }
  } catch (err) {
    // Silencioso: si falla, se mantiene el fondo/logo por defecto
    console.warn("No se pudo cargar el branding:", err);
  }
}

cargarBranding();
