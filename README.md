SERUMS Map Perú (Frontend) en Next.js.

## Getting Started

### Requisitos

- Node.js 18+
- Backend corriendo (por defecto en `http://localhost:4000`)

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

- `NEXT_PUBLIC_API_BASE_URL` (por defecto `http://localhost:4000/api`)

Ejemplo:

```bash
set NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
```

## Cómo se consulta la data

La lista del mapa se obtiene desde:

- `GET /hospitales` (con query params según filtros)

El panel lateral del seleccionado obtiene el detalle desde:

- `GET /hospitales/:id`

Además:

- La búsqueda superior usa `GET /buscar?q=...` (Nominatim)
- “Ver cómo llegar” usa `GET /ruta` (OSRM)
- “Qué hay cerca” usa `GET /lugares-cercanos/:id` (Overpass)

## OSM (OSRM, Overpass, Nominatim)

- OSRM: calcula rutas entre dos coordenadas y devuelve una geometría GeoJSON para dibujar en Leaflet.
- Overpass: consulta puntos de interés alrededor del hospital (2 km) y los agrupa por categoría.
- Nominatim: búsqueda por texto para centrar el mapa en un lugar.

## Ejemplos

```bash
curl "http://localhost:4000/api/hospitales?departamento=AMAZONAS&categoria=I-3"
curl "http://localhost:4000/api/hospitales/00005070"
curl "http://localhost:4000/api/buscar?q=Lima"
curl "http://localhost:4000/api/ruta?latUsuario=-12.0464&lonUsuario=-77.0428&latHospital=-12.1&lonHospital=-77.05"
curl "http://localhost:4000/api/lugares-cercanos/00005070"
```
