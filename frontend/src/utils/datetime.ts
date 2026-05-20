const IST = "Asia/Kolkata";

export function formatIST(isoString: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(isoString).toLocaleString("en-IN", {
    timeZone: IST,
    ...opts,
  });
}

export function formatISTTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("en-IN", {
    timeZone: IST,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatISTDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-IN", {
    timeZone: IST,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatISTDateTime(isoString: string): string {
  return `${formatISTDate(isoString)}, ${formatISTTime(isoString)}`;
}

export function formatDuration(startIso: string, endIso: string | null): string {
  if (!endIso) {
    const mins = Math.floor((Date.now() - new Date(startIso).getTime()) / 60000);
    return `${mins} min (ongoing)`;
  }
  const mins = Math.floor(
    (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000
  );
  return `${mins} min`;
}

export function isToday(isoDate: string): boolean {
  const normalized =
    isoDate.length === 10 ? `${isoDate}T00:00:00+05:30` : isoDate;
  const d = new Date(normalized);
  const today = new Date(
    new Date().toLocaleString("en-US", { timeZone: IST })
  );
  return d.toDateString() === today.toDateString();
}

export function todayYmdIST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: IST });
}

export function currentMonthYm(): string {
  const d = todayYmdIST();
  return d.slice(0, 7);
}
