import { useState, useMemo } from 'react'
import './DataTable.css'

/**
 * DataTable Component
 * Simple table for displaying data
 */
const DataTable = ({ columns, data, onRowClick, compact }) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })

  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data

    return [...data].sort((a, b) => {
      // Handle nested accessors if needed, currently assuming flat
      // Check if accessor is string or function (if function, sorting might be tricky without extra prop, 
      // but let's assume we rely on row[accessor] being comparable or create a sortValue getter if needed.
      // For now, simple access:

      // Find the column definition to see if there's a specific sort accessor (not implemented yet, simple approach first)
      const column = columns.find(c => c.accessor === sortConfig.key)

      const aVal = a[sortConfig.key]
      const bVal = b[sortConfig.key]

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [data, sortConfig, columns])

  if (!data || data.length === 0) {
    return (
      <div className="data-table-empty">
        <p>No data available</p>
      </div>
    )
  }

  return (
    <div className="data-table-wrapper">
      <table className={`table data-table ${compact ? 'compact' : ''}`}>
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                onClick={() => col.sortable && handleSort(col.accessor)}
                style={{
                  cursor: col.sortable ? 'pointer' : 'default',
                  userSelect: 'none'
                }}
              >
                {col.header}
                {col.sortable && sortConfig.key === col.accessor && (
                  <span style={{ marginLeft: '4px' }}>
                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, rowIdx) => (
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
