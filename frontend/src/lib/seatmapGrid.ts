/** Column count so room tiles stay square and fit the row on the current viewport. */
export function seatmapGridColumns(roomCount: number, mobile: boolean): number {
  if (roomCount <= 1) return 1;
  if (mobile) {
    if (roomCount <= 4) return roomCount;
    if (roomCount <= 8) return 4;
    return 6;
  }
  if (roomCount <= 6) return roomCount;
  if (roomCount <= 12) return 12;
  return Math.min(14, Math.ceil(roomCount / 2));
}
