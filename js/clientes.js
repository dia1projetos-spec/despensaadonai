import { db, doc, addDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from "./firebase-config.js?v=2";
import { store, onClientesChange } from "./store.js?v=2";
import { formatoDinero, formatoFecha, mostrarToast, abrirModal, cerrarModal, escapeHtml } from "./utils.js?v=2";

let filtroTexto = "";

export function initClientes() {
  const body = document.getElementById("clientes-body");
  const buscar = document.getElementById("buscar-cliente-lista");
  const btnNuevo = document.getElementById("btn-nuevo-cliente");
  const btnGuardar = document.getElementById("btn-guardar-cliente");

  onClientesChange(render);

  buscar.addEventListener("input", () => {
    filtroTexto = buscar.value.trim().toLowerCase();
    render(store.clientes);
  });

  btnNuevo.addEventListener("click", () => abrirFormulario());
  btnGuardar.addEventListener("click", guardarCliente);

  body.addEventListener("click", async (e) => {
    const editBtn = e.target.closest("[data-edit]");
    const delBtn = e.target.closest("[data-del]");
    const histBtn = e.target.closest("[data-hist]");
    if (editBtn) abrirFormulario(editBtn.dataset.edit);
    if (histBtn) abrirHistorial(histBtn.dataset.hist, histBtn.dataset.nombre);
    if (delBtn) {
      if (confirm("¿Eliminar este cliente? El historial de compras asociado no se borra.")) {
        await deleteDoc(doc(db, "clientes", delBtn.dataset.del));
        mostrarToast("Cliente eliminado");
      }
    }
  });

  function render(clientes) {
    let lista = clientes;
    if (filtroTexto) lista = lista.filter((c) => c.nombre.toLowerCase().includes(filtroTexto));

    if (!lista.length) {
      body.innerHTML = `<tr><td colspan="4" class="empty-state">No se encontraron clientes</td></tr>`;
      return;
    }

    body.innerHTML = lista.map((c) => `
      <tr>
        <td>${escapeHtml(c.nombre)}</td>
        <td><span class="pill pill--${c.tipo}">${c.tipo === "familiar" ? "Familiar" : "Común"}</span></td>
        <td>${escapeHtml(c.telefono || "—")}</td>
        <td>
          <button class="btn btn-ghost btn-sm" data-hist="${c.id}" data-nombre="${escapeHtml(c.nombre)}">Historial</button>
          <button class="btn btn-ghost btn-sm" data-edit="${c.id}">Editar</button>
          <button class="btn btn-danger btn-sm" data-del="${c.id}">Eliminar</button>
        </td>
      </tr>
    `).join("");
  }

  function abrirFormulario(id) {
    const titulo = document.getElementById("modal-cliente-titulo");
    if (id) {
      const c = store.clientes.find((x) => x.id === id);
      titulo.textContent = "Editar cliente";
      document.getElementById("cliente-id").value = id;
      document.getElementById("cliente-nombre").value = c.nombre;
      document.getElementById("cliente-telefono").value = c.telefono || "";
      document.getElementById("cliente-tipo").value = c.tipo;
    } else {
      titulo.textContent = "Nuevo cliente";
      document.getElementById("cliente-id").value = "";
      document.getElementById("cliente-nombre").value = "";
      document.getElementById("cliente-telefono").value = "";
      document.getElementById("cliente-tipo").value = "comun";
    }
    abrirModal("modal-cliente");
  }

  async function guardarCliente() {
    const id = document.getElementById("cliente-id").value;
    const nombre = document.getElementById("cliente-nombre").value.trim();
    const telefono = document.getElementById("cliente-telefono").value.trim();
    const tipo = document.getElementById("cliente-tipo").value;

    if (!nombre) { mostrarToast("Ponele un nombre al cliente", true); return; }

    const datos = { nombre, telefono, tipo };
    try {
      if (id) {
        await updateDoc(doc(db, "clientes", id), datos);
        mostrarToast("Cliente actualizado");
      } else {
        await addDoc(collection(db, "clientes"), { ...datos, createdAt: new Date() });
        mostrarToast("Cliente creado");
      }
      cerrarModal("modal-cliente");
    } catch (err) {
      console.error(err);
      mostrarToast("Error al guardar el cliente", true);
    }
  }

  async function abrirHistorial(clienteId, nombre) {
    document.getElementById("modal-historial-titulo").textContent = `Historial de ${nombre}`;
    const body = document.getElementById("historial-cliente-body");
    body.innerHTML = `<tr><td colspan="4" class="empty-state">Cargando...</td></tr>`;
    abrirModal("modal-historial");

    const q = query(collection(db, "ventas"), where("clienteId", "==", clienteId));
    const snap = await getDocs(q);
    if (snap.empty) {
      body.innerHTML = `<tr><td colspan="4" class="empty-state">Sin compras registradas</td></tr>`;
      return;
    }
    const docsOrdenados = [...snap.docs].sort((a, b) => (b.data().createdAt?.toMillis?.() ?? 0) - (a.data().createdAt?.toMillis?.() ?? 0));
    body.innerHTML = docsOrdenados.map((d) => {
      const v = d.data();
      const items = v.items.map((i) => `${i.cantidad}x ${i.nombre}`).join(", ");
      return `<tr>
        <td>${formatoFecha(v.createdAt)}</td>
        <td>${escapeHtml(items)}</td>
        <td class="mono">${formatoDinero(v.total)}</td>
        <td><span class="pill pill--${v.formaPago}">${v.formaPago}</span></td>
      </tr>`;
    }).join("");
  }
}
