export function formatoDinero(valor) {
  const n = Number(valor) || 0;
  return "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatoFecha(timestamp) {
  if (!timestamp) return "-";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " " + date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

let toastTimeout;
export function mostrarToast(mensaje, esError = false) {
  const toast = document.getElementById("toast");
  toast.textContent = mensaje;
  toast.classList.toggle("is-danger", esError);
  toast.classList.add("is-visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("is-visible"), 3200);
}

export function abrirModal(id) {
  document.getElementById(id).classList.add("is-visible");
}

export function cerrarModal(id) {
  document.getElementById(id).classList.remove("is-visible");
}

// Cierra cualquier modal al hacer click en el overlay o en botones [data-close-modal]
export function inicializarModales() {
  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.classList.remove("is-visible");
    });
  });
  document.querySelectorAll("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", () => {
      btn.closest(".modal-overlay").classList.remove("is-visible");
    });
  });
}

export function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
