import { db, collection, query, where, orderBy, getDocs, onSnapshot, doc, getDoc, setDoc, updateDoc, deleteDoc, deleteField, addDoc, increment, Timestamp } from "./firebase-config.js?v=13";
import { formatoDinero, formatoFecha, mostrarToast, abrirModal, cerrarModal, escapeHtml } from "./utils.js?v=13";

function inicioDeMes() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

let ventasDelMes = [];
let retirosDelMes = [];
let ajusteManual = null;
let fiadosAbiertos = [];
let pagosFiadoDelMes = [];

function claveDelMes() {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

export function initResumen() {
  const btnCerrar = document.getElementById("btn-cerrar-mes");
  const fiadoBody = document.getElementById("fiado-body");
  const retirosBody = document.getElementById("retiros-body");
  const mesActualEl = document.getElementById("resumen-mes-actual");
  const btnNuevoRetiro = document.getElementById("btn-nuevo-retiro");
  const btnGuardarRetiro = document.getElementById("btn-guardar-retiro");

  mesActualEl.textContent = new Date().toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  cargarHistorialesMensuales();

  // Escucha en vivo: cualquier venta nueva del mes actualiza el resumen al instante.
  const qMes = query(collection(db, "ventas"), where("createdAt", ">=", Timestamp.fromDate(inicioDeMes())));
  onSnapshot(
    qMes,
    (snap) => {
      ventasDelMes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderResumen();
    },
    (err) => {
      console.error("Error cargando resumen:", err);
      mostrarToast("No se pudo cargar el resumen: " + err.message, true);
    }
  );

  // Escucha en vivo de retiros del mes.
  const qRetiros = query(collection(db, "retiros"), where("createdAt", ">=", Timestamp.fromDate(inicioDeMes())));
  onSnapshot(
    qRetiros,
    (snap) => {
      retirosDelMes = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
      renderResumen();
    },
    (err) => {
      console.error("Error cargando retiros:", err);
      mostrarToast("No se pudieron cargar los retiros: " + err.message, true);
    }
  );

  // Edición directa del "Total en caja" (sobrescribe el cálculo automático hasta que se restablezca).
  const refAjuste = doc(db, "ajustesCaja", claveDelMes());
  onSnapshot(refAjuste, (snap) => {
    ajusteManual = snap.exists() ? snap.data() : null;
    renderResumen();
  }, (err) => {
    console.error("Error cargando el total de caja editado:", err);
  });

  // Fiados abiertos: TODOS los que tengan saldo pendiente, sin importar el mes en que se vendieron.
  const qFiadosAbiertos = query(collection(db, "ventas"), where("formaPago", "==", "fiado"));
  onSnapshot(qFiadosAbiertos, (snap) => {
    fiadosAbiertos = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((v) => (v.total || 0) - (v.montoPagado || 0) > 0.009)
      .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
    renderResumen();
  }, (err) => {
    console.error("Error cargando fiados abiertos:", err);
    mostrarToast("No se pudieron cargar los fiados: " + err.message, true);
  });

  // Pagos de fiado liquidados ESTE MES (para sumar al caja y discriminar efectivo/transferencia).
  const qPagosFiado = query(collection(db, "pagosFiado"), where("createdAt", ">=", Timestamp.fromDate(inicioDeMes())));
  onSnapshot(qPagosFiado, (snap) => {
    pagosFiadoDelMes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderResumen();
  }, (err) => {
    console.error("Error cargando pagos de fiado:", err);
  });

  document.getElementById("fiado-body").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-pagar-fiado]");
    if (!btn) return;
    const venta = fiadosAbiertos.find((v) => v.id === btn.dataset.pagarFiado);
    if (!venta) return;
    const saldo = (venta.total || 0) - (venta.montoPagado || 0);
    document.getElementById("pago-fiado-venta-id").value = venta.id;
    document.getElementById("pago-fiado-info").textContent = `${venta.clienteNombre} — saldo pendiente: ${formatoDinero(saldo)}`;
    document.getElementById("pago-fiado-monto").value = "";
    document.getElementById("pago-fiado-monto").max = saldo;
    document.getElementById("pago-fiado-forma").value = "efectivo";
    abrirModal("modal-pago-fiado");
  });

  document.getElementById("btn-guardar-pago-fiado").addEventListener("click", async () => {
    const ventaId = document.getElementById("pago-fiado-venta-id").value;
    const monto = parseFloat(document.getElementById("pago-fiado-monto").value);
    const formaPago = document.getElementById("pago-fiado-forma").value;
    const venta = fiadosAbiertos.find((v) => v.id === ventaId);
    if (!venta) return;
    const saldo = (venta.total || 0) - (venta.montoPagado || 0);

    if (!monto || monto <= 0) { mostrarToast("Ingresá un monto válido", true); return; }
    if (monto > saldo + 0.01) { mostrarToast(`El monto no puede ser mayor al saldo pendiente (${formatoDinero(saldo)})`, true); return; }

    const btn = document.getElementById("btn-guardar-pago-fiado");
    btn.disabled = true;
    try {
      await addDoc(collection(db, "pagosFiado"), {
        ventaId,
        clienteId: venta.clienteId || null,
        clienteNombre: venta.clienteNombre,
        monto,
        formaPago,
        createdAt: new Date(),
      });
      await updateDoc(doc(db, "ventas", ventaId), {
        montoPagado: increment(monto),
        pagado: monto + (venta.montoPagado || 0) >= (venta.total || 0) - 0.01,
      });
      mostrarToast("Pago registrado");
      cerrarModal("modal-pago-fiado");
    } catch (err) {
      console.error(err);
      mostrarToast("Error al registrar el pago", true);
    } finally {
      btn.disabled = false;
    }
  });

  document.getElementById("btn-editar-caja").addEventListener("click", async () => {
    const actual = calcularTotales().totalCaja;
    const nuevoValor = prompt("Ingresá el nuevo valor de \"Total en caja\":", actual);
    if (nuevoValor === null) return; // canceló
    const monto = parseFloat(nuevoValor);
    if (isNaN(monto)) { mostrarToast("Ingresá un número válido", true); return; }
    // Guardamos la DIFERENCIA entre lo que pediste y lo calculado por las ventas,
    // así las ventas nuevas se siguen sumando por arriba de tu ajuste.
    const diferencia = monto - totalCajaCalculadoActual();
    try {
      await setDoc(refAjuste, { ajusteCaja: diferencia, updatedAt: new Date() }, { merge: true });
      mostrarToast("Total en caja actualizado");
    } catch (err) {
      console.error(err);
      mostrarToast("Error al guardar", true);
    }
  });

  document.getElementById("btn-borrar-caja").addEventListener("click", async () => {
    if (!confirm("¿Poner el total en caja en $0.00?")) return;
    try {
      await setDoc(refAjuste, { ajusteCaja: -totalCajaCalculadoActual(), updatedAt: new Date() }, { merge: true });
      mostrarToast("Total en caja puesto en $0.00");
    } catch (err) {
      console.error(err);
      mostrarToast("Error al restablecer", true);
    }
  });

  document.getElementById("btn-editar-familiar").addEventListener("click", async () => {
    const actual = calcularTotales().totalFamiliar;
    const nuevoValor = prompt("Ingresá el nuevo valor de \"Retiro familiar\":", actual);
    if (nuevoValor === null) return;
    const monto = parseFloat(nuevoValor);
    if (isNaN(monto)) { mostrarToast("Ingresá un número válido", true); return; }
    const diferencia = monto - totalFamiliarCalculadoActual();
    try {
      await setDoc(refAjuste, { ajusteFamiliar: diferencia, updatedAt: new Date() }, { merge: true });
      mostrarToast("Retiro familiar actualizado");
    } catch (err) {
      console.error(err);
      mostrarToast("Error al guardar", true);
    }
  });

  document.getElementById("btn-borrar-familiar").addEventListener("click", async () => {
    if (!confirm("¿Poner el retiro familiar en $0.00?")) return;
    try {
      await setDoc(refAjuste, { ajusteFamiliar: -totalFamiliarCalculadoActual(), updatedAt: new Date() }, { merge: true });
      mostrarToast("Retiro familiar puesto en $0.00");
    } catch (err) {
      console.error(err);
      mostrarToast("Error al restablecer", true);
    }
  });

  document.getElementById("btn-editar-efectivo").addEventListener("click", async () => {
    const actual = calcularTotales().totalEfectivo;
    const nuevoValor = prompt("Ingresá el nuevo valor de \"Total en efectivo\":", actual);
    if (nuevoValor === null) return;
    const monto = parseFloat(nuevoValor);
    if (isNaN(monto)) { mostrarToast("Ingresá un número válido", true); return; }
    const diferencia = monto - totalEfectivoCalculadoActual();
    try {
      await setDoc(refAjuste, { ajusteEfectivo: diferencia, updatedAt: new Date() }, { merge: true });
      mostrarToast("Total en efectivo actualizado");
    } catch (err) {
      console.error(err);
      mostrarToast("Error al guardar", true);
    }
  });

  document.getElementById("btn-borrar-efectivo").addEventListener("click", async () => {
    if (!confirm("¿Poner el total en efectivo en $0.00?")) return;
    try {
      await setDoc(refAjuste, { ajusteEfectivo: -totalEfectivoCalculadoActual(), updatedAt: new Date() }, { merge: true });
      mostrarToast("Total en efectivo puesto en $0.00");
    } catch (err) {
      console.error(err);
      mostrarToast("Error al restablecer", true);
    }
  });

  document.getElementById("btn-editar-transferencia").addEventListener("click", async () => {
    const actual = calcularTotales().totalTransferencia;
    const nuevoValor = prompt("Ingresá el nuevo valor de \"Total en transferencia\":", actual);
    if (nuevoValor === null) return;
    const monto = parseFloat(nuevoValor);
    if (isNaN(monto)) { mostrarToast("Ingresá un número válido", true); return; }
    const diferencia = monto - totalTransferenciaCalculadoActual();
    try {
      await setDoc(refAjuste, { ajusteTransferencia: diferencia, updatedAt: new Date() }, { merge: true });
      mostrarToast("Total en transferencia actualizado");
    } catch (err) {
      console.error(err);
      mostrarToast("Error al guardar", true);
    }
  });

  document.getElementById("btn-borrar-transferencia").addEventListener("click", async () => {
    if (!confirm("¿Poner el total en transferencia en $0.00?")) return;
    try {
      await setDoc(refAjuste, { ajusteTransferencia: -totalTransferenciaCalculadoActual(), updatedAt: new Date() }, { merge: true });
      mostrarToast("Total en transferencia puesto en $0.00");
    } catch (err) {
      console.error(err);
      mostrarToast("Error al restablecer", true);
    }
  });

  btnNuevoRetiro.addEventListener("click", () => {
    document.getElementById("retiro-nombre").value = "";
    document.getElementById("retiro-monto").value = "";
    document.getElementById("retiro-motivo").value = "";
    abrirModal("modal-retiro");
  });

  btnGuardarRetiro.addEventListener("click", async () => {
    const nombre = document.getElementById("retiro-nombre").value.trim();
    const monto = parseFloat(document.getElementById("retiro-monto").value);
    const motivo = document.getElementById("retiro-motivo").value.trim();

    if (!nombre) { mostrarToast("Decime quién está retirando", true); return; }
    if (!monto || monto <= 0) { mostrarToast("Ingresá un monto válido", true); return; }
    if (!motivo) { mostrarToast("Contame el motivo del retiro", true); return; }

    btnGuardarRetiro.disabled = true;
    try {
      await addDoc(collection(db, "retiros"), { nombre, monto, motivo, createdAt: new Date() });
      mostrarToast("Retiro registrado");
      cerrarModal("modal-retiro");
    } catch (err) {
      console.error(err);
      mostrarToast("Error al registrar el retiro", true);
    } finally {
      btnGuardarRetiro.disabled = false;
    }
  });

  btnCerrar.addEventListener("click", async () => {
    if (!confirm("¿Cerrar el mes actual? Se guarda una foto de los totales de hoy en el historial.")) return;
    const totales = calcularTotales();
    const clave = new Date().toISOString().slice(0, 7); // YYYY-MM
    try {
      await addDoc(collection(db, "resumenMensual"), {
        mes: clave,
        totalCaja: totales.totalCaja,
        totalRetiros: totales.totalRetiros,
        totalDisponible: totales.totalDisponible,
        totalFamiliar: totales.totalFamiliar,
        totalFiadoAbierto: totales.totalFiadoAbierto,
        cerradoAt: new Date(),
      });
      mostrarToast("Mes cerrado y guardado en el historial");
      cargarHistorialesMensuales();
    } catch (err) {
      console.error(err);
      mostrarToast("Error al cerrar el mes", true);
    }
  });

  retirosBody.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-del-retiro]");
    if (!btn) return;
    if (!confirm("¿Eliminar este retiro? Esta acción no se puede deshacer.")) return;
    await deleteDoc(doc(db, "retiros", btn.dataset.delRetiro));
    mostrarToast("Retiro eliminado");
  });

  document.getElementById("historial-mensual-body").addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-del-mes]");
    if (!btn) return;
    if (!confirm("¿Eliminar este historial mensual? Esta acción no se puede deshacer.")) return;
    await deleteDoc(doc(db, "resumenMensual", btn.dataset.delMes));
    mostrarToast("Historial eliminado");
    cargarHistorialesMensuales();
  });

  function totalCajaCalculadoActual() {
    let totalCajaCalculado = 0;
    // Ventas normales (efectivo/transferencia) del mes — el fiado NO entra acá directamente.
    ventasDelMes.forEach((v) => {
      if (v.esFamiliar) return;
      if (v.formaPago === "fiado") return; // el fiado solo suma cuando se liquida (ver abajo)
      totalCajaCalculado += v.total || 0;
    });
    // Pagos de fiado liquidados este mes (en efectivo o transferencia) SÍ suman al caja.
    pagosFiadoDelMes.forEach((p) => { totalCajaCalculado += p.monto || 0; });
    return totalCajaCalculado;
  }

  function totalFamiliarCalculadoActual() {
    let totalFamiliar = 0;
    ventasDelMes.forEach((v) => { if (v.esFamiliar) totalFamiliar += v.valorReal || v.total || 0; });
    return totalFamiliar;
  }

  function totalEfectivoCalculadoActual() {
    let total = 0;
    ventasDelMes.forEach((v) => { if (!v.esFamiliar && v.formaPago === "efectivo") total += v.total || 0; });
    pagosFiadoDelMes.forEach((p) => { if (p.formaPago === "efectivo") total += p.monto || 0; });
    return total;
  }

  function totalTransferenciaCalculadoActual() {
    let total = 0;
    ventasDelMes.forEach((v) => { if (!v.esFamiliar && v.formaPago === "transferencia") total += v.total || 0; });
    pagosFiadoDelMes.forEach((p) => { if (p.formaPago === "transferencia") total += p.monto || 0; });
    return total;
  }

  function calcularTotales() {
    const totalFiadoAbierto = fiadosAbiertos.reduce((acc, v) => acc + ((v.total || 0) - (v.montoPagado || 0)), 0);

    const ajusteCaja = ajusteManual?.ajusteCaja || 0;
    const ajusteFamiliar = ajusteManual?.ajusteFamiliar || 0;
    const ajusteEfectivo = ajusteManual?.ajusteEfectivo || 0;
    const ajusteTransferencia = ajusteManual?.ajusteTransferencia || 0;

    const totalCaja = totalCajaCalculadoActual() + ajusteCaja;
    const totalFamiliar = totalFamiliarCalculadoActual() + ajusteFamiliar;
    const totalEfectivo = totalEfectivoCalculadoActual() + ajusteEfectivo;
    const totalTransferencia = totalTransferenciaCalculadoActual() + ajusteTransferencia;
    const totalRetiros = retirosDelMes.reduce((acc, r) => acc + (r.monto || 0), 0);
    const totalDisponible = totalCaja - totalRetiros;

    return { totalCaja, totalFamiliar, totalFiadoAbierto, totalRetiros, totalDisponible, totalEfectivo, totalTransferencia };
  }

  function renderResumen() {
    const { totalCaja, totalFamiliar, totalFiadoAbierto, totalRetiros, totalDisponible, totalEfectivo, totalTransferencia } = calcularTotales();
    document.getElementById("stat-caja").textContent = formatoDinero(totalCaja);
    document.getElementById("stat-retiros").textContent = formatoDinero(totalRetiros);
    document.getElementById("stat-disponible").textContent = formatoDinero(totalDisponible);
    document.getElementById("stat-familiar").textContent = formatoDinero(totalFamiliar);
    document.getElementById("stat-fiado").textContent = formatoDinero(totalFiadoAbierto);
    document.getElementById("stat-efectivo").textContent = formatoDinero(totalEfectivo);
    document.getElementById("stat-transferencia").textContent = formatoDinero(totalTransferencia);

    if (!fiadosAbiertos.length) {
      fiadoBody.innerHTML = `<tr><td colspan="6" class="empty-state">No hay fiados abiertos 🎉</td></tr>`;
    } else {
      fiadoBody.innerHTML = fiadosAbiertos.map((v) => {
        const saldo = (v.total || 0) - (v.montoPagado || 0);
        return `
        <tr>
          <td data-label="Fecha">${formatoFecha(v.createdAt)}</td>
          <td data-label="Cliente">${escapeHtml(v.clienteNombre)}</td>
          <td data-label="Total" class="mono">${formatoDinero(v.total)}</td>
          <td data-label="Pagado" class="mono">${formatoDinero(v.montoPagado || 0)}</td>
          <td data-label="Saldo" class="mono">${formatoDinero(saldo)}</td>
          <td data-label=""><button class="btn btn-accent btn-sm" data-pagar-fiado="${v.id}">Registrar pago</button></td>
        </tr>`;
      }).join("");
    }

    if (!retirosDelMes.length) {
      retirosBody.innerHTML = `<tr><td colspan="5" class="empty-state">Sin retiros este mes</td></tr>`;
    } else {
      retirosBody.innerHTML = retirosDelMes.map((r) => `
        <tr>
          <td data-label="Fecha">${formatoFecha(r.createdAt)}</td>
          <td data-label="Quién retira">${escapeHtml(r.nombre)}</td>
          <td data-label="Motivo">${escapeHtml(r.motivo)}</td>
          <td data-label="Monto" class="text-right mono">${formatoDinero(r.monto)}</td>
          <td data-label=""><button class="btn btn-danger btn-sm" data-del-retiro="${r.id}">Eliminar</button></td>
        </tr>`).join("");
    }
  }

  async function cargarHistorialesMensuales() {
    const body = document.getElementById("historial-mensual-body");
    const q = query(collection(db, "resumenMensual"), orderBy("cerradoAt", "desc"));
    const snap = await getDocs(q);
    if (snap.empty) {
      body.innerHTML = `<tr><td colspan="5" class="empty-state">Sin historiales cerrados todavía</td></tr>`;
      return;
    }
    body.innerHTML = snap.docs.map((d) => {
      const r = d.data();
      return `<tr>
        <td data-label="Mes">${escapeHtml(r.mes)}</td>
        <td data-label="Caja" class="mono">${formatoDinero(r.totalDisponible ?? r.totalCaja)}</td>
        <td data-label="Familiar" class="mono">${formatoDinero(r.totalFamiliar)}</td>
        <td data-label="Fiado abierto" class="mono">${formatoDinero(r.totalFiadoAbierto)}</td>
        <td data-label="">
          <button class="btn btn-ghost btn-sm" onclick="window.print()">🖨️</button>
          <button class="btn btn-danger btn-sm" data-del-mes="${d.id}">Eliminar</button>
        </td>
      </tr>`;
    }).join("");
  }
}
