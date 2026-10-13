import type { Request, Response, NextFunction } from "express";
import { z } from "zod";

/** Ported from src/server/middleware/validate.ts */
export const validateBody = (schema: z.ZodType) => (req: Request, res: Response, next: NextFunction) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: "Validation failed", details: result.error.flatten() });
  }
  req.body = result.data;
  next();
};
