import { db, doc, addDoc, updateDoc, collection, query, where, onSnapshot } from "./firebase-config.js?v=9";
import { formatoFecha, escapeHtml } from "./utils.js?v=9";

/**
 * Se llama cada vez que el stock de un producto cambia a 2, 1 o 0.
 * Crea una notificación NUEVA (no reutiliza una vieja), así que si el
 * producto se repone y vuelve a bajar al mismo nivel, se avisa de nuevo.
 */
export async function registrarEventoStock(productoId, nombre, nivel) {
  await addDoc(collection(db, "notificaciones"), {
    productoId,
    nombre,
    nivel,
    leida: false,
    createdAt: new Date(),
  });
}

export function initNotificaciones() {
  const panel = document.getElementById("notificaciones-panel");
  const badge = document.getElementById("notif-badge");

  // Solo filtramos por "leida" (un único campo, no necesita índice compuesto)
  // y ordenamos por fecha directamente acá en el navegador.
  const q = query(collection(db, "notificaciones"), where("leida", "==", false));
  onSnapshot(q, (snap) => {
    const notifs = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));

    badge.textContent = notifs.length;
    badge.classList.toggle("is-visible", notifs.length > 0);

    if (!notifs.length) {
      panel.innerHTML = `<div class="empty-state">No hay notificaciones nuevas</div>`;
      return;
    }

    panel.innerHTML = notifs.map((n) => {
      const texto = n.nivel === 0
        ? `<b>${escapeHtml(n.nombre)}</b> se quedó sin stock`
        : `<b>${escapeHtml(n.nombre)}</b> tiene solo ${n.nivel} unidad${n.nivel > 1 ? "es" : ""} en stock`;
      return `
        <div class="notif-item">
          <div class="notif-item__icon">${n.nivel}</div>
          <div class="notif-item__text">${texto}<div class="notif-item__time">${formatoFecha(n.createdAt)}</div></div>
          <button class="btn btn-ghost btn-sm" data-leer="${n.id}">Marcar leída</button>
        </div>`;
    }).join("");
  }, (err) => {
    console.error("Error cargando notificaciones:", err);
    panel.innerHTML = `<div class="empty-state">Error al cargar notificaciones: ${err.message}</div>`;
  });

  panel.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-leer]");
    if (!btn) return;
    await updateDoc(doc(db, "notificaciones", btn.dataset.leer), { leida: true });
  });
}
