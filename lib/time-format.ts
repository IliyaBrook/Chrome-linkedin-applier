export type FormattedTime = {
  day: string;
  month: string;
  year: string;
  hour: string;
  minute: string;
};

export function getTime(now: Date = new Date()): FormattedTime {
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  return { day, month, year, hour, minute };
}
