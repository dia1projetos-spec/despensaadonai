import { CLOUDINARY_CONFIG } from "./firebase-config.js?v=13";

/**
 * Sube un archivo (imagen o video) a Cloudinary usando el upload preset
 * "unsigned" configurado en firebase-config.js. Devuelve la URL pública.
 */
export async function subirACloudinary(file) {
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/auto/upload`;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_CONFIG.uploadPreset);

  const res = await fetch(url, { method: "POST", body: formData });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error("Error subiendo a Cloudinary: " + errText);
  }
  const data = await res.json();
  return data.secure_url;
}
