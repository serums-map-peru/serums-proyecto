const { ALLOWED_RURALIDAD, ALLOWED_SECTORS, ALLOWED_TIPOS } = require("../middlewares/validateHospitalQuery");

const openapi = {
  openapi: "3.0.3",
  info: {
    title: "SERUMS Map Perú API",
    version: "0.1.0",
    description: "Backend mock con archivos JSON para servir datos a un frontend con mapa y filtros.",
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
    "/servicios": {
      get: {
        summary: "Listar servicios médicos",
        responses: {
          200: {
            description: "Lista de servicios",
            content: {
              "application/json": {
                schema: { type: "array", items: { type: "string" } },
              },
            },
          },
        },
      },
    },
    "/hospitales": {
      get: {
        summary: "Obtener todos los hospitales (con filtros opcionales)",
        parameters: [
          { name: "region", in: "query", schema: { type: "string" } },
          { name: "provincia", in: "query", schema: { type: "string" } },
          { name: "distrito", in: "query", schema: { type: "string" } },
          {
            name: "sector",
            in: "query",
            description: "Uno o más sectores separados por coma",
            schema: { type: "string", example: "MINSA,ESSALUD" },
          },
          {
            name: "tipo",
            in: "query",
            description: "Uno o más tipos separados por coma",
            schema: { type: "string", example: "I-1,I-2" },
          },
          {
            name: "ruralidad",
            in: "query",
            schema: { type: "string", enum: Array.from(ALLOWED_RURALIDAD) },
          },
          {
            name: "servicio",
            in: "query",
            description: "Uno o más servicios separados por coma (AND)",
            schema: { type: "string", example: "Farmacia,Laboratorio" },
          },
        ],
        responses: {
          200: {
            description: "Lista de hospitales",
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
  },
  components: {
    schemas: {
      Hospital: {
        type: "object",
        properties: {
          id: { type: "string", example: "h-001" },
          nombre: { type: "string" },
          sector: { type: "string", enum: Array.from(ALLOWED_SECTORS) },
          tipo: { type: "string", enum: Array.from(ALLOWED_TIPOS) },
          region: { type: "string" },
          provincia: { type: "string" },
          distrito: { type: "string" },
          lat: { type: "number", format: "float" },
          lng: { type: "number", format: "float" },
          servicios: { type: "array", items: { type: "string" } },
          nivel_ruralidad: { type: "string", enum: Array.from(ALLOWED_RURALIDAD) },
          direccion: { type: "string" },
          foto: { type: "string" },
        },
        required: [
          "id",
          "nombre",
          "sector",
          "tipo",
          "region",
          "provincia",
          "distrito",
          "lat",
          "lng",
          "servicios",
          "nivel_ruralidad",
          "direccion",
          "foto",
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
