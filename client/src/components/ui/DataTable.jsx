import { useState, useMemo } from 'react';
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Inbox,
} from 'lucide-react';
import clsx from 'clsx';

/* ------------------------------------------------------------------ */
/*  Skeleton row for loading state                                     */
/* ------------------------------------------------------------------ */
function SkeletonRow({ colCount }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: colCount }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

/* ------------------------------------------------------------------ */
/*  Row actions dropdown                                               */
/* ------------------------------------------------------------------ */
function RowActions({ actions, row }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
            {actions.map((action, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick(row);
                  setOpen(false);
                }}
                className={clsx(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors cursor-pointer',
                  action.variant === 'danger'
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                {action.icon && <action.icon className="h-4 w-4" />}
                {action.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sort icon                                                          */
/* ------------------------------------------------------------------ */
function SortIcon({ direction }) {
  if (!direction)
    return <ChevronsUpDown className="h-3.5 w-3.5 text-gray-300" />;
  return direction === 'asc' ? (
    <ChevronUp className="h-3.5 w-3.5 text-primary-500" />
  ) : (
    <ChevronDown className="h-3.5 w-3.5 text-primary-500" />
  );
}

/* ------------------------------------------------------------------ */
/*  Main DataTable                                                     */
/* ------------------------------------------------------------------ */
export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  searchable = true,
  searchPlaceholder = 'Search...',
  searchKeys = [],
  actions = [],
  emptyTitle = 'No results found',
  emptyDescription = 'Try adjusting your search or filters.',
  emptyIcon: EmptyIcon = Inbox,
  onRowClick,
  className,
  headerRight,
  /* Server-side pagination support (optional) */
  page: controlledPage,
  totalPages: controlledTotalPages,
  onPageChange,
}) {
  /* ---- Internal state for client-side mode ---- */
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState(null); // 'asc' | 'desc'
  const [internalPage, setInternalPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const isServerSide = controlledPage !== undefined && onPageChange !== undefined;

  /* ---- Search filter (client-side only) ---- */
  const filtered = useMemo(() => {
    if (isServerSide || !search.trim()) return data;
    const term = search.toLowerCase();
    const keys =
      searchKeys.length > 0
        ? searchKeys
        : columns
            .filter((c) => c.searchable !== false && c.key)
            .map((c) => c.key);
    return data.filter((row) =>
      keys.some((key) => {
        const val = row[key] ?? row[key];
        return (
          val !== null &&
          val !== undefined &&
          String(val).toLowerCase().includes(term)
        );
      })
    );
  }, [data, search, searchKeys, columns, isServerSide]);

  /* ---- Sort (client-side only) ---- */
  const sorted = useMemo(() => {
    if (isServerSide || !sortKey || !sortDir) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    const compareFn =
      col?.sortFn ||
      ((a, b) => {
        const aVal = a[sortKey] ?? '';
        const bVal = b[sortKey] ?? '';
        if (typeof aVal === 'number' && typeof bVal === 'number')
          return aVal - bVal;
        return String(aVal).localeCompare(String(bVal));
      });
    const result = [...filtered].sort(compareFn);
    return sortDir === 'desc' ? result.reverse() : result;
  }, [filtered, sortKey, sortDir, columns, isServerSide]);

  /* ---- Pagination ---- */
  const page = isServerSide ? controlledPage : internalPage;
  const totalPages = isServerSide
    ? controlledTotalPages
    : Math.max(1, Math.ceil(sorted.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paginated = isServerSide
    ? data
    : sorted.slice((safePage - 1) * perPage, safePage * perPage);

  const goToPage = (p) => {
    if (isServerSide) {
      onPageChange(p);
    } else {
      setInternalPage(p);
    }
  };

  const handleSort = (key) => {
    if (!key) return;
    if (sortKey === key) {
      setSortDir((d) =>
        d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc'
      );
      if (sortDir === 'desc') setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    goToPage(1);
  };

  /* accessor helper: supports both col.key and col.accessor */
  const getKey = (col) => col.key || col.accessor;
  const getCellValue = (row, col) => row[col.key] ?? row[col.accessor];

  const colCount = columns.length + (actions.length > 0 ? 1 : 0);

  return (
    <div
      className={clsx(
        'bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden',
        className
      )}
    >
      {/* Toolbar */}
      {(searchable || headerRight) && (
        <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-gray-100">
          {searchable ? (
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  goToPage(1);
                }}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
              />
            </div>
          ) : (
            <div />
          )}
          {headerRight && (
            <div className="flex items-center gap-2">{headerRight}</div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              {columns.map((col) => (
                <th
                  key={getKey(col)}
                  className={clsx(
                    'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500',
                    col.sortable !== false &&
                      'cursor-pointer select-none hover:text-gray-700',
                    col.className
                  )}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() =>
                    col.sortable !== false && handleSort(getKey(col))
                  }
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable !== false && (
                      <SortIcon
                        direction={sortKey === getKey(col) ? sortDir : null}
                      />
                    )}
                  </span>
                </th>
              ))}
              {actions.length > 0 && (
                <th className="px-4 py-3 w-12">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} colCount={colCount} />
              ))
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="py-16">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-3">
                      <EmptyIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {emptyTitle}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {emptyDescription}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((row, rowIdx) => (
                <tr
                  key={row._id || row.id || row.member_id || row.plan_id || row.sub_id || row.diet_id || row.staff_id || row.announcement_id || row.payment_id || row.assignment_id || rowIdx}
                  onClick={() => onRowClick?.(row)}
                  className={clsx(
                    'transition-colors hover:bg-gray-50/80',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={getKey(col)}
                      className={clsx(
                        'px-4 py-3 text-gray-700',
                        col.cellClassName
                      )}
                    >
                      {col.render
                        ? col.render(getCellValue(row, col), row, rowIdx)
                        : getCellValue(row, col) ?? '-'}
                    </td>
                  ))}
                  {actions.length > 0 && (
                    <td className="px-4 py-3">
                      <RowActions actions={actions} row={row} />
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      {!loading && (paginated.length > 0 || isServerSide) && totalPages > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            {!isServerSide && (
              <>
                <span>Rows per page</span>
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    goToPage(1);
                  }}
                  className="border border-gray-200 rounded-md px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
                >
                  {[10, 25, 50].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {!isServerSide && sorted.length > 0 && (
              <span>
                {(safePage - 1) * perPage + 1}
                {' - '}
                {Math.min(safePage * perPage, sorted.length)} of {sorted.length}
              </span>
            )}
            {isServerSide && (
              <span>
                Page {safePage} of {totalPages}
              </span>
            )}
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage(Math.max(1, safePage - 1))}
                disabled={safePage === 1}
                className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => goToPage(Math.min(totalPages, safePage + 1))}
                disabled={safePage === totalPages}
                className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
