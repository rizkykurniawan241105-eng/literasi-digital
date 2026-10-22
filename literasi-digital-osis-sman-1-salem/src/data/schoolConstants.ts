// Default 27 classes for SMAN 1 Salem (Grades X, XI, XII - 9 classes per grade)
export const DEFAULT_CLASSES: string[] = [
  'X-1', 'X-2', 'X-3', 'X-4', 'X-5', 'X-6', 'X-7', 'X-8', 'X-9',
  'XI-1', 'XI-2', 'XI-3', 'XI-4', 'XI-5', 'XI-6', 'XI-7', 'XI-8', 'XI-9',
  'XII-1', 'XII-2', 'XII-3', 'XII-4', 'XII-5', 'XII-6', 'XII-7', 'XII-8', 'XII-9'
];

export const sortClassNames = (classList: string[]): string[] => {
  const gradeOrder: Record<string, number> = { X: 1, XI: 2, XII: 3 };
  return [...classList].sort((a, b) => {
    const parseGrade = (cls: string) => {
      const match = cls.match(/^(XII|XI|X)[-_ ]?(\d+)?/i);
      if (match) {
        const grade = match[1].toUpperCase();
        const num = match[2] ? parseInt(match[2], 10) : 0;
        return { gradeOrder: gradeOrder[grade] || 99, num, raw: cls };
      }
      return { gradeOrder: 99, num: 0, raw: cls };
    };
    const pA = parseGrade(a);
    const pB = parseGrade(b);
    if (pA.gradeOrder !== pB.gradeOrder) return pA.gradeOrder - pB.gradeOrder;
    if (pA.num !== pB.num) return pA.num - pB.num;
    return a.localeCompare(b);
  });
};

export const CATEGORIES = [
  'Semua Kategori',
  'Novel & Sastra',
  'Self Development',
  'Sains & Teknologi',
  'Sejarah',
  'Biografi',
  'Agama & Karakter',
  'Komik & Grafis'
];
