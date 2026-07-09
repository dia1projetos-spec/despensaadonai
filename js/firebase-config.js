// ============================================================
// KIOSKO D. DIEGO — Configuração central do Firebase
// Este arquivo é importado por todas as páginas do sistema.
//
// OBS: expor este "firebaseConfig" no código do site é normal e
// seguro — ele não é uma senha, é só o identificador do projeto.
// Quem protege os dados de verdade são as REGRAS do Firestore
// (Firestore > Rules), que devem exigir usuário autenticado.
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCbF3XjxpV3LP_zObVWNPCzoJ87mKAGJKI",
  authDomain: "despensa-adonai.firebaseapp.com",
  projectId: "despensa-adonai",
  storageBucket: "despensa-adonai.firebasestorage.app",
  messagingSenderId: "570394294000",
  appId: "1:570394294000:web:aa0431bc8c89cd0cc1b435",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export {
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
};

// ------------------------------------------------------------
// Configuración de Cloudinary (solo datos públicos).
// La "API Secret" NUNCA debe ir acá ni en ningún archivo del
// navegador. Para subir imágenes desde el cliente se usa un
// "unsigned upload preset", que se crea así:
//   Cloudinary > Settings > Upload > Upload presets > Add preset
//   Signing mode: "Unsigned"  →  copiar el nombre del preset abajo.
// ------------------------------------------------------------
export const CLOUDINARY_CONFIG = {
  cloudName: "PON_ACA_TU_CLOUD_NAME", // visible en el dashboard de Cloudinary
  uploadPreset: "PON_ACA_TU_UPLOAD_PRESET_UNSIGNED",
};
