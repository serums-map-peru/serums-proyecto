## Rutas por carretera (OSRM local)

Para que el trazo sea una ruta real por carretera (y no dependa de servicios públicos), lo correcto es correr un motor de ruteo local.

Este proyecto ya intenta OSRM público y Valhalla público, pero pueden rate-limitar o fallar. Con OSRM local el comportamiento es estable.

### 1) Preparar datos OSRM (Perú)

- Crea la carpeta:
  - `routing/osrm`
- Descarga un extract OSM de Perú (PBF). Ejemplo (Geofabrik):
  - `peru-latest.osm.pbf`
- Dentro de `routing/osrm/` deja:
  - `peru-latest.osm.pbf`

Luego ejecuta (una sola vez) el pipeline de OSRM (MLD):

```bash
docker run --rm -t -v %cd%/routing/osrm:/data ghcr.io/project-osrm/osrm-backend:latest osrm-extract -p /opt/car.lua /data/peru-latest.osm.pbf
docker run --rm -t -v %cd%/routing/osrm:/data ghcr.io/project-osrm/osrm-backend:latest osrm-partition /data/peru-latest.osrm
docker run --rm -t -v %cd%/routing/osrm:/data ghcr.io/project-osrm/osrm-backend:latest osrm-customize /data/peru-latest.osrm
```

Finalmente renombra:

- `routing/osrm/peru-latest.osrm` → `routing/osrm/peru.osrm`
- y los archivos asociados (`.osrm.*`) deben quedar con prefijo `peru.osrm.*`

### 2) Levantar el servicio

```bash
docker compose up -d osrm
```

Esto expone OSRM en:
- `http://localhost:5000`

### 3) Conectar la app al OSRM local

La API `/api/ruta` intenta primero `OSRM_BASE_URL` y luego cae a público.

Puedes setear:
- `OSRM_BASE_URL=http://localhost:5000`

En desarrollo, reinicia el servidor de Next.js luego de cambiar variables de entorno.
