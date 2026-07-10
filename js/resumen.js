import { db, collection, query, where, orderBy, getDocs, onSnapshot, doc, updateDoc, deleteDoc, addDoc, Timestamp } from "./firebase-config.js";
import { formatoDinero, formatoFecha, mostrarToast, abrirModal, cerrarModal, escapeHtml } from "./utils.js";

function inicioDeMes() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

let ventasDelMes = [];
let retirosDelMes = [];

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

  fiadoBody.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-pagar]");
    if (!btn) return;
    if (!confirm("¿Marcar esta venta fiada como pagada?")) return;
    await updateDoc(doc(db, "ventas", btn.dataset.pagar), { pagado: true, pagadoAt: new Date() });
    mostrarToast("Venta marcada como pagada");
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

  function calcularTotales() {
    let totalCaja = 0, totalFamiliar = 0, totalFiadoAbierto = 0;
    const fiadosPendientes = [];

    ventasDelMes.forEach((v) => {
      if (v.esFamiliar) {
        totalFamiliar += v.valorReal || v.total || 0;
      } else if (v.formaPago === "fiado") {
        if (!v.pagado) {
          totalFiadoAbierto += v.total || 0;
          fiadosPendientes.push(v);
        } else {
          totalCaja += v.total || 0;
        }
      } else {
        totalCaja += v.total || 0;
      }
    });

    const totalRetiros = retirosDelMes.reduce((acc, r) => acc + (r.monto || 0), 0);
    const totalDisponible = totalCaja - totalRetiros;

    return { totalCaja, totalFamiliar, totalFiadoAbierto, totalRetiros, totalDisponible, fiadosPendientes };
  }

  function renderResumen() {
    const { totalCaja, totalFamiliar, totalFiadoAbierto, totalRetiros, totalDisponible, fiadosPendientes } = calcularTotales();
    document.getElementById("stat-caja").textContent = formatoDinero(totalCaja);
    document.getElementById("stat-retiros").textContent = formatoDinero(totalRetiros);
    document.getElementById("stat-disponible").textContent = formatoDinero(totalDisponible);
    document.getElementById("stat-familiar").textContent = formatoDinero(totalFamiliar);
    document.getElementById("stat-fiado").textContent = formatoDinero(totalFiadoAbierto);

    if (!fiadosPendientes.length) {
      fiadoBody.innerHTML = `<tr><td colspan="4" class="empty-state">No hay fiados pendientes 🎉</td></tr>`;
    } else {
      fiadoBody.innerHTML = fiadosPendientes.map((v) => `
        <tr>
          <td>${formatoFecha(v.createdAt)}</td>
          <td>${escapeHtml(v.clienteNombre)}</td>
          <td class="mono">${formatoDinero(v.total)}</td>
          <td><button class="btn btn-accent btn-sm" data-pagar="${v.id}">Marcar pagado</button></td>
        </tr>`).join("");
    }

    if (!retirosDelMes.length) {
      retirosBody.innerHTML = `<tr><td colspan="5" class="empty-state">Sin retiros este mes</td></tr>`;
    } else {
      retirosBody.innerHTML = retirosDelMes.map((r) => `
        <tr>
          <td>${formatoFecha(r.createdAt)}</td>
          <td>${escapeHtml(r.nombre)}</td>
          <td>${escapeHtml(r.motivo)}</td>
          <td class="text-right mono">${formatoDinero(r.monto)}</td>
          <td><button class="btn btn-danger btn-sm" data-del-retiro="${r.id}">Eliminar</button></td>
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
        <td>${escapeHtml(r.mes)}</td>
        <td class="mono">${formatoDinero(r.totalDisponible ?? r.totalCaja)}</td>
        <td class="mono">${formatoDinero(r.totalFamiliar)}</td>
        <td class="mono">${formatoDinero(r.totalFiadoAbierto)}</td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="window.print()">🖨️</button>
          <button class="btn btn-danger btn-sm" data-del-mes="${d.id}">Eliminar</button>
        </td>
      </tr>`;
    }).join("");
  }
}
