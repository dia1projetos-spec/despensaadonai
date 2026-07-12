import { db, doc, addDoc, updateDoc, collection, increment, onSnapshot } from "./firebase-config.js?v=11";
import { store, onProductosChange, onClientesChange, precioFinalProducto } from "./store.js?v=11";
import { formatoDinero, mostrarToast, escapeHtml } from "./utils.js?v=11";
import { registrarEventoStock } from "./notificaciones.js?v=11";

let carrito = []; // { productoId, nombre, precioUnit, cantidad, stockDisponible }
let formaPago = "efectivo";
let clienteSeleccionado = null;
let ivaGlobalPercent = null;

export function initCaja() {
  const inputBuscar = document.getElementById("caja-buscar-producto");
  const resultados = document.getElementById("caja-resultados");
  const selectCliente = document.getElementById("caja-cliente");
  const carritoBody = document.getElementById("carrito-body");
  const pagoOptions = document.getElementById("pago-options");
  const montoRecibido = document.getElementById("caja-monto-recibido");
  const btnFinalizar = document.getElementById("btn-finalizar-venta");
  const avisoFamiliar = document.getElementById("caja-familiar-aviso");
  const camposEfectivo = document.getElementById("pago-efectivo-campos");

  onProductosChange(() => {}); // productos ya están en store

  // Escucha en vivo el +IVA general configurado en "Configuración".
  // Este IVA se cobra sobre el total de la compra (no reemplaza el +IVA
  // que ya tenga cada producto individualmente — se suman los dos).
  onSnapshot(doc(db, "config", "general"), (snap) => {
    ivaGlobalPercent = snap.exists() ? snap.data().ivaGlobal : null;
    const label = document.getElementById("label-iva-general");
    if (ivaGlobalPercent != null && ivaGlobalPercent !== "") {
      label.textContent = `+IVA general (${ivaGlobalPercent}%)`;
    } else {
      label.textContent = "+IVA general";
    }
    renderResumen();
  });

  onClientesChange((clientes) => {
    selectCliente.innerHTML = `<option value="">Sin identificar</option>` +
      clientes.map((c) => `<option value="${c.id}" data-tipo="${c.tipo}">${escapeHtml(c.nombre)}${c.tipo === "familiar" ? " (familiar)" : ""}</option>`).join("");
  });

  function renderResultados(lista) {
    if (!lista.length) {
      resultados.innerHTML = `<div class="caja-search-item">Sin resultados</div>`;
    } else {
      resultados.innerHTML = lista.map((p) => `
        <div class="caja-search-item" data-add="${p.id}">
          <span style="display:flex; align-items:center; gap:8px;">
            ${p.fotoUrl ? `<img src="${p.fotoUrl}" class="prod-thumb" style="width:28px;height:28px;" />` : `<span class="prod-thumb" style="width:28px;height:28px;display:inline-block;"></span>`}
            ${escapeHtml(p.nombre)} ${p.stock <= 2 ? "⚠️" : ""}
          </span>
          <span class="mono">${formatoDinero(precioFinalProducto(p))} · stock ${p.stock}</span>
        </div>`).join("");
    }
    resultados.style.display = "block";
  }

  function mostrarListaCompleta() {
    if (!store.productos.length) {
      resultados.innerHTML = `<div class="caja-search-item">Todavía no hay productos cargados. Cargalos en la sección "Productos".</div>`;
      resultados.style.display = "block";
      return;
    }
    const texto = inputBuscar.value.trim().toLowerCase();
    const lista = texto
      ? store.productos.filter((p) => p.nombre.toLowerCase().includes(texto)).slice(0, 8)
      : store.productos.slice(0, 20);
    renderResultados(lista);
  }

  inputBuscar.addEventListener("focus", mostrarListaCompleta);
  inputBuscar.addEventListener("click", mostrarListaCompleta);
  inputBuscar.addEventListener("input", mostrarListaCompleta);

  resultados.addEventListener("click", (e) => {
    const item = e.target.closest("[data-add]");
    if (!item) return;
    agregarAlCarrito(item.dataset.add);
    inputBuscar.value = "";
    resultados.style.display = "none";
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#caja-buscar-producto") && !e.target.closest("#caja-resultados")) {
      resultados.style.display = "none";
    }
  });

  selectCliente.addEventListener("change", () => {
    const opt = selectCliente.options[selectCliente.selectedIndex];
    clienteSeleccionado = selectCliente.value ? { id: selectCliente.value, nombre: opt.textContent, tipo: opt.dataset.tipo } : null;
    avisoFamiliar.style.display = clienteSeleccionado?.tipo === "familiar" ? "block" : "none";
    renderResumen();
  });

  pagoOptions.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    formaPago = btn.dataset.pago;
    [...pagoOptions.children].forEach((b) => b.classList.toggle("is-active", b === btn));
    camposEfectivo.style.display = formaPago === "efectivo" ? "block" : "none";
    renderResumen();
  });

  montoRecibido.addEventListener("input", renderResumen);

  carritoBody.addEventListener("click", (e) => {
    const delBtn = e.target.closest("[data-quitar]");
    if (delBtn) {
      carrito = carrito.filter((i) => i.productoId !== delBtn.dataset.quitar);
      renderCarrito();
    }
  });

  carritoBody.addEventListener("change", (e) => {
    if (e.target.classList.contains("cart-item__qty")) {
      const item = carrito.find((i) => i.productoId === e.target.dataset.id);
      let qty = parseInt(e.target.value) || 1;
      if (qty > item.stockDisponible) {
        qty = item.stockDisponible;
        mostrarToast("No hay más stock disponible de ese producto", true);
      }
      if (qty < 1) qty = 1;
      item.cantidad = qty;
      renderCarrito();
    }
  });

  btnFinalizar.addEventListener("click", finalizarVenta);

  function agregarAlCarrito(productoId) {
    const p = store.productos.find((x) => x.id === productoId);
    if (!p) return;
    if (p.stock <= 0) { mostrarToast("Ese producto no tiene stock", true); return; }
    const existente = carrito.find((i) => i.productoId === productoId);
    if (existente) {
      if (existente.cantidad < p.stock) existente.cantidad++;
      else mostrarToast("No hay más stock disponible", true);
    } else {
      carrito.push({ productoId, nombre: p.nombre, fotoUrl: p.fotoUrl || null, precioUnit: precioFinalProducto(p), cantidad: 1, stockDisponible: p.stock });
    }
    renderCarrito();
  }

  function renderCarrito() {
    if (!carrito.length) {
      carritoBody.innerHTML = `<tr><td colspan="5" class="empty-state">Todavía no agregaste productos</td></tr>`;
    } else {
      carritoBody.innerHTML = carrito.map((i) => `
        <tr>
          <td data-label="Producto" style="display:flex; align-items:center; gap:8px;">
            ${i.fotoUrl ? `<img src="${i.fotoUrl}" class="prod-thumb" style="width:28px;height:28px;" />` : ""}
            ${escapeHtml(i.nombre)}
          </td>
          <td data-label="Precio" class="mono">${formatoDinero(i.precioUnit)}</td>
          <td data-label="Cantidad"><input type="number" class="cart-item__qty" data-id="${i.productoId}" value="${i.cantidad}" min="1" max="${i.stockDisponible}" /></td>
          <td data-label="Subtotal" class="mono">${formatoDinero(i.precioUnit * i.cantidad)}</td>
          <td data-label=""><button class="btn btn-danger btn-sm" data-quitar="${i.productoId}">✕</button></td>
        </tr>`).join("");
    }
    renderResumen();
  }

  function calcularTotales() {
    const subtotal = carrito.reduce((acc, i) => acc + i.precioUnit * i.cantidad, 0);
    const ivaGlobalMonto = ivaGlobalPercent ? subtotal * (Number(ivaGlobalPercent) / 100) : 0;
    const total = subtotal + ivaGlobalMonto;
    return { subtotal, ivaGlobalMonto, total };
  }

  function renderResumen() {
    const { subtotal, ivaGlobalMonto, total } = calcularTotales();
    const esFamiliar = clienteSeleccionado?.tipo === "familiar";
    document.getElementById("resumen-subtotal").textContent = formatoDinero(subtotal);
    document.getElementById("resumen-iva").textContent = formatoDinero(ivaGlobalMonto);
    document.getElementById("resumen-total").textContent = esFamiliar ? "$0.00 (familiar)" : formatoDinero(total);

    if (formaPago === "efectivo" && !esFamiliar) {
      const recibido = parseFloat(montoRecibido.value) || 0;
      const vuelto = recibido - total;
      document.getElementById("resumen-vuelto").textContent = formatoDinero(vuelto > 0 ? vuelto : 0);
    } else {
      document.getElementById("resumen-vuelto").textContent = formatoDinero(0);
    }
  }

  async function finalizarVenta() {
    if (!carrito.length) { mostrarToast("Agregá al menos un producto", true); return; }
    const { subtotal, ivaGlobalMonto, total } = calcularTotales();
    const esFamiliar = clienteSeleccionado?.tipo === "familiar";

    btnFinalizar.disabled = true;
    try {
      const venta = {
        clienteId: clienteSeleccionado?.id || null,
        clienteNombre: clienteSeleccionado?.nombre || "Sin identificar",
        esFamiliar,
        items: carrito.map((i) => ({ productoId: i.productoId, nombre: i.nombre, precio: i.precioUnit, cantidad: i.cantidad })),
        subtotal,
        ivaGlobalPercent: ivaGlobalPercent || null,
        ivaGlobalMonto,
        total: esFamiliar ? 0 : total,
        valorReal: total, // valor de mercadería aunque sea familiar (para el resumen)
        formaPago: esFamiliar ? "familiar" : formaPago,
        pagado: esFamiliar ? true : formaPago !== "fiado",
        createdAt: new Date(),
      };

      await addDoc(collection(db, "ventas"), venta);

      // Actualizar stock y disparar notificación si corresponde
      for (const item of carrito) {
        const producto = store.productos.find((p) => p.id === item.productoId);
        const nuevoStock = Math.max(0, (producto?.stock ?? 0) - item.cantidad);
        await updateDoc(doc(db, "productos", item.productoId), { stock: increment(-item.cantidad), vendidos: increment(item.cantidad) });
        if (nuevoStock <= 2) await registrarEventoStock(item.productoId, item.nombre, nuevoStock);
      }

      mostrarToast("Venta registrada ✔");
      carrito = [];
      clienteSeleccionado = null;
      selectCliente.value = "";
      avisoFamiliar.style.display = "none";
      montoRecibido.value = "";
      renderCarrito();
    } catch (err) {
      console.error(err);
      mostrarToast("Error al registrar la venta", true);
    } finally {
      btnFinalizar.disabled = false;
    }
  }

  renderCarrito();
}
