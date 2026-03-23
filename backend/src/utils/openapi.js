const openapi = {
  openapi: "3.0.3",
  info: {
    title: "SERUMS Map Perú API",
    version: "0.1.0",
    description: "Backend que expone establecimientos SERUMS cargados desde hospitales_filtrados.csv.",
  },
  servers: [{ url: "/api" }],
  paths: {
    "/health": {
      get: {
        summary: "Health check",
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    service: { type: "string" },
                  },
                  required: ["ok", "service"],
                },
              },
            },
          },
        },
      },
    },
    "/hospitales": {
      get: {
        summary: "Obtener todos los establecimientos (con filtros opcionales)",
        parameters: [
          { name: "provincia", in: "query", schema: { type: "string" } },
          { name: "distrito", in: "query", schema: { type: "string" } },
          { name: "profesion", in: "query", schema: { type: "string" } },
          { name: "institucion", in: "query", schema: { type: "string" } },
          { name: "departamento", in: "query", schema: { type: "string" } },
          { name: "grado_dificultad", in: "query", schema: { type: "string" } },
          { name: "categoria", in: "query", schema: { type: "string" } },
          { name: "zaf", in: "query", schema: { type: "string", example: "SI" } },
          { name: "ze", in: "query", schema: { type: "string", example: "NO" } },
        ],
        responses: {
          200: {
            description: "Lista de establecimientos",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Hospital" } },
              },
            },
          },
          400: { $ref: "#/components/responses/BadRequest" },
        },
      },
    },
    "/hospitales/map": {
      get: {
        summary: "Obtener establecimientos livianos para el mapa (con filtros opcionales)",
        parameters: [
          { name: "provincia", in: "query", schema: { type: "string" } },
          { name: "distrito", in: "query", schema: { type: "string" } },
          { name: "profesion", in: "query", schema: { type: "string" } },
          { name: "institucion", in: "query", schema: { type: "string" } },
          { name: "departamento", in: "query", schema: { type: "string" } },
          { name: "grado_dificultad", in: "query", schema: { type: "string" } },
          { name: "categoria", in: "query", schema: { type: "string" } },
          { name: "zaf", in: "query", schema: { type: "string", example: "SI" } },
          { name: "ze", in: "query", schema: { type: "string", example: "NO" } },
        ],
        responses: {
          200: {
            description: "Lista liviana de establecimientos",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/HospitalMapItem" } },
              },
            },
          },
          400: { $ref: "#/components/responses/BadRequest" },
        },
      },
    },
    "/hospitales/{id}": {
      get: {
        summary: "Obtener hospital por ID",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: {
            description: "Hospital",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Hospital" } },
            },
          },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/ruta": {
      get: {
        summary: "Calcular ruta (OSRM) desde usuario al hospital",
        parameters: [
          { name: "latUsuario", in: "query", required: true, schema: { type: "number" } },
          { name: "lonUsuario", in: "query", required: true, schema: { type: "number" } },
          { name: "latHospital", in: "query", required: true, schema: { type: "number" } },
          { name: "lonHospital", in: "query", required: true, schema: { type: "number" } },
          {
            name: "perfil",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["driving", "walking"], default: "driving" },
          },
        ],
        responses: {
          200: {
            description: "Ruta OSRM",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RouteResponse" },
              },
            },
          },
          400: { $ref: "#/components/responses/BadRequest" },
        },
      },
    },
    "/lugares-cercanos/{id}": {
      get: {
        summary: "Obtener lugares cercanos (Overpass) alrededor de un hospital",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: {
            description: "Lugares cercanos agrupados",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/NearbyPlacesResponse" } },
            },
          },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/aeropuerto-cercano/{id}": {
      get: {
        summary: "Obtener aeropuerto más cercano (Overpass) alrededor de un hospital",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: {
            description: "Aeropuerto más cercano",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/NearestAirportResponse" } },
            },
          },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/buscar": {
      get: {
        summary: "Búsqueda global (Nominatim)",
        parameters: [{ name: "q", in: "query", required: true, schema: { type: "string" } }],
        responses: {
          200: {
            description: "Resultados de Nominatim",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/NominatimResult" } },
              },
            },
          },
          400: { $ref: "#/components/responses/BadRequest" },
        },
      },
    },
  },
  components: {
    schemas: {
      Hospital: {
        type: "object",
        properties: {
          id: { type: "string", example: "00005070" },
          profesion: { type: "string" },
          institucion: { type: "string" },
          departamento: { type: "string" },
          provincia: { type: "string" },
          distrito: { type: "string" },
          grado_dificultad: { type: "string", example: "GD-5" },
          codigo_renipress_modular: { type: "string", example: "00005070" },
          nombre_establecimiento: { type: "string" },
          presupuesto: { type: "string" },
          categoria: { type: "string" },
          zaf: { type: "string", example: "SI" },
          ze: { type: "string", example: "NO" },
          lat: { type: "number", format: "float", example: -6.2317 },
          lng: { type: "number", format: "float", example: -77.869 },
          imagenes: { type: "array", items: { type: "string", format: "uri" } },
          coordenadas_fuente: { type: "string", example: "RENIPRESS" },
          profesiones: { type: "array", items: { type: "string" } },
        },
        required: [
          "id",
          "profesion",
          "institucion",
          "departamento",
          "provincia",
          "distrito",
          "grado_dificultad",
          "codigo_renipress_modular",
          "nombre_establecimiento",
          "presupuesto",
          "categoria",
          "zaf",
          "ze",
          "lat",
          "lng",
        ],
      },
      HospitalMapItem: {
        type: "object",
        properties: {
          id: { type: "string", example: "00005070" },
          profesion: { type: "string" },
          institucion: { type: "string" },
          departamento: { type: "string" },
          provincia: { type: "string" },
          distrito: { type: "string" },
          grado_dificultad: { type: "string", example: "GD-5" },
          codigo_renipress_modular: { type: "string", example: "00005070" },
          nombre_establecimiento: { type: "string" },
          categoria: { type: "string" },
          zaf: { type: "string", example: "SI" },
          ze: { type: "string", example: "NO" },
          lat: { type: "number", format: "float", example: -6.2317 },
          lng: { type: "number", format: "float", example: -77.869 },
          profesiones: { type: "array", items: { type: "string" } },
        },
        required: [
          "id",
          "profesion",
          "institucion",
          "departamento",
          "provincia",
          "distrito",
          "grado_dificultad",
          "codigo_renipress_modular",
          "nombre_establecimiento",
          "categoria",
          "zaf",
          "ze",
          "lat",
          "lng",
        ],
      },
      ErrorResponse: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              message: { type: "string" },
              status: { type: "number" },
              details: { type: "object", nullable: true },
            },
            required: ["message", "status"],
          },
        },
        required: ["error"],
      },
      RouteResponse: {
        type: "object",
        properties: {
          distancia: { type: "number", example: 12345.6 },
          duracion: { type: "number", example: 2345.6 },
          geometria: { type: "object" },
        },
        required: ["distancia", "duracion", "geometria"],
      },
      NearbyPlace: {
        type: "object",
        properties: {
          id: { type: "string" },
          lat: { type: "number" },
          lon: { type: "number" },
          name: { type: "string" },
          tags: { type: "object" },
        },
        required: ["id", "lat", "lon", "name", "tags"],
      },
      NearbyPlacesResponse: {
        type: "object",
        properties: {
          id: { type: "string" },
          hospedajes: { type: "array", items: { $ref: "#/components/schemas/NearbyPlace" } },
          restaurantes: { type: "array", items: { $ref: "#/components/schemas/NearbyPlace" } },
          farmacias: { type: "array", items: { $ref: "#/components/schemas/NearbyPlace" } },
          tiendas: { type: "array", items: { $ref: "#/components/schemas/NearbyPlace" } },
          comisarias: { type: "array", items: { $ref: "#/components/schemas/NearbyPlace" } },
        },
        required: ["id", "hospedajes", "restaurantes", "farmacias", "tiendas", "comisarias"],
      },
      NearestAirportResponse: {
        type: "object",
        properties: {
          id: { type: "string" },
          aeropuerto: { $ref: "#/components/schemas/NearbyPlace", nullable: true },
          distancia_meters: { type: "number", nullable: true, example: 12345.6 },
          radius_meters: { type: "number", example: 80000 },
        },
        required: ["id", "aeropuerto", "distancia_meters", "radius_meters"],
      },
      NominatimResult: {
        type: "object",
        properties: {
          place_id: { type: "number" },
          display_name: { type: "string" },
          lat: { type: "string" },
          lon: { type: "string" },
          type: { type: "string" },
          class: { type: "string" },
          importance: { type: "number" },
          boundingbox: { type: "array", items: { type: "string" } },
        },
        required: ["place_id", "display_name", "lat", "lon"],
      },
    },
    responses: {
      BadRequest: {
        description: "Solicitud inválida",
        content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
      },
      NotFound: {
        description: "No encontrado",
        content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
      },
    },
  },
};

module.exports = { openapi };
