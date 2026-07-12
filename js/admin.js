import { auth, db, onAuthStateChanged, signOut, collection, query, where, getDocs, deleteDoc, Timestamp } from "./firebase-config.js?v=12";
import { iniciarStore } from "./store.js?v=12";
import { inicializarModales } from "./utils.js?v=12";
import { initProductos } from "./productos.js?v=12";
import { initClientes } from "./clientes.js?v=12";
import { initCaja } from "./caja.js?v=12";
import { initResumen } from "./resumen.js?v=12";
import { initRankings } from "./rankings.js?v=12";
import { initNotificaciones } from "./notificaciones.js?v=12";
import { initConfig } from "./config.js?v=12";

// ---------- Guarda de sesión ----------
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace("index.html");
    return;
  }
  iniciarApp();
});

let appIniciada = false;
function iniciarApp() {
  if (appIniciada) return;
  appIniciada = true;

  iniciarStore();
  inicializarModales();
  initProductos();
  initClientes();
  initCaja();
  initResumen();
  initRankings();
  initNotificaciones();
  initConfig();
  limpiarVentasViejas();
}

// ---------- Menú hambúrguer (mobile) ----------
const sidebar = document.querySelector(".sidebar");
const overlay = document.getElementById("sidebar-overlay");
const btnMenuToggle = document.getElementById("btn-menu-toggle");

function abrirMenu() {
  sidebar.classList.add("is-open");
  overlay.classList.add("is-visible");
}
function cerrarMenu() {
  sidebar.classList.remove("is-open");
  overlay.classList.remove("is-visible");
}

btnMenuToggle.addEventListener("click", abrirMenu);
overlay.addEventListener("click", cerrarMenu);

// ---------- Navegación entre secciones ----------
document.querySelectorAll(".nav-item[data-view]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-item[data-view]").forEach((b) => b.classList.remove("is-active"));
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("is-active"));
    btn.classList.add("is-active");
    document.querySelector(`.view[data-view="${btn.dataset.view}"]`).classList.add("is-active");
    cerrarMenu(); // en mobile, elegir una sección cierra el menú automáticamente
  });
});

// ---------- Logout ----------
document.getElementById("btn-logout").addEventListener("click", async () => {
  await signOut(auth);
  window.location.replace("index.html");
});

// ---------- Limpieza de historial (más de 6 meses) ----------
// NOTA: esto corre "a mejor esfuerzo" cada vez que alguien abre el panel.
// Para que corra siempre (aunque nadie abra el sistema), lo ideal a futuro
// es mover esta lógica a una Cloud Function con Cloud Scheduler.
async function limpiarVentasViejas() {
  try {
    const seisMesesAtras = new Date();
    seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);
    const q = query(collection(db, "ventas"), where("createdAt", "<", Timestamp.fromDate(seisMesesAtras)));
    const snap = await getDocs(q);
    const borrados = [];
    snap.forEach((d) => borrados.push(deleteDoc(d.ref)));
    if (borrados.length) await Promise.all(borrados);
  } catch (err) {
    console.warn("No se pudo limpiar el historial viejo:", err);
  }
}
