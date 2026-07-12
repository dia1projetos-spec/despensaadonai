import { db, doc, updateDoc } from "./firebase-config.js?v=14";
import { mostrarToast, abrirModal, cerrarModal } from "./utils.js?v=14";

let onSavedCallback = null;
let inicializado = false;

/**
 * Se llama UNA sola vez (desde admin.js) para registrar el listener del
 * botón "Guardar" del modal de editar venta. Evita que dos módulos distintos
 * (clientes.js y ventas.js) registren el mismo listener dos veces.
 */
export function initVentaEditor() {
  if (inicializado) return;
  inicializado = true;

  document.getElementById("btn-guardar-venta-editada").addEventListener("click", async () => {
    const ventaId = document.getElementById("editar-venta-id").value;
    const total = parseFloat(document.getElementById("editar-venta-total").value);
    const formaPago = document.getElementById("editar-venta-forma").value;

    if (isNaN(total) || total < 0) { mostrarToast("Ingresá un total válido", true); return; }

    try {
      await updateDoc(doc(db, "ventas", ventaId), { total, formaPago });
      mostrarToast("Compra actualizada");
      cerrarModal("modal-editar-venta");
      if (onSavedCallback) onSavedCallback(ventaId, { total, formaPago });
    } catch (err) {
      console.error(err);
      mostrarToast("Error al actualizar la compra", true);
    }
  });
}

/**
 * Abre el modal de edición para una venta puntual.
 * @param {object} venta - la venta a editar (necesita id, total, formaPago)
 * @param {function} callback - se llama con (ventaId, cambios) después de guardar, para que el módulo que llamó pueda actualizar su propia lista en memoria.
 */
export function abrirEditarVenta(venta, callback) {
  onSavedCallback = callback || null;
  document.getElementById("editar-venta-id").value = venta.id;
  document.getElementById("editar-venta-total").value = venta.total;
  document.getElementById("editar-venta-forma").value = venta.formaPago;
  abrirModal("modal-editar-venta");
}
