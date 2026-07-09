import { db, collection, query, where, orderBy, getDocs, doc, updateDoc, addDoc, Timestamp } from "./firebase-config.js";
import { formatoDinero, formatoFecha, mostrarToast, escapeHtml } from "./utils.js";

function inicioDeMes() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function initResumen() {
  const btnCerrar = document.getElementById("btn-cerrar-mes");
  const fiadoBody = document.getElementById("fiado-body");
  const mesActualEl = document.getElementById("resumen-mes-actual");

  mesActualEl.textContent = new Date().toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  cargarResumen();
  cargarHistorialesMensuales();

  btnCerrar.addEventListener("click", async () => {
    if (!confirm("¿Cerrar el mes actual? Se guarda una foto de los totales de hoy en el historial.")) return;
    const totales = await calcularTotales();
    const clave = new Date().toISOString().slice(0, 7); // YYYY-MM
    try {
      await addDoc(collection(db, "resumenMensual"), {
        mes: clave,
        totalCaja: totales.totalCaja,
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
    cargarResumen();
  });

  async function calcularTotales() {
    const q = query(collection(db, "ventas"), where("createdAt", ">=", Timestamp.fromDate(inicioDeMes())));
    const snap = await getDocs(q);
    let totalCaja = 0, totalFamiliar = 0, totalFiadoAbierto = 0;
    const fiadosPendientes = [];

    snap.forEach((d) => {
      const v = d.data();
      if (v.esFamiliar) {
        totalFamiliar += v.valorReal || v.total || 0;
      } else if (v.formaPago === "fiado") {
        if (!v.pagado) {
          totalFiadoAbierto += v.total || 0;
          fiadosPendientes.push({ id: d.id, ...v });
        } else {
          totalCaja += v.total || 0;
        }
      } else {
        totalCaja += v.total || 0;
      }
    });

    return { totalCaja, totalFamiliar, totalFiadoAbierto, fiadosPendientes };
  }

  async function cargarResumen() {
    const { totalCaja, totalFamiliar, totalFiadoAbierto, fiadosPendientes } = await calcularTotales();
    document.getElementById("stat-caja").textContent = formatoDinero(totalCaja);
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
        <td class="mono">${formatoDinero(r.totalCaja)}</td>
        <td class="mono">${formatoDinero(r.totalFamiliar)}</td>
        <td class="mono">${formatoDinero(r.totalFiadoAbierto)}</td>
        <td><button class="btn btn-ghost btn-sm" onclick="window.print()">🖨️</button></td>
      </tr>`;
    }).join("");
  }
}
