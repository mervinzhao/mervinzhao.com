// Small formatting helpers shared by templates and the vCard.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const year = (d) => String(d).slice(0, 4);

// "2023–2026", "2025", "2026–"
export function years(start, end) {
  if (!end) return `${year(start)}–`;
  return year(start) === year(end) ? year(start) : `${year(start)}–${year(end)}`;
}

// "Feb 2023 – Aug 2026", "Sep 2026 – Present"
export function months(start, end) {
  const fmt = (d) => {
    const [y, m] = String(d).split('-');
    return m ? `${MONTHS[+m - 1]} ${y}` : y;
  };
  return `${fmt(start)} – ${end ? fmt(end) : 'Present'}`;
}

// Up to three authors in full, otherwise "First et al.", ending in one period.
export function authorsShort(authors) {
  return authors.length > 3 ? `${authors[0]} et al.` : `${authors.join(', ')}.`;
}
