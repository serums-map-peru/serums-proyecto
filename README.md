SERUMS Map Perú (Frontend) en Next.js.

## Getting Started

### Requisitos

- Node.js 18+
- Base de datos SQLite `serums.db` disponible (por defecto en `backend/src/data/serums.db`)

### Ejecutar (dev)

```bash
npm install
npm run dev
```

### Ejecutar (prod)

```bash
npm install
npm run build
npm run start
```

## Configuración

Variable opcional:

- `NEXT_PUBLIC_API_BASE_URL` (si se define, debe terminar en `/api`; por defecto se usa el mismo host `/api`)
- `SERUMS_DB_PATH` (ruta absoluta al `serums.db`; por defecto `backend/src/data/serums.db`)
- `JWT_SECRET` (obligatorio en producción): clave para firmar/verificar tokens
- `OSRM_BASE_URL` (opcional): URL de OSRM local (ej. `http://localhost:5000`) para rutas por carretera más estables

Ejemplo:

```bash
set NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
set JWT_SECRET=una-clave-larga-y-segura
```

Notas:

- En producción, `JWT_SECRET` es requerido.

## Cómo se consulta la data

La lista del mapa se obtiene desde:

- `GET /api/hospitales/map` (con query params según filtros)

El panel lateral del seleccionado obtiene el detalle desde:

- `GET /api/hospitales/:id`

Además:

- La búsqueda superior usa `GET /api/buscar?q=...` (Nominatim)
- “Ver cómo llegar” usa `GET /api/ruta` (OSRM/Valhalla)
- “Qué hay cerca” usa `GET /api/lugares-cercanos/:id` (Overpass)

## OSM (OSRM, Overpass, Nominatim)

- OSRM: calcula rutas entre dos coordenadas y devuelve una geometría GeoJSON para dibujar en Leaflet.
- Overpass: consulta puntos de interés alrededor del hospital (2 km) y los agrupa por categoría.
- Nominatim: búsqueda por texto para centrar el mapa en un lugar.

## Ejemplos

```bash
curl "http://localhost:3000/api/hospitales/map?departamento=AMAZONAS&categoria=I-3"
curl "http://localhost:3000/api/hospitales/00005070"
curl "http://localhost:3000/api/buscar?q=Lima"
curl "http://localhost:3000/api/ruta?latUsuario=-12.0464&lonUsuario=-77.0428&latHospital=-12.1&lonHospital=-77.05"
curl "http://localhost:3000/api/lugares-cercanos/00005070"
```
