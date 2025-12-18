import './DataTable.css'

/**
 * DataTable Component
 * Simple table for displaying data
 */
const DataTable = ({ columns, data, onRowClick }) => {
  if (!data || data.length === 0) {
    return (
      <div className="data-table-empty">
        <p>No data available</p>
      </div>
    )
  }

  return (
    <div className="data-table-wrapper">
      <table className="table data-table">
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th key={idx}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              onClick={() => onRowClick && onRowClick(row)}
              className={onRowClick ? 'data-table-row-clickable' : ''}
            >
              {columns.map((col, colIdx) => (
                <td key={colIdx}>
                  {col.render ? col.render(row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default DataTable
