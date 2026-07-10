# Despensa Adonai — Sistema de Caja

## Estructura del proyecto

```
despensa-adonai/
├── index.html            → Login
├── admin.html            → Panel completo (caja, productos, clientes, resumen, rankings, notificaciones, config)
├── css/
│   ├── variables.css     → Colores y tipografía (extraídos del logo)
│   ├── login.css
│   └── admin.css
├── js/
│   ├── firebase-config.js → Conexión Firebase + Cloudinary config
│   ├── cloudinary.js      → Helper para subir fotos/videos
│   ├── store.js           → Sincroniza productos y clientes en vivo
│   ├── utils.js           → Helpers (formato de moneda, toasts, modales)
│   ├── login.js
│   ├── admin.js           → Arranca el panel, navegación, logout, limpieza de historial
│   ├── productos.js
│   ├── clientes.js
│   ├── caja.js
│   ├── resumen.js
│   ├── rankings.js
│   ├── notificaciones.js
│   └── config.js
├── img/logo-despensa-adonai.png
└── firestore.rules
```

## Antes de usar

1. **Email/Password + primer usuario** en Firebase Authentication (ya explicado antes).
2. **Reglas de Firestore** (`firestore.rules`) publicadas.
3. **Cloudinary**: cloud name `jwsmxzrc` y preset `Despensa Adonai` ya están cargados en `firebase-config.js`.
4. **Índices de Firestore**: como el sistema usa filtros + orden combinados (por ejemplo, historial de un cliente, o notificaciones sin leer), la primera vez que uses cada pantalla es posible que la consola del navegador (F12 → Console) muestre un link azul de Firebase diciendo "this query requires an index". Solo hay que clickearlo, esperar 1-2 minutos a que Firebase lo cree, y listo — no hay que tocar código.

## Cómo funciona cada módulo

- **Productos**: alta/edición/baja, foto vía Cloudinary, stock, +IVA opcional por producto, buscador.
- **Clientes**: común o familiar, historial de compras con botón de impresión (usa el diálogo de impresión del navegador → "Guardar como PDF").
- **Caja**: buscador de productos, carrito con cálculo automático de +IVA, cliente opcional, aviso especial si es familiar (no cobra pero queda registrado), efectivo/transferencia/fiado, cálculo de vuelto.
- **Resumen**: total en caja, retiro familiar, fiado abierto (con botón para marcar como pagado), botón "Cerrar mes actual" que guarda una foto de los totales en el historial mensual (imprimible).
- **Rankings**: menor stock primero, más vendidos primero — se actualizan solos con cada venta.
- **Notificaciones**: se genera un aviso nuevo cada vez que un producto baja a 2, 1 o 0 unidades. Al marcar como leída desaparece; si el producto se repone y vuelve a bajar, avisa de nuevo.
- **Configuración**: IVA sugerido general, y cambio de logo/fondo del login (imagen o video) sin tocar código.

## Sobre cache del navegador (importante)

Todos los archivos `.js` y `.css` ahora se cargan con un parámetro `?v=2` al final
(por ejemplo `admin.js?v=2`). Esto existe para evitar que el navegador de la
computadora de la caja siga usando una versión vieja y cacheada del sistema
después de que yo corrija algo. **La próxima vez que reciban un ZIP con
correcciones, si algo "no cambia" a pesar de haber subido los archivos nuevos,
probá cambiar el número (`?v=2` → `?v=3`) en `index.html` y `admin.html`**, o
simplemente hacer un refresh forzado (Ctrl+Shift+R / Cmd+Shift+R).

## Limitación importante (leer)

El borrado de compras con más de 6 meses y el cierre de mes son procesos que corren **cuando alguien abre el sistema** (no hay un servidor corriendo 24/7 sin que nadie entre). Para la mayoría de los kioscos esto no es un problema porque el sistema se abre todos los días. Si en algún momento querés que esto pase automáticamente incluso sin que nadie abra el panel (por ejemplo a la medianoche del día 1 de cada mes), hay que agregar **Firebase Cloud Functions + Cloud Scheduler** — es un paso más avanzado que puedo armar después si lo necesitás.

## Progreso de las 10 funciones pedidas

- [x] 1 — Productos (foto, stock, +IVA opcional, búsqueda, editar/eliminar)
- [x] 2 — Clientes común / familiar
- [x] 3 — Configuración de +IVA
- [x] 4 — Caja (búsqueda, +IVA automático, cliente, efectivo/transferencia/fiado, vuelto)
- [x] 5 — Historial de compras por cliente + impresión (borrado automático a los 6 meses, ver limitación arriba)
- [x] 6 — Resumen financiero + cierre mensual imprimible
- [x] 7 — Ranking de menor stock
- [x] 8 — Ranking de más vendidos
- [x] 9 — Notificaciones de stock (2, 1, 0), se repiten si vuelve a pasar
- [x] 10 — Login + panel con logo/fondo configurables desde Configuración
