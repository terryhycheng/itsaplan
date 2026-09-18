import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { defaultViewSettings, normalizeViewSettings, type ViewSettings } from './viewSettings';

describe('showImportantDateLines', () => {
  it('defaults to false for new and missing settings', () => {
    assert.equal(defaultViewSettings('timeline').showImportantDateLines, false);
    assert.equal(normalizeViewSettings({}, 'timeline').showImportantDateLines, false);
  });

  it('keeps boolean stored values and rejects invalid values', () => {
    assert.equal(
      normalizeViewSettings({ showImportantDateLines: true }, 'timeline').showImportantDateLines,
      true,
    );
    assert.equal(
      normalizeViewSettings({ showImportantDateLines: false }, 'timeline').showImportantDateLines,
      false,
    );
    assert.equal(
      normalizeViewSettings(
        { showImportantDateLines: 'yes' } as unknown as Partial<ViewSettings>,
        'timeline',
      ).showImportantDateLines,
      false,
    );
  });
});
