import { useState } from 'react'
import './CsvUpload.css'

/**
 * CsvUpload Component
 * Simple CSV file upload with parsing
 */
const CsvUpload = ({ onUpload, onParse }) => {
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
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header and one data row')
    }

    const headers = lines[0].split(',').map(h => h.trim())
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim())
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
          
          setError(null)
        } catch (err) {
          setError(err.message || 'Failed to parse CSV')
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
          accept=".csv"
          onChange={handleFileChange}
          className="csv-input"
        />
      </div>
      {file && (
        <button
          onClick={handleUpload}
          className="btn btn-primary"
        >
          Upload & Parse CSV
        </button>
      )}
      {error && (
        <div className="csv-error">{error}</div>
      )}
    </div>
  )
}

export default CsvUpload
