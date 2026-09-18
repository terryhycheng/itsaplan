import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ImportantDate } from '@/lib/api/endpoints/important-dates';
import { parseDate } from '@/utils/dates';
import { expandTimelineRange, groupTimelineMarkers, markerCenter } from './timelineMarkers';

const date = (input: Partial<ImportantDate>): ImportantDate => ({
  id: 1,
  projectId: 1,
  name: 'Launch',
  date: '2026-10-15',
  showOnTimeline: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...input,
});

describe('timeline markers', () => {
  it('groups same-day visible dates and omits hidden dates', () => {
    const markers = groupTimelineMarkers([
      date({ name: 'Launch' }),
      date({ id: 2, name: 'Review' }),
      date({ id: 3, date: '2026-11-01', showOnTimeline: false }),
    ]);

    assert.deepEqual(markers, [
      { date: parseDate('2026-10-15'), dateKey: '2026-10-15', names: ['Launch', 'Review'] },
    ]);
  });

  it('extends the timeline range for visible marker dates', () => {
    const markers = groupTimelineMarkers([date({ date: '2026-10-15' })]);
    assert.deepEqual(
      expandTimelineRange(parseDate('2026-10-20'), parseDate('2026-10-25'), markers),
      {
        min: parseDate('2026-10-15'),
        max: parseDate('2026-10-25'),
      },
    );
  });

  it('centers a marker within its day track cell', () => {
    const [marker] = groupTimelineMarkers([date({})]);
    assert.equal(
      markerCenter(marker, () => ({ left: 64, width: 32 })),
      80,
    );
  });
});
