/** Keep a paginated list on a page that still exists after its total changes. */
export const clampPageToTotal = (
  page: number,
  pageSize: number,
  total: number,
): number => {
  const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 1;
  const safeTotal = Number.isFinite(total) ? Math.max(0, total) : 0;
  const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
  const lastPage = Math.max(1, Math.ceil(safeTotal / safePageSize));
  return Math.min(safePage, lastPage);
};

/**
 * When a refreshed page is empty, move to the last page that can contain rows.
 * This handles deleting the final row on the current page, including when
 * other clients have also changed the list.
 */
export const pageForNonEmptyResult = (
  page: number,
  pageSize: number,
  total: number,
  itemCount: number,
): number =>
  itemCount > 0 ? page : clampPageToTotal(page, pageSize, total);
