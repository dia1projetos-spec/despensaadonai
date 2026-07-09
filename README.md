# Despensa Adonai — Sistema de Caja

## Estructura del proyecto (Fase 1)

```
despensa-adonai/
├── index.html          → Página de login (LISTA)
├── admin.html           → Panel principal (próxima fase)
├── css/
│   ├── variables.css    → Colores, tipografía, espaciado (extraídos del logo)
│   └── login.css        → Estilos exclusivos del login
├── js/
│   ├── firebase-config.js → Conexión a Firebase (Auth + Firestore)
│   └── login.js          → Lógica del formulario de login
├── img/
│   └── logo-despensa-adonai.png → Logo real ya integrado en el login
└── firestore.rules      → Reglas de seguridad recomendadas
```

La paleta de `variables.css` fue extraída directamente de tu logo
(fondo crema `#f7ede2`, marca espresso `#33210f`, acento terracota
`#a98a6c` de las hojitas). Todo el resto del sistema (paneles,
botones, tablas) va a heredar estos mismos colores automáticamente.

## Cómo probarlo

Los módulos de JavaScript (`type="module"`) no funcionan abriendo el
archivo directamente con doble clic (`file://`). Necesitás un
servidor local simple. Opciones:

- VS Code: extensión "Live Server" → botón derecho en `index.html` → "Open with Live Server"
- Terminal: `npx serve .` dentro de la carpeta `kiosko-diego`
- Terminal (Python): `python3 -m http.server 8080`

Una vez publicado en Vercel, funciona directo sin nada de esto.

## Antes de usar en producción

1. **Habilitar el método de login por email/contraseña**
   Firebase Console → Authentication → Sign-in method → Email/Password → Habilitar.
   Después creá tu primer usuario ahí mismo (Users → Add user).

2. **Aplicar las reglas de Firestore** (archivo `firestore.rules` incluido):
   exige que el usuario esté logueado para leer o escribir cualquier dato.
   Sin esto, cualquier persona podría leer/editar tu base de datos aunque
   no tenga usuario y contraseña.

3. **Crear el upload preset de Cloudinary** (para subir fotos de producto sin exponer tu API Secret):
   Cloudinary → Settings → Upload → Upload presets → Add upload preset →
   Signing mode: **Unsigned** → guardar el nombre del preset.
   Después completá `CLOUDINARY_CONFIG` en `js/firebase-config.js` con
   tu `cloudName` (aparece en el dashboard) y el nombre del preset.
   ⚠️ La API Secret que me pasaste no se usa en ningún lado del código
   — recomiendo rotarla (generar una nueva) en el panel de Cloudinary,
   ya que quedó expuesta en este chat.

4. **Logo**: ya integrado (`img/logo-despensa-adonai.png`), y la
   paleta de colores del sistema ya sale de tu logo real. Si más
   adelante querés cambiar el fondo del login por una foto o video
   propio, se hace desde el panel admin sin tocar código (queda
   guardado en Firestore → `config/branding`).

## Progreso de las 10 funciones pedidas

- [x] 10 (parcial) — Login con logo real + paleta de marca aplicada
- [ ] 1 — Registro de productos (foto, stock, +IVA opcional, búsqueda)
- [ ] 2 — Clientes (común / familiar)
- [ ] 3 — Configuración de +IVA
- [ ] 4 — Caja / ventas (efectivo, transferencia, fiado, vuelto)
- [ ] 5 — Historial de compras por cliente (6 meses, PDF)
- [ ] 6 — Resumen financiero mensual (PDF)
- [ ] 7 — Ranking de stock bajo
- [ ] 8 — Ranking de más vendidos
- [ ] 9 — Notificaciones de stock (2, 1, 0 unidades)
- [ ] 10 (resto) — Panel admin para cambiar logo/fondo

Vamos a ir armando el resto en las próximas fases.
