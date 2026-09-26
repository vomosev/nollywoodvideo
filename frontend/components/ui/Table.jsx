export default function Table({
  columns = [],
  rows = [],
  getRowKey,
  caption,
  emptyMessage = 'No data to display yet.',
  dense = false,
}) {
  const safeColumns = Array.isArray(columns) ? columns : [];
  const safeRows = Array.isArray(rows) ? rows : [];

  const resolveKey = (row, index) => {
    if (typeof getRowKey === 'function') {
      try {
        const key = getRowKey(row, index);
        if (key !== undefined && key !== null) return String(key);
      } catch (err) {
        return `row-${index}`;
      }
    }
    if (row && (row.id !== undefined && row.id !== null)) return String(row.id);
    return `row-${index}`;
  };

  const renderCell = (column, row, index) => {
    if (typeof column.render === 'function') {
      try {
        return column.render(row, index);
      } catch (err) {
        return '—';
      }
    }
    const value = row ? row[column.key] : undefined;
    if (value === undefined || value === null || value === '') return '—';
    if (typeof value === 'object') return String(value);
    return value;
  };

  if (safeColumns.length === 0) {
    return (
      <div className="table-wrap">
        <p className="table__empty">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="table-wrap" role="region" aria-label={caption || 'Data table'} tabIndex={0}>
      <table className={dense ? 'table table--dense' : 'table'}>
        {caption ? <caption className="table__caption">{caption}</caption> : null}
        <thead>
          <tr>
            {safeColumns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={column.align === 'right'
                  ? 'table__th table__cell--right'
                  : column.align === 'center'
                    ? 'table__th table__cell--center'
                    : 'table__th'}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {safeRows.length === 0 ? (
            <tr>
              <td className="table__td table__empty-cell" colSpan={safeColumns.length}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            safeRows.map((row, index) => (
              <tr key={resolveKey(row, index)} className="table__row">
                {safeColumns.map((column, columnIndex) => {
                  const alignClass =
                    column.align === 'right'
                      ? ' table__cell--right'
                      : column.align === 'center'
                        ? ' table__cell--center'
                        : '';
                  const truncateClass = column.truncate ? ' text-truncate' : '';
                  const wrapClass = column.wrapSafe ? ' text-wrap-safe' : '';

                  if (columnIndex === 0 && column.rowHeader) {
                    return (
                      <th
                        key={column.key}
                        scope="row"
                        className={`table__th table__th--row${alignClass}${truncateClass}${wrapClass}`}
                      >
                        {renderCell(column, row, index)}
                      </th>
                    );
                  }

                  return (
                    <td
                      key={column.key}
                      className={`table__td${alignClass}${truncateClass}${wrapClass}`}
                    >
                      {renderCell(column, row, index)}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}