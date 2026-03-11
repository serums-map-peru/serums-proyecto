# SERUMS Map Perú (Backend)

Backend en Node.js + Express con arquitectura modular y datos mock en JSON.

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

## Endpoints

- `GET /api/health`
- `GET /api/servicios`
- `GET /api/hospitales`
- `GET /api/hospitales/:id`
- `GET /api/docs` (Swagger UI)

## Filtros (query params)

`GET /api/hospitales` acepta estos filtros opcionales:

- `region`
- `provincia`
- `distrito`
- `sector` (CSV) ejemplo: `MINSA,ESSALUD`
- `tipo` (CSV) ejemplo: `I-1,I-2`
- `ruralidad` (Alto|Medio|Bajo)
- `servicio` (CSV, AND) ejemplo: `Farmacia,Laboratorio`

Ejemplos:

```bash
curl "http://localhost:4000/api/hospitales?region=Lima&sector=MINSA,ESSALUD"
curl "http://localhost:4000/api/hospitales?servicio=Farmacia,Laboratorio"
curl "http://localhost:4000/api/hospitales/h-001"
```

## Datos mock

- `src/data/hospitales.json`
- `src/data/servicios.json`
