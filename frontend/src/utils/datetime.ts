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
