import { chunkGridRows, getResponsivePortalMetrics } from '../ThemeContext';

describe('responsive portal layout', () => {
  it('adapts phone spacing, type and columns to the available width', () => {
    const compact = getResponsivePortalMetrics(360, 800);
    const wide = getResponsivePortalMetrics(440, 956);

    expect(compact.space.x4).toBeLessThan(wide.space.x4);
    expect(compact.type.sm).toBeLessThan(wide.type.sm);
    expect(compact.grid.moduleCols).toBe(3);
    expect(wide.grid.moduleCols).toBe(4);
    expect(compact.grid.quickStatCols).toBe(2);
    expect(compact.grid.bmnCols).toBe(2);
  });

  it('keeps previews within short screens and limits content width on tablets', () => {
    const landscape = getResponsivePortalMetrics(800, 360);
    const tablet = getResponsivePortalMetrics(1024, 1366);

    expect(landscape.size.scanBodyHeight).toBeLessThan(360);
    expect(landscape.size.modalScrollMaxH).toBeLessThan(360);
    expect(tablet.size.maxContentWidth).toBe(680);
    expect(tablet.grid.bmnCols).toBe(3);
    expect(tablet.fontScale).toBeLessThanOrEqual(1.08);
  });

  it('stacks the narrowest layouts and supplies usable initial dimensions', () => {
    expect(getResponsivePortalMetrics(280, 640).grid.quickStatCols).toBe(1);
    expect(getResponsivePortalMetrics(280, 640).grid.bmnCols).toBe(1);
    const initial = getResponsivePortalMetrics(0, 0);
    expect(initial.width).toBeGreaterThan(0);
    expect(initial.height).toBeGreaterThan(0);
  });

  it.each([1, 2, 3, 5, 8])('preserves all %i modules in flexible rows without placeholders', (count) => {
    const modules = Array.from({ length: count }, (_, i) => i);
    const rows = chunkGridRows(modules, 4);

    expect(rows.flat()).toEqual(modules);
    expect(rows.every(row => row.length > 0 && row.length <= 4)).toBe(true);
    expect(rows.at(-1)).toHaveLength(count % 4 || 4);
    expect(chunkGridRows([], 4)).toEqual([]);
  });
});
