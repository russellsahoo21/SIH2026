export function canEdit(caseRow, user) {
  if (!user || !caseRow) return false;
  if (user.role === 'ADMIN') return true;
  const caseBureau = caseRow.bureau_code || caseRow.bureau;
  const sameBureau = user.bureau === caseBureau;
  return sameBureau && (user.role === 'OFFICER' || user.role === 'HEAD');
}

export function viewLevel(caseRow, user) {
  if (!user || !caseRow) return 'LIMITED';
  if (user.role === 'ADMIN' || user.role === 'MANAGEMENT' || user.role === 'COORDINATOR') {
    return 'FULL';
  }
  const caseBureau = caseRow.bureau_code || caseRow.bureau;
  if (user.bureau === caseBureau) {
    return 'FULL';
  }
  return 'LIMITED'; // other bureau: basic metadata only
}

export function canView(caseRow, user) {
  if (!user || !caseRow) return false;
  return true; // all authenticated roles can see that a case exists
}
