import { capabilityService } from "../services/capabilityService";

export const capabilityController = {
  async getMatrix(req: any, res: any) {
    const { schoolId } = req.params;
    try {
      if (req.user.schoolId !== schoolId && req.user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const matrix = await capabilityService.getMatrix(schoolId);
      res.json(matrix);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to load role capabilities" });
    }
  },

  async putRoleOverrides(req: any, res: any) {
    const { schoolId, role } = req.params;
    try {
      if (req.user.schoolId !== schoolId && req.user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const overrides = Array.isArray(req.body?.overrides) ? req.body.overrides : null;
      if (!overrides) {
        return res.status(400).json({ error: "overrides array is required" });
      }
      const matrix = await capabilityService.setRoleOverrides(
        schoolId,
        role,
        overrides,
        req.user.id
      );
      res.json(matrix);
    } catch (err: any) {
      res.status(err.status || 400).json({ error: err.message || "Failed to save role capabilities" });
    }
  },

  async resolveInternal(req: any, res: any) {
    try {
      const schoolId = String(req.query.schoolId || req.params.schoolId || "");
      const role = String(req.query.role || "");
      if (!role) return res.status(400).json({ error: "role is required" });
      const capabilities = await capabilityService.resolveEffective(schoolId || null, role);
      res.json({ schoolId: schoolId || null, role, capabilities });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to resolve capabilities" });
    }
  },
};
