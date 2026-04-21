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
  encaps_puntaje_2025_i?: string | null;
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
  institucion: string[];
  departamento: string[];
  grado_dificultad: string[];
  categoria: string[];
  zaf: string | null;
  ze: string | null;
  serums_periodo: string | null;
  serums_modalidad: string | null;
  airport_hours_max?: number | null;
};

export type RouteResponse = {
  distancia: number;
  duracion: number;
  geometria: {
    type: "LineString";
    coordinates: Array<[number, number]>;
  };
  aproximada?: boolean;
  warning?: string;
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
  gimnasios: NearbyPlace[];
  bancos: NearbyPlace[];
  iglesias: NearbyPlace[];
  supermercados: NearbyPlace[];
  centros_comerciales: NearbyPlace[];
};

export type NearestAirportResponse = {
  id: string;
  aeropuerto: NearbyPlace | null;
  distancia_meters: number | null;
  radius_meters: number;
};

export type FavoriteItem = {
  id: string;
  item_type: "hospital" | "place";
  item_id: string;
  name: string | null;
  lat: number | null;
  lon: number | null;
  meta: unknown | null;
  created_at: string | null;
  hospital?: (HospitalMapItem & { lat: number | null; lng: number | null }) | null;
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
