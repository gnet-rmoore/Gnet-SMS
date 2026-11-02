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

export interface PayrollTemplateItem {
  id?: string;
  userId: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  notes?: string | null;
  netSalary?: number;
}

export interface PayrollTemplate {
  id: string;
  schoolId: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdBy?: string | null;
  lastRunMonth?: number | null;
  lastRunYear?: number | null;
  lastRunAt?: string | null;
  items: PayrollTemplateItem[];
  itemCount: number;
  monthlyNet: number;
  currency: string;
}

export interface PayrollTemplateLineInput {
  userId: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  notes?: string | null;
}

export interface PayrollTemplatePreviewItem extends PayrollTemplateItem {
  netSalary: number;
  exists: boolean;
  existingPayrollId?: string | null;
  existingStatus?: string | null;
}

export interface PayrollTemplatePreview {
  templateId: string;
  templateName: string;
  isActive: boolean;
  month: number;
  year: number;
  items: PayrollTemplatePreviewItem[];
  wouldCreate: number;
  wouldSkip: number;
  totalNet: number;
}

export interface PayrollTemplateRunResult {
  templateId: string;
  month: number;
  year: number;
  created: number;
  skipped: number;
  totalNet: number;
  items: PayrollTemplatePreviewItem[];
}
