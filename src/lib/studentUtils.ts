/**
 * Student ID utilities for PharmaStudents.
 * Provides guaranteed 6-digit numeric IDs (e.g. 104827) that are:
 * 1. Persisted in Supabase profiles (student_number column).
 * 2. Deterministically stable so they never change across page reloads.
 * 3. Never exposed as raw database UUIDs.
 */
export function formatStudentId(profile: { id: string; student_number?: string | null }): string {
  if (profile.student_number && profile.student_number.trim()) {
    return profile.student_number.trim();
  }

  // Fallback: Deterministic 6-digit numeric hash from student's UUID
  let hash = 0;
  for (let i = 0; i < profile.id.length; i++) {
    hash = ((hash << 5) - hash + profile.id.charCodeAt(i)) | 0;
  }
  const sixDigit = 100000 + (Math.abs(hash) % 900000);
  return String(sixDigit);
}
