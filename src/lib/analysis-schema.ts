import { z } from "zod";
export const evidenceSchema = z.object({
  category: z.enum([
    "Road damage",
    "Water or drainage",
    "Waste",
    "Obstruction",
    "Electrical",
    "Other",
  ]),
  observations: z
    .array(
      z.object({
        claim: z.string(),
        sourceField: z.enum([
          "detail",
          "category",
          "ward",
          "reported_at",
          "source_status",
        ]),
        kind: z.enum(["reported", "inferred"]),
      }),
    )
    .max(8),
  uncertainty: z.array(z.string()).max(6),
  summary: z.string().max(1200),
});
