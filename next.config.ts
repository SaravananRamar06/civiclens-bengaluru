import { withWorkflow } from "workflow/next";
export default withWorkflow({ output: process.env.CIVIC_STANDALONE === "true" ? "standalone" : undefined });
