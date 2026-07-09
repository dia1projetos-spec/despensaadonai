import { db, collection, onSnapshot, orderBy, query } from "./firebase-config.js";

export const store = {
  productos: [],
  clientes: [],
};

const listeners = { productos: [], clientes: [] };

export function onProductosChange(cb) { listeners.productos.push(cb); if (store.productos.length) cb(store.productos); }
export function onClientesChange(cb) { listeners.clientes.push(cb); if (store.clientes.length) cb(store.clientes); }

export function iniciarStore() {
  const qProductos = query(collection(db, "productos"), orderBy("nombre"));
  onSnapshot(qProductos, (snap) => {
    store.productos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    listeners.productos.forEach((cb) => cb(store.productos));
  });

  const qClientes = query(collection(db, "clientes"), orderBy("nombre"));
  onSnapshot(qClientes, (snap) => {
    store.clientes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    listeners.clientes.forEach((cb) => cb(store.clientes));
  });
}

export function precioFinalProducto(p) {
  const base = Number(p.precio) || 0;
  const iva = p.ivaPercent != null && p.ivaPercent !== "" ? Number(p.ivaPercent) : 0;
  return base + base * (iva / 100);
}
