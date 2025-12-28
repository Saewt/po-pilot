import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import '../styles/toast.css'

/**
 * FileUploadModal - Reusable modal for Excel/CSV file upload
 * Parses files and provides preview with validation
 * 
 * @param {boolean} isOpen - Modal visibility
 * @param {function} onClose - Close handler
 * @param {function} onSubmit - Submit handler with parsed data
 * @param {Array} requiredColumns - Required column names
 * @param {Array} optionalColumns - Optional column names
 * @param {string} title - Modal title
 */
const FileUploadModal = ({
    isOpen,
    onClose,
    onSubmit,
    requiredColumns = ['email', 'first_name', 'last_name', 'student_id', 'enrollment_year'],
    optionalColumns = [],
    title = 'Bulk Import Students',
    loading = false
}) => {
    const [file, setFile] = useState(null)
    const [parsedData, setParsedData] = useState([])
    const [errors, setErrors] = useState([])
    const [parseError, setParseError] = useState(null)
    const fileInputRef = useRef(null)

    const resetState = () => {
        setFile(null)
        setParsedData([])
        setErrors([])
        setParseError(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleClose = () => {
        resetState()
        onClose()
    }

    const validateRow = (row, index) => {
        const rowErrors = []
        requiredColumns.forEach(col => {
            if (!row[col] || String(row[col]).trim() === '') {
                rowErrors.push(`Row ${index + 1}: Missing required field "${col}"`)
            }
        })

        // Email validation
        if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
            rowErrors.push(`Row ${index + 1}: Invalid email format`)
        }

        return rowErrors
    }

    const normalizeColumnName = (name) => {
        return String(name).toLowerCase().trim().replace(/\s+/g, '_')
    }

    const parseFile = (file) => {
        const reader = new FileReader()

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result)
                const workbook = XLSX.read(data, { type: 'array', codepage: 65001 })

                // Get first sheet
                const sheetName = workbook.SheetNames[0]
                const worksheet = workbook.Sheets[sheetName]

                // Convert to JSON with header row
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

                if (jsonData.length === 0) {
                    setParseError('File is empty or has no data rows')
                    return
                }

                // Normalize column names
                const normalizedData = jsonData.map(row => {
                    const normalizedRow = {}
                    Object.keys(row).forEach(key => {
                        const normalizedKey = normalizeColumnName(key)
                        normalizedRow[normalizedKey] = row[key]
                    })
                    return normalizedRow
                })

                // Check for required columns
                const firstRow = normalizedData[0]
                const missingColumns = requiredColumns.filter(col => !(col in firstRow))

                if (missingColumns.length > 0) {
                    setParseError(`Missing required columns: ${missingColumns.join(', ')}`)
                    return
                }

                // Validate all rows
                const allErrors = []
                normalizedData.forEach((row, index) => {
                    const rowErrors = validateRow(row, index)
                    allErrors.push(...rowErrors)
                })

                setParsedData(normalizedData)
                setErrors(allErrors)
                setParseError(null)
            } catch (err) {
                console.error('Parse error:', err)
                setParseError('Failed to parse file. Please use a valid Excel or CSV file.')
            }
        }

        reader.onerror = () => {
            setParseError('Failed to read file')
        }

        reader.readAsArrayBuffer(file)
    }

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0]
        if (selectedFile) {
            setFile(selectedFile)
            parseFile(selectedFile)
        }
    }

    const handleSubmit = () => {
        if (parsedData.length > 0 && errors.length === 0) {
            // Extract only the columns we need
            const cleanedData = parsedData.map(row => {
                const cleanRow = {}
                requiredColumns.forEach(col => {
                    cleanRow[col] = String(row[col]).trim()
                })
                optionalColumns.forEach(col => {
                    if (row[col] !== undefined && row[col] !== '') {
                        cleanRow[col] = row[col]
                    }
                })
                return cleanRow
            })
            onSubmit(cleanedData)
        }
    }

    if (!isOpen) return null

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div
                className="modal-content"
                onClick={e => e.stopPropagation()}
                style={{ maxWidth: '800px', maxHeight: '80vh', overflow: 'auto' }}
            >
                <h3 className="modal-title">{title}</h3>

                {/* File Input */}
                <div className="form-group">
                    <label>Select Excel or CSV File:</label>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileChange}
                        style={{ marginTop: '8px' }}
                    />
                </div>

                {/* Required Columns Info */}
                <div style={{
                    background: '#e3f2fd',
                    padding: '12px',
                    borderRadius: '4px',
                    marginBottom: '16px',
                    fontSize: '0.875rem'
                }}>
                    <strong>Required columns:</strong> {requiredColumns.join(', ')}
                    {optionalColumns.length > 0 && (
                        <>
                            <br />
                            <strong>Optional columns:</strong> {optionalColumns.join(', ')}
                        </>
                    )}
                </div>

                {/* Parse Error */}
                {parseError && (
                    <div style={{
                        background: '#ffebee',
                        color: '#c62828',
                        padding: '12px',
                        borderRadius: '4px',
                        marginBottom: '16px'
                    }}>
                        {parseError}
                    </div>
                )}

                {/* Validation Errors */}
                {errors.length > 0 && (
                    <div style={{
                        background: '#fff3e0',
                        color: '#e65100',
                        padding: '12px',
                        borderRadius: '4px',
                        marginBottom: '16px',
                        maxHeight: '150px',
                        overflow: 'auto'
                    }}>
                        <strong>Validation Errors ({errors.length}):</strong>
                        <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
                            {errors.slice(0, 10).map((err, i) => (
                                <li key={i}>{err}</li>
                            ))}
                            {errors.length > 10 && <li>...and {errors.length - 10} more errors</li>}
                        </ul>
                    </div>
                )}

                {/* Preview Table */}
                {parsedData.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                        <h4 style={{ marginBottom: '8px' }}>
                            Preview ({parsedData.length} students)
                        </h4>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="table" style={{ fontSize: '0.875rem' }}>
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        {[...requiredColumns, ...optionalColumns].map(col => (
                                            <th key={col}>{col}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {parsedData.slice(0, 10).map((row, i) => (
                                        <tr key={i}>
                                            <td>{i + 1}</td>
                                            {[...requiredColumns, ...optionalColumns].map(col => (
                                                <td key={col}>{row[col] || '-'}</td>
                                            ))}
                                        </tr>
                                    ))}
                                    {parsedData.length > 10 && (
                                        <tr>
                                            <td colSpan={requiredColumns.length + optionalColumns.length + 1} style={{ textAlign: 'center', fontStyle: 'italic' }}>
                                                ...and {parsedData.length - 10} more rows
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="modal-actions">
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleClose}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleSubmit}
                        disabled={loading || parsedData.length === 0 || errors.length > 0}
                    >
                        {loading ? 'Importing...' : `Import ${parsedData.length} Students`}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default FileUploadModal
