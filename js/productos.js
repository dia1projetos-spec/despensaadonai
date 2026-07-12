import { db, doc, addDoc, updateDoc, deleteDoc, collection } from "./firebase-config.js?v=10";
import { subirACloudinary } from "./cloudinary.js?v=10";
import { store, onProductosChange, precioFinalProducto } from "./store.js?v=10";
import { formatoDinero, mostrarToast, abrirModal, cerrarModal, escapeHtml } from "./utils.js?v=10";

let fotoTemp = null;
let filtroTexto = "";

export function initProductos() {
  const body = document.getElementById("productos-body");
  const buscar = document.getElementById("buscar-producto-lista");
  const btnNuevo = document.getElementById("btn-nuevo-producto");
  const fotoInput = document.getElementById("producto-foto");
  const btnGuardar = document.getElementById("btn-guardar-producto");

  onProductosChange(render);

  buscar.addEventListener("input", () => {
    filtroTexto = buscar.value.trim().toLowerCase();
    render(store.productos);
  });

  btnNuevo.addEventListener("click", () => abrirFormulario());

  fotoInput.addEventListener("change", async () => {
    const file = fotoInput.files[0];
    if (!file) return;
    fotoTemp = file;
    const preview = document.getElementById("producto-foto-preview");
    preview.src = URL.createObjectURL(file);
    preview.style.display = "block";
  });

  btnGuardar.addEventListener("click", guardarProducto);

  body.addEventListener("click", async (e) => {
    const editBtn = e.target.closest("[data-edit]");
    const delBtn = e.target.closest("[data-del]");
    if (editBtn) abrirFormulario(editBtn.dataset.edit);
    if (delBtn) {
      if (confirm("¿Eliminar este producto? Esta acción no se puede deshacer.")) {
        await deleteDoc(doc(db, "productos", delBtn.dataset.del));
        mostrarToast("Producto eliminado");
      }
    }
  });

  function render(productos) {
    let lista = productos;
    if (filtroTexto) lista = lista.filter((p) => p.nombre.toLowerCase().includes(filtroTexto));

    if (!lista.length) {
      body.innerHTML = `<tr><td colspan="7" class="empty-state">No se encontraron productos</td></tr>`;
      return;
    }

    body.innerHTML = lista.map((p) => `
      <tr>
        <td data-label="Foto">${p.fotoUrl ? `<img src="${p.fotoUrl}" class="prod-thumb" />` : `<div class="prod-thumb"></div>`}</td>
        <td data-label="Producto">${escapeHtml(p.nombre)}</td>
        <td data-label="Precio base" class="mono">${formatoDinero(p.precio)}</td>
        <td data-label="+IVA">${p.ivaPercent != null && p.ivaPercent !== "" ? p.ivaPercent + "%" : "—"}</td>
        <td data-label="Precio final" class="mono">${formatoDinero(precioFinalProducto(p))}</td>
        <td data-label="Stock">${p.stock <= 2 ? `<span class="pill pill--stock-low">${p.stock}</span>` : p.stock}</td>
        <td data-label="Acciones">
          <button class="btn btn-ghost btn-sm" data-edit="${p.id}">Editar</button>
          <button class="btn btn-danger btn-sm" data-del="${p.id}">Eliminar</button>
        </td>
      </tr>
    `).join("");
  }

  function abrirFormulario(id) {
    fotoTemp = null;
    const titulo = document.getElementById("modal-producto-titulo");
    const preview = document.getElementById("producto-foto-preview");
    document.getElementById("producto-foto").value = "";
    preview.style.display = "none";

    if (id) {
      const p = store.productos.find((x) => x.id === id);
      titulo.textContent = "Editar producto";
      document.getElementById("producto-id").value = id;
      document.getElementById("producto-nombre").value = p.nombre;
      document.getElementById("producto-precio").value = p.precio;
      document.getElementById("producto-stock").value = p.stock;
      document.getElementById("producto-iva").value = p.ivaPercent ?? "";
      if (p.fotoUrl) { preview.src = p.fotoUrl; preview.style.display = "block"; }
    } else {
      titulo.textContent = "Nuevo producto";
      document.getElementById("producto-id").value = "";
      document.getElementById("producto-nombre").value = "";
      document.getElementById("producto-precio").value = "";
      document.getElementById("producto-stock").value = "";
      document.getElementById("producto-iva").value = "";
    }
    abrirModal("modal-producto");
  }

  async function guardarProducto() {
    const id = document.getElementById("producto-id").value;
    const nombre = document.getElementById("producto-nombre").value.trim();
    const precio = parseFloat(document.getElementById("producto-precio").value) || 0;
    const stock = parseInt(document.getElementById("producto-stock").value) || 0;
    const ivaRaw = document.getElementById("producto-iva").value;
    const ivaPercent = ivaRaw === "" ? null : parseFloat(ivaRaw);

    if (!nombre) { mostrarToast("Ponele un nombre al producto", true); return; }

    btnGuardar.disabled = true;
    try {
      let fotoUrl = null;
      if (id) fotoUrl = store.productos.find((x) => x.id === id)?.fotoUrl || null;
      if (fotoTemp) fotoUrl = await subirACloudinary(fotoTemp);

      const datos = { nombre, precio, stock, ivaPercent, fotoUrl };

      if (id) {
        await updateDoc(doc(db, "productos", id), datos);
        mostrarToast("Producto actualizado");
      } else {
        await addDoc(collection(db, "productos"), { ...datos, createdAt: new Date() });
        mostrarToast("Producto creado");
      }
      cerrarModal("modal-producto");
    } catch (err) {
      console.error(err);
      mostrarToast("Error al guardar: revisá la configuración de Cloudinary", true);
    } finally {
      btnGuardar.disabled = false;
    }
  }
}
