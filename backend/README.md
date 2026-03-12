# SERUMS Map Perú (Backend)

Backend en Node.js + Express que sirve datos reales desde `hospitales_filtrados.csv` (sin BD).

## Requisitos

- Node.js 18+ (recomendado)

## Instalación

```bash
npm install
```

## Ejecutar

```bash
npm start
```

Variables opcionales:

- `PORT` (por defecto 4000)
- `HOST` (por defecto 0.0.0.0)
- `HOSPITALES_CSV_PATH` (ruta al CSV; por defecto `../../hospitales_filtrados.csv` desde este backend)

## Endpoints

- `GET /api/health`
- `GET /api/hospitales`
- `GET /api/hospitales/:id`
- `GET /api/ruta`
- `GET /api/lugares-cercanos/:id`
- `GET /api/buscar`
- `GET /api/docs` (Swagger UI)

## Carga de datos

- El backend carga el CSV al primer request y lo mantiene en memoria.
- Si cambia la fecha de modificación del archivo, se recarga automáticamente.
- Si una fila no trae `codigo_renipress_modular`, se genera un `id` estable a partir del contenido.
- Si el CSV trae `lat`/`lon` se usan como `lat`/`lng` del hospital.
- Si no trae coordenadas válidas, se usa un centro aproximado por `departamento`.

## Filtros (query params)

`GET /api/hospitales` acepta estos filtros opcionales:

- `profesion`
- `institucion`
- `departamento`
- `provincia`
- `distrito`
- `grado_dificultad`
- `categoria`
- `zaf`
- `ze`

Ejemplos:

```bash
curl "http://localhost:4000/api/hospitales"
curl "http://localhost:4000/api/hospitales?departamento=AMAZONAS"
curl "http://localhost:4000/api/hospitales?profesion=BIOLOGIA&provincia=BAGUA"
curl "http://localhost:4000/api/hospitales?zaf=SI&ze=NO"
curl "http://localhost:4000/api/hospitales/00005070"
curl "http://localhost:4000/api/buscar?q=Lima"
curl "http://localhost:4000/api/ruta?latUsuario=-12.0464&lonUsuario=-77.0428&latHospital=-12.1&lonHospital=-77.05"
curl "http://localhost:4000/api/lugares-cercanos/00005070"
```

## OSM (OSRM, Overpass, Nominatim)

- OSRM: calcula rutas entre dos coordenadas y devuelve distancia/duración y una geometría lista para dibujar en Leaflet.
- Overpass: permite consultar puntos de interés alrededor de una coordenada (hoteles, restaurantes, farmacias, tiendas, comisarías).
- Nominatim: búsqueda de lugares por texto (geocoding) para centrar el mapa.
