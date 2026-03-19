export type Hospital = {
  id: string;
  profesion: string;
  profesiones?: string[];
  institucion: string;
  departamento: string;
  provincia: string;
  distrito: string;
  grado_dificultad: string;
  codigo_renipress_modular: string;
  nombre_establecimiento: string;
  presupuesto: string;
  categoria: string;
  zaf: string;
  ze: string;
  lat: number;
  lng: number;
  imagenes?: string[];
  coordenadas_fuente?: string;
  serums_ofertas?: SerumsOffer[];
  serums_resumen?: SerumsOfferSummary[];
};

export type SerumsOffer = {
  hospital_id: string;
  codigo_renipress_modular: string;
  periodo: string;
  modalidad: string;
  profesion: string;
  plazas: number;
  sede_adjudicacion: string;
  updated_at?: string | null;
};

export type SerumsOfferSummary = {
  periodo: string;
  modalidad: string;
  plazas_total: number;
};

export type HospitalMapItem = {
  id: string;
  profesion: string;
  profesiones?: string[];
  institucion: string;
  departamento: string;
  provincia: string;
  distrito: string;
  grado_dificultad: string;
  codigo_renipress_modular: string;
  nombre_establecimiento: string;
  categoria: string;
  zaf: string;
  ze: string;
  lat: number;
  lng: number;
};

export type HospitalFilters = {
  profesion: string | null;
  institucion: string | null;
  departamento: string | null;
  provincia: string | null;
  distrito: string | null;
  grado_dificultad: string | null;
  categoria: string | null;
  zaf: string | null;
  ze: string | null;
  serums_periodo: string | null;
  serums_modalidad: string | null;
};

export type RouteResponse = {
  distancia: number;
  duracion: number;
  geometria: {
    type: "LineString";
    coordinates: Array<[number, number]>;
  };
};

export type NearbyPlace = {
  id: string;
  lat: number;
  lon: number;
  name: string;
  tags: Record<string, unknown>;
};

export type NearbyPlacesResponse = {
  id: string;
  hospedajes: NearbyPlace[];
  restaurantes: NearbyPlace[];
  farmacias: NearbyPlace[];
  tiendas: NearbyPlace[];
  comisarias: NearbyPlace[];
};

export type NearestAirportResponse = {
  id: string;
  aeropuerto: NearbyPlace | null;
  distancia_meters: number | null;
  radius_meters: number;
};

export type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  class?: string;
  importance?: number;
  boundingbox?: string[];
};
