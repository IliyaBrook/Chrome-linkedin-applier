import type { CvFile, CvFilters } from '@/lib/types';

export function generateCvId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `cv_${Date.now()}_${rand}`;
}

export function addCv(files: CvFile[], name: string): { ok: boolean; next: CvFile[]; error?: string } {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, next: files, error: 'Name is required.' };
  if (files.some((f) => f.name.toLowerCase() === trimmed.toLowerCase())) {
    return { ok: false, next: files, error: 'A CV with that name already exists.' };
  }
  return { ok: true, next: [...files, { id: generateCvId(), name: trimmed }] };
}

export function renameCv(
  files: CvFile[],
  filters: CvFilters,
  id: string,
  nextName: string,
): { ok: boolean; nextFiles: CvFile[]; nextFilters: CvFilters; error?: string } {
  const trimmed = nextName.trim();
  if (!trimmed) return { ok: false, nextFiles: files, nextFilters: filters, error: 'Name is required.' };
  const target = files.find((f) => f.id === id);
  if (!target) return { ok: false, nextFiles: files, nextFilters: filters, error: 'CV not found.' };
  if (
    files.some((f) => f.id !== id && f.name.toLowerCase() === trimmed.toLowerCase())
  ) {
    return {
      ok: false,
      nextFiles: files,
      nextFilters: filters,
      error: 'A CV with that name already exists.',
    };
  }
  const nextFiles = files.map((f) => (f.id === id ? { ...f, name: trimmed } : f));
  const nextFilters: CvFilters = { ...filters };
  if (target.name in nextFilters && target.name !== trimmed) {
    nextFilters[trimmed] = nextFilters[target.name];
    delete nextFilters[target.name];
  }
  return { ok: true, nextFiles, nextFilters };
}

export function deleteCv(
  files: CvFile[],
  filters: CvFilters,
  selectedId: string | null,
  id: string,
): { nextFiles: CvFile[]; nextFilters: CvFilters; nextSelected: string | null } {
  const target = files.find((f) => f.id === id);
  const nextFiles = files.filter((f) => f.id !== id);
  const nextFilters: CvFilters = { ...filters };
  if (target && target.name in nextFilters) delete nextFilters[target.name];
  let nextSelected = selectedId;
  if (selectedId === id) {
    nextSelected = nextFiles[0]?.id ?? null;
  }
  return { nextFiles, nextFilters, nextSelected };
}

export function addFilter(
  filters: CvFilters,
  cvName: string,
  candidate: string,
): { ok: boolean; next: CvFilters; error?: string } {
  const trimmed = candidate.trim();
  if (!trimmed) return { ok: false, next: filters, error: 'Filter is required.' };
  const current = filters[cvName] ?? [];
  if (current.some((w) => w.toLowerCase() === trimmed.toLowerCase())) {
    return { ok: false, next: filters, error: 'This filter already exists.' };
  }
  return { ok: true, next: { ...filters, [cvName]: [...current, trimmed] } };
}

export function updateFilter(
  filters: CvFilters,
  cvName: string,
  index: number,
  value: string,
): CvFilters {
  const current = filters[cvName] ?? [];
  const next = [...current];
  next[index] = value;
  return { ...filters, [cvName]: next };
}

export function deleteFilter(filters: CvFilters, cvName: string, index: number): CvFilters {
  const current = filters[cvName] ?? [];
  return { ...filters, [cvName]: current.filter((_, i) => i !== index) };
}
