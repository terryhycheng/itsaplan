import type { ImportantDate } from '@/lib/api/endpoints/important-dates';
import { parseDate } from '@/utils/dates';

export interface TimelineMarker {
  date: Date;
  dateKey: string;
  names: string[];
}

// Groups dates after filtering timeline-hidden entries so the timeline creates one
// marker per day while retaining every name for its tooltip.
export function groupTimelineMarkers(importantDates: ImportantDate[]): TimelineMarker[] {
  const markers = new Map<string, TimelineMarker>();
  for (const importantDate of importantDates) {
    if (!importantDate.showOnTimeline) continue;
    const date = parseDate(importantDate.date);
    if (!date) continue;
    const existing = markers.get(importantDate.date);
    if (existing) existing.names.push(importantDate.name);
    else
      markers.set(importantDate.date, {
        date,
        dateKey: importantDate.date,
        names: [importantDate.name],
      });
  }
  return [...markers.values()];
}

export function expandTimelineRange(
  min: Date | null,
  max: Date | null,
  markers: TimelineMarker[],
): { min: Date | null; max: Date | null } {
  for (const marker of markers) {
    if (!min || marker.date < min) min = marker.date;
    if (!max || marker.date > max) max = marker.date;
  }
  return { min, max };
}

export function markerCenter(
  marker: TimelineMarker,
  spanToRect: (start: Date, end: Date) => { left: number; width: number },
): number {
  const rect = spanToRect(marker.date, marker.date);
  return rect.left + rect.width / 2;
}
