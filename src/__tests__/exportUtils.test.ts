import { describe, expect, it } from 'vitest';
import { neutralizeSpreadsheetFormula } from '@/lib/exportUtils';

describe('spreadsheet formula protection', () => {
  it('neutralizes formula prefixes after whitespace and control characters', () => {
    expect(neutralizeSpreadsheetFormula('\t=SUM(1,1)')).toBe("'\t=SUM(1,1)");
    expect(neutralizeSpreadsheetFormula('\u0000@HYPERLINK("https://example.com")')).toBe(
      "'\u0000@HYPERLINK(\"https://example.com\")",
    );
    expect(neutralizeSpreadsheetFormula('\uFEFF+1')).toBe("'\uFEFF+1");
  });

  it('preserves ordinary text and makes leading negative values literal', () => {
    expect(neutralizeSpreadsheetFormula('Repair completed')).toBe('Repair completed');
    expect(neutralizeSpreadsheetFormula('-125')).toBe("'-125");
  });
});