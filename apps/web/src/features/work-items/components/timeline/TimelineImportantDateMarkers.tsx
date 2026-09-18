import { markerCenter, type TimelineMarker } from '../../utils/timelineMarkers';
import { formatDate } from '@/utils/dates';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function TimelineImportantDateMarkers({
  markers,
  labelW,
  spanToRect,
  showLines,
}: {
  markers: TimelineMarker[];
  labelW: number;
  spanToRect: (start: Date, end: Date) => { left: number; width: number };
  showLines: boolean;
}) {
  return (
    <>
      {showLines && (
        <div className="pointer-events-none absolute top-11 right-0 bottom-0 left-0 z-0 overflow-hidden">
          {markers.map((marker) => {
            return (
              <div
                key={marker.dateKey}
                className="absolute top-0 bottom-0 w-px bg-blue-400/30"
                style={{ left: labelW + markerCenter(marker, spanToRect) }}
              />
            );
          })}
        </div>
      )}
      {markers.map((marker) => {
        const label = `${formatDate(marker.dateKey)}: ${marker.names.join(', ')}`;
        return (
          <Tooltip key={marker.dateKey}>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={label}
                className="absolute top-10 z-30 size-2 -translate-x-1/2 rounded-full bg-blue-400 ring-2 ring-background"
                style={{ left: labelW + markerCenter(marker, spanToRect) }}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{formatDate(marker.dateKey)}</p>
              <ul className="mt-1 list-disc ps-4">
                {marker.names.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </>
  );
}
