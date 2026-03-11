export type HospitalSector = "MINSA" | "ESSALUD" | "Militar" | "Privado";

export type EstablishmentType = "I-1" | "I-2" | "I-3" | "I-4";

export type RuralityLevel = "Alto" | "Medio" | "Bajo";

export type Hospital = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  sector: HospitalSector;
  establishmentType: EstablishmentType;
  address: string;
  region: string;
  province: string;
  district: string;
  services: string[];
  rurality: RuralityLevel;
  photoUrl?: string;
};

export type HospitalFilters = {
  query: string;
  region: string | null;
  province: string | null;
  district: string | null;
  sectors: HospitalSector[];
  establishmentTypes: EstablishmentType[];
  rurality: RuralityLevel | null;
  services: string[];
};
