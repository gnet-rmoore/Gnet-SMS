import prisma from "../lib/prisma";

export class PayrollTemplateError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "PayrollTemplateError";
    this.status = status;
  }
}

type TemplateLineInput = {
  userId: string;
  basicSalary: number;
  allowances?: number;
  deductions?: number;
  notes?: string | null;
};

function netSalaryFor(line: {
  basicSalary: number;
  allowances?: number | null;
  deductions?: number | null;
}) {
  return (
    Number(line.basicSalary || 0) +
    Number(line.allowances || 0) -
    Number(line.deductions || 0)
  );
}

function normalizeLines(lines: TemplateLineInput[]) {
  const seen = new Set<string>();
  return lines.map((line) => {
    const userId = String(line.userId || "").trim();
    if (!userId) throw new PayrollTemplateError("Every template line needs a staff member");
    if (seen.has(userId)) {
      throw new PayrollTemplateError("Each staff member can only appear once in a template");
    }
    seen.add(userId);
    return {
      userId,
      basicSalary: Number(line.basicSalary || 0),
      allowances: Number(line.allowances || 0),
      deductions: Number(line.deductions || 0),
      notes: line.notes?.trim() || null,
    };
  });
}

function templateCurrency(items: Array<{ notes?: string | null }>) {
  for (const item of items) {
    if (!item.notes) continue;
    try {
      const parsed = JSON.parse(item.notes);
      if (parsed?.currency) return String(parsed.currency);
    } catch {
      /* legacy free-text notes */
    }
  }
  return "USD";
}

function withTotals<
  T extends {
    items: Array<{
      basicSalary: number;
      allowances: number;
      deductions: number;
      notes?: string | null;
    }>;
  }
>(template: T) {
  const monthlyNet = template.items.reduce((sum, item) => sum + netSalaryFor(item), 0);
  return {
    ...template,
    itemCount: template.items.length,
    monthlyNet,
    currency: templateCurrency(template.items),
  };
}

export const payrollTemplateService = {
  async listTemplates(schoolId: string) {
    const templates = await prisma.payrollTemplate.findMany({
      where: { schoolId },
      include: { items: { orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "desc" },
    });
    return templates.map(withTotals);
  },

  async getTemplate(id: string) {
    const template = await prisma.payrollTemplate.findUnique({
      where: { id },
      include: { items: { orderBy: { createdAt: "asc" } } },
    });
    if (!template) throw new PayrollTemplateError("Payroll template not found", 404);
    return withTotals(template);
  },

  async createTemplate(
    schoolId: string,
    createdBy: string | null,
    data: { name: string; description?: string | null; lines: TemplateLineInput[] }
  ) {
    const lines = normalizeLines(data.lines);
    const template = await prisma.payrollTemplate.create({
      data: {
        schoolId,
        createdBy,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        items: { create: lines },
      },
      include: { items: { orderBy: { createdAt: "asc" } } },
    });
    return withTotals(template);
  },

  async createFromPayrolls(
    schoolId: string,
    createdBy: string | null,
    data: { name: string; description?: string | null; month: number; year: number }
  ) {
    const payrolls = await prisma.payroll.findMany({
      where: { schoolId, month: data.month, year: data.year },
      orderBy: { createdAt: "asc" },
    });
    if (payrolls.length === 0) {
      throw new PayrollTemplateError(
        "No payroll records exist for that month. Add payroll records first, then save the template.",
        400
      );
    }
    return this.createTemplate(schoolId, createdBy, {
      name: data.name,
      description: data.description,
      lines: payrolls.map((payroll) => ({
        userId: payroll.userId,
        basicSalary: payroll.basicSalary,
        allowances: payroll.allowances,
        deductions: payroll.deductions,
        notes: payroll.notes,
      })),
    });
  },

  async updateTemplate(
    id: string,
    data: {
      name?: string;
      description?: string | null;
      isActive?: boolean;
      lines?: TemplateLineInput[];
    }
  ) {
    const existing = await prisma.payrollTemplate.findUnique({ where: { id } });
    if (!existing) throw new PayrollTemplateError("Payroll template not found", 404);

    const lines = data.lines ? normalizeLines(data.lines) : null;
    return prisma.$transaction(async (tx) => {
      if (lines) {
        await tx.payrollTemplateItem.deleteMany({ where: { templateId: id } });
      }
      const template = await tx.payrollTemplate.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: data.name.trim() } : {}),
          ...(data.description !== undefined
            ? { description: data.description?.trim() || null }
            : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
          ...(lines ? { items: { create: lines } } : {}),
        },
        include: { items: { orderBy: { createdAt: "asc" } } },
      });
      return withTotals(template);
    });
  },

  async deleteTemplate(id: string) {
    const existing = await prisma.payrollTemplate.findUnique({ where: { id } });
    if (!existing) throw new PayrollTemplateError("Payroll template not found", 404);
    await prisma.payrollTemplate.delete({ where: { id } });
  },

  async previewTemplate(id: string, month: number, year: number) {
    const template = await this.getTemplate(id);
    const userIds = template.items.map((item) => item.userId);
    const existing = userIds.length
      ? await prisma.payroll.findMany({
          where: { userId: { in: userIds }, month, year },
          select: { id: true, userId: true, status: true },
        })
      : [];
    const existingByUser = new Map(existing.map((row) => [row.userId, row]));

    const items = template.items.map((item) => {
      const existingRecord = existingByUser.get(item.userId);
      return {
        ...item,
        netSalary: netSalaryFor(item),
        exists: Boolean(existingRecord),
        existingPayrollId: existingRecord?.id ?? null,
        existingStatus: existingRecord?.status ?? null,
      };
    });

    return {
      templateId: template.id,
      templateName: template.name,
      isActive: template.isActive,
      month,
      year,
      items,
      wouldCreate: items.filter((item) => !item.exists).length,
      wouldSkip: items.filter((item) => item.exists).length,
      totalNet: items.reduce((sum, item) => sum + item.netSalary, 0),
    };
  },

  async runTemplate(id: string, month: number, year: number) {
    const template = await prisma.payrollTemplate.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!template) throw new PayrollTemplateError("Payroll template not found", 404);
    if (!template.isActive) {
      throw new PayrollTemplateError("This payroll template is inactive", 400);
    }

    const preview = await this.previewTemplate(id, month, year);
    const toCreate = preview.items.filter((item) => !item.exists);
    let created = 0;

    await prisma.$transaction(async (tx) => {
      if (toCreate.length > 0) {
        const result = await tx.payroll.createMany({
          data: toCreate.map((item) => ({
            schoolId: template.schoolId,
            userId: item.userId,
            month,
            year,
            basicSalary: item.basicSalary,
            allowances: item.allowances,
            deductions: item.deductions,
            netSalary: item.netSalary,
            status: "PENDING",
            notes: item.notes,
          })),
          skipDuplicates: true,
        });
        created = result.count;
      }
      await tx.payrollTemplate.update({
        where: { id },
        data: { lastRunMonth: month, lastRunYear: year, lastRunAt: new Date() },
      });
    });

    return {
      templateId: template.id,
      month,
      year,
      created,
      skipped: preview.items.length - created,
      totalNet: preview.items.reduce((sum, item) => sum + item.netSalary, 0),
      items: preview.items,
    };
  },
};
