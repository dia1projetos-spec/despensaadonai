import { onProductosChange } from "./store.js?v=5";
import { escapeHtml } from "./utils.js?v=5";

export function initRankings() {
  onProductosChange((productos) => {
    renderStockBajo(productos);
    renderMasVendidos(productos);
  });

  function renderStockBajo(productos) {
    const body = document.getElementById("ranking-stock-body");
    const ordenado = [...productos].sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0));
    if (!ordenado.length) { body.innerHTML = `<tr><td colspan="2" class="empty-state">Sin productos</td></tr>`; return; }
    body.innerHTML = ordenado.map((p) => `
      <tr><td>${escapeHtml(p.nombre)}</td><td>${p.stock <= 2 ? `<span class="pill pill--stock-low">${p.stock}</span>` : p.stock}</td></tr>
    `).join("");
  }

  function renderMasVendidos(productos) {
    const body = document.getElementById("ranking-vendidos-body");
    const ordenado = [...productos].sort((a, b) => (b.vendidos ?? 0) - (a.vendidos ?? 0));
    if (!ordenado.length) { body.innerHTML = `<tr><td colspan="2" class="empty-state">Sin ventas todavía</td></tr>`; return; }
    body.innerHTML = ordenado.map((p) => `
      <tr><td>${escapeHtml(p.nombre)}</td><td class="mono">${p.vendidos ?? 0}</td></tr>
    `).join("");
  }
}
