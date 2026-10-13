export interface BudgetAllocation {
  id: string;
  department: string;
  category: "ACADEMIC" | "UTILITIES" | "MAINTENANCE" | "TRANSPORT" | "OFFICE" | "PROCUREMENT" | "SALARY" | "OTHER";
  allocated: number;
  academicYear: string;
  notes?: string;
}
