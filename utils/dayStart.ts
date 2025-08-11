// utils/fortaleza-date.ts
export function fortalezaDayStart(d: Date = new Date()): Date {
  // Gera yyyy-mm-dd na TZ de Fortaleza e cria Date com T00:00:00-03:00
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Fortaleza',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
  return new Date(`${fmt}T00:00:00-03:00`);
}

/** Converte "YYYY-MM-DD" para o início do dia em Fortaleza */
export function fortalezaDayStartFromYYYYMMDD(dateStr: string): Date {
  // Evita parse depender de TZ do servidor
  return new Date(`${dateStr}T00:00:00-03:00`);
}
