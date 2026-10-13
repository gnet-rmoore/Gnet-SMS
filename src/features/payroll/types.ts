export interface PayrollNotes {
  currency: string;
  taxId: string;
  iban: string;
  swift: string;
  employmentType: string;
  customNotes: string;
}

export interface PayrollRecord {
  id: string;
  userId: string;
  month: number;
  year: number;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: string;
  notes?: string | null;
  paidAt?: string | null;
  user?: {
    id: string;
    name: string;
    role: string;
    email?: string;
    photoUrl?: string | null;
  };
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  email?: string;
  photoUrl?: string | null;
  isActive?: boolean;
}

export interface PayrollFormData {
  userId: string;
  month: number;
  year: number;
  basicSalary: string | number;
  allowances: string | number;
  deductions: string | number;
  status: string;
  currency: string;
  taxId: string;
  iban: string;
  swift: string;
  employmentType: string;
  customNotes: string;
}
