import { db, doc, getDoc, setDoc } from "./firebase-config.js?v=10";
import { subirACloudinary } from "./cloudinary.js?v=10";
import { mostrarToast } from "./utils.js?v=10";

export function initConfig() {
  const inputIva = document.getElementById("config-iva-global");
  const btnGuardarIva = document.getElementById("btn-guardar-iva");
  const inputLogo = document.getElementById("config-logo-file");
  const inputFondo = document.getElementById("config-fondo-file");
  const btnGuardarBranding = document.getElementById("btn-guardar-branding");

  cargarConfig();

  async function cargarConfig() {
    const snap = await getDoc(doc(db, "config", "general"));
    if (snap.exists()) inputIva.value = snap.data().ivaGlobal ?? "";
  }

  btnGuardarIva.addEventListener("click", async () => {
    const valor = parseFloat(inputIva.value);
    try {
      await setDoc(doc(db, "config", "general"), { ivaGlobal: isNaN(valor) ? null : valor }, { merge: true });
      mostrarToast("IVA general guardado");
    } catch (err) {
      console.error(err);
      mostrarToast("Error al guardar", true);
    }
  });

  btnGuardarBranding.addEventListener("click", async () => {
    const logoFile = inputLogo.files[0];
    const fondoFile = inputFondo.files[0];
    if (!logoFile && !fondoFile) { mostrarToast("Elegí un archivo para subir", true); return; }

    btnGuardarBranding.disabled = true;
    try {
      const datos = {};
      if (logoFile) datos.logoUrl = await subirACloudinary(logoFile);
      if (fondoFile) {
        datos.backgroundUrl = await subirACloudinary(fondoFile);
        datos.backgroundType = fondoFile.type.startsWith("video") ? "video" : "image";
      }
      await setDoc(doc(db, "config", "branding"), datos, { merge: true });
      mostrarToast("Marca actualizada — se aplica en el próximo login");
      inputLogo.value = "";
      inputFondo.value = "";
    } catch (err) {
      console.error(err);
      mostrarToast("Error al subir el archivo", true);
    } finally {
      btnGuardarBranding.disabled = false;
    }
  });
}
