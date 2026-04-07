// types/index.ts

export type Role = 'admin' | 'doctor' | 'nurse';

export interface User {
  user_id: string;
  username: string;
  role: Role;
  full_name: string;
  credential: string;
  license_no: string;
}

export interface Patient {
  patient_id: string;
  full_name: string;
  address: string;
  date_of_birth: string;
  sex: 'M' | 'F' | '';
  age: number | string;
  weight: number | string;
  height: number | string;
  contact_no: string;
  created_at: string;
  created_by: string;
  status: 'active' | 'completed' | 'overdue';
  incident_count?: number;
  latest_category?: string;
}

export type AnimalType = 'dog' | 'cat' | 'bat' | 'other';
export type Ownership = 'owned_vaccinated' | 'owned_not_vaccinated' | 'stray' | 'wild_rabid';
export type WoundCategory = 'I' | 'II' | 'III';
export type ERIGType = 'ERIG' | 'HRIG' | '';

export interface Incident {
  incident_id: string;
  patient_id: string;
  consult_date: string;
  bite_datetime: string;
  place_of_exposure: string;
  animal_type: AnimalType;
  animal_other: string;
  ownership: Ownership;
  pet_vaccine_date: string;
  circumstance: 'provoked' | 'unprovoked' | '';
  wound_category: WoundCategory;
  wound_status: 'bleeding' | 'non_bleeding' | '';
  wound_type: string;
  wound_type_other: string;
  anatomical_positions: string;
  wound_wash: boolean;
  antiseptic_applied: boolean;
  erig_hrig: ERIGType;
  erig_hrig_brand: string;
  erig_hrig_batch: string;
  erig_hrig_date: string;
  erig_hrig_administered_by: string;
  tetanus_vaccine_status: 'Y' | 'N' | '';
  tetanus_date: string;
  tetanus_type: 'TT' | 'TD' | 'ATS' | '';
  tetanus_brand: string;
  tetanus_batch: string;
  tetanus_admin_by: string;
  hiv: boolean;
  immunosuppressant: boolean;
  long_term_steroid: boolean;
  chloroquine: boolean;
  malignancy: boolean;
  congenital_immuno: boolean;
  other_conditions: string;
  anti_tetanus_vaccine: boolean;
  anti_rabies_completed: boolean;
  anti_rabies_details: string;
  folk_remedy: boolean;
  folk_remedy_details: string;
  smoker: boolean;
  alcoholic: boolean;
  allergy: string;
  physician_notes: string;
  referring_doctor: string;
  status: 'active' | 'completed';
  pep_doses_needed: number;
}

export type DoseDay = 'D0' | 'D3' | 'D7' | 'D14' | 'D21' | 'D28';
export type DoseStatus = 'scheduled' | 'done' | 'overdue' | 'skipped';
export type VaccineType = 'PVRV' | 'PCEC' | '';

export interface Dose {
  dose_id: string;
  incident_id: string;
  patient_id: string;
  dose_type: 'PEP' | 'PrEP';
  dose_day: DoseDay;
  scheduled_date: string;
  administered_date: string;
  vaccine_type: VaccineType;
  brand_name: string;
  batch_no: string;
  administered_by: string;
  route: string;
  dose_volume: string;
  status: DoseStatus;
  is_optional: boolean;
}

export interface PetMonitor {
  monitor_id: string;
  incident_id: string;
  patient_id: string;
  pet_type: string;
  monitor_start: string;
  monitor_end: string;
  outcome: 'healthy' | 'perished' | 'unknown';
  outcome_date: string;
  notes: string;
  recorded_by: string;
}

export interface DashboardData {
  total_patients: number;
  active_treatment: number;
  completed: number;
  overdue_doses: number;
  erig_count: number;
  hrig_count: number;
  animal_counts: { dog: number; cat: number; bat: number; other: number };
  age_lt15: number;
  age_15: number;
  age_gt15: number;
  male_count: number;
  female_count: number;
  cat1: number;
  cat2: number;
  cat3: number;
  monthly: number[];
  due_today: number;
  due_this_week: number;
  demographics_records: DemographicsRecord[];
  due_overdue_patients: DueOverduePatient[];
  pet_monitors_active: number;
}

export interface DemographicsRecord {
  patient_id: string;
  age_group: 'under15' | '15' | 'over15';
  sex: 'male' | 'female' | 'unknown';
  animal_type: 'dog' | 'cat' | 'bat' | 'other';
  category: 'I' | 'II' | 'III' | '';
  erig_hrig: 'ERIG' | 'HRIG' | '';
  consult_month: number;
}

export interface DueOverduePatient {
  patient_id: string;
  full_name: string;
  status: 'due' | 'overdue';
  due_date: string;
  dose_day: string;
}
