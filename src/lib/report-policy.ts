const work: Record<string, string[]> = {
  Submitted: ["Acknowledged"],
  Acknowledged: ["In progress"],
  "In progress": ["Handoff prepared", "Resolution proposed"],
  "Handoff prepared": ["In progress", "Resolution proposed"],
  Reopened: ["Acknowledged"],
};
export function permittedTransitions(status: string, isOwner: boolean, isOperator: boolean) {
  const next = isOperator ? [...(work[status] || [])] : [];
  if (isOwner && status === "Resolution proposed") next.push("Closed", "Reopened");
  if (isOwner && status === "Closed") next.push("Reopened");
  return next;
}
