export function monthlyRows(data) {
  return Array.isArray(data?.monthly) ? data.monthly : Array.isArray(data) ? data : [];
}
export function linkedCaseIds(detail) {
  return [...new Set((detail?.members || []).filter(m => m.memberState !== 'NOT_RELATED' && typeof m.caseId === 'string' && m.caseId.trim()).map(m => m.caseId))];
}
