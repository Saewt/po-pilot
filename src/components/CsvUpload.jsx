import { useState } from 'react'
import './CsvUpload.css'

/**
 * CsvUpload Component
 * Simple CSV/Excel file upload with parsing
 */
const CsvUpload = ({ onUpload, onParse, disabled }) => {
  const [file, setFile] = useState(null)
  const [error, setError] = useState(null)

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)
    }
  }

  const parseCSV = (text) => {
    // Handle both comma and semicolon as delimiter
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length < 2) {
      throw new Error('File must have at least a header and one data row')
    }

    // Detect delimiter (comma or semicolon)
    const delimiter = lines[0].includes(';') ? ';' : ','

    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''))
    const rows = lines.slice(1).map(line => {
      const values = line.split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ''))
      const row = {}
      headers.forEach((header, idx) => {
        row[header] = values[idx] || ''
      })
      return row
    })

    return { headers, rows }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file')
      return
    }

    try {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const text = e.target.result
          const parsed = parseCSV(text)

          if (onParse) {
            onParse(parsed)
          }

          if (onUpload) {
            onUpload(parsed.rows)
          }

          setFile(null)
          setError(null)
        } catch (err) {
          setError(err.message || 'Failed to parse file')
        }
      }
      reader.onerror = () => {
        setError('Failed to read file')
      }
      reader.readAsText(file)
    } catch (err) {
      setError(err.message || 'Upload failed')
    }
  }

  return (
    <div className="csv-upload">
      <div className="form-group">
        <input
          type="file"
          accept=".csv,.txt"
          onChange={handleFileChange}
          className="csv-input"
          disabled={disabled}
          style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
        />
      </div>
      {file && (
        <button
          onClick={handleUpload}
          className="btn btn-primary"
          disabled={disabled}
        >
          Upload & Parse
        </button>
      )}
      {error && (
        <div className="csv-error">{error}</div>
      )}
    </div>
  )
}

export default CsvUpload
