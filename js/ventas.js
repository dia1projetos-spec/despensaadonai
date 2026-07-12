import { db, collection, query, orderBy, onSnapshot, doc, deleteDoc } from "./firebase-config.js?v=14";
import { formatoDinero, formatoFecha, mostrarToast, escapeHtml } from "./utils.js?v=14";
import { abrirEditarVenta } from "./ventaEditor.js?v=14";

let todasLasVentas = [];
let filtroTexto = "";

export function initVentas() {
  const body = document.getElementById("ventas-body");
  const buscar = document.getElementById("buscar-venta-lista");

  const q = query(collection(db, "ventas"), orderBy("createdAt", "desc"));
  onSnapshot(
    q,
    (snap) => {
      todasLasVentas = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      render();
    },
    (err) => {
      console.error("Error cargando ventas:", err);
      mostrarToast("No se pudieron cargar las ventas: " + err.message, true);
    }
  );

  buscar.addEventListener("input", () => {
    filtroTexto = buscar.value.trim().toLowerCase();
    render();
  });

  body.addEventListener("click", (e) => {
    const editBtn = e.target.closest("[data-editar-venta]");
    const delBtn = e.target.closest("[data-eliminar-venta]");

    if (editBtn) {
      const venta = todasLasVentas.find((v) => v.id === editBtn.dataset.editarVenta);
      if (!venta) return;
      abrirEditarVenta(venta, (ventaId, cambios) => {
        const v = todasLasVentas.find((x) => x.id === ventaId);
        if (v) Object.assign(v, cambios);
        render();
      });
    }

    if (delBtn) {
      if (!confirm("¿Eliminar esta venta? Esta acción no se puede deshacer y no repone el stock automáticamente.")) return;
      deleteDoc(doc(db, "ventas", delBtn.dataset.eliminarVenta)).then(() => {
        mostrarToast("Venta eliminada");
      });
    }
  });

  function render() {
    let lista = todasLasVentas;
    if (filtroTexto) {
      lista = lista.filter((v) => (v.clienteNombre || "").toLowerCase().includes(filtroTexto));
    }

    if (!lista.length) {
      body.innerHTML = `<tr><td colspan="6" class="empty-state">No se encontraron ventas</td></tr>`;
      return;
    }

    body.innerHTML = lista.map((v) => {
      const items = (v.items || []).map((i) => `${i.cantidad}x ${i.nombre}`).join(", ");
      const cliente = v.clienteNombre && v.clienteNombre !== "Sin identificar"
        ? escapeHtml(v.clienteNombre)
        : `<span style="color: var(--color-ink-soft);">Sin identificar</span>`;
      return `
        <tr>
          <td data-label="Fecha">${formatoFecha(v.createdAt)}</td>
          <td data-label="Cliente">${cliente}</td>
          <td data-label="Items">${escapeHtml(items)}</td>
          <td data-label="Total" class="mono">${formatoDinero(v.total)}</td>
          <td data-label="Pago"><span class="pill pill--${v.formaPago}">${v.formaPago}</span></td>
          <td data-label="">
            <button class="btn btn-ghost btn-sm" data-editar-venta="${v.id}">Editar</button>
            <button class="btn btn-danger btn-sm" data-eliminar-venta="${v.id}">Eliminar</button>
          </td>
        </tr>`;
    }).join("");
  }
}
