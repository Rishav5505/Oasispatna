// Program ↔ class mapping shared by the class picker, batch quiz and demo form options.
export const PROGRAM_BY_CLASS = {
  7: 'GROUND ZERO',
  8: 'NURTURE',
  9: 'SHAKSHAM',
  10: 'DAKSH',
  11: 'ABHYAAS',
  12: 'TARGET',
};

export const CLASSES = [7, 8, 9, 10, 11, 12];

// Works off the API course object: prefer `classes: ['7th']`, fall back to the name map.
export const classOfCourse = (course) => {
  const fromList = Array.isArray(course?.classes) ? parseInt(course.classes[0], 10) : NaN;
  if (Number.isFinite(fromList)) return fromList;
  const hit = Object.entries(PROGRAM_BY_CLASS).find(([, name]) => name === String(course?.name || '').toUpperCase());
  return hit ? Number(hit[0]) : null;
};

export const scrollToDemo = () => {
  const el = document.getElementById('demo-form');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
