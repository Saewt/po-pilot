import { useState, useEffect } from 'react'
import { loPoContributionsAPI } from '../../api/loPoContributions'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import DataTable from '../../components/DataTable'
import '../../styles/pages.css'

/**
 * DeptHead Approvals Page
 * Shows LO-PO contributions pending approval
 */
const DeptApprovals = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [contributions, setContributions] = useState([])

  useEffect(() => {
    loadContributions()
  }, [])

  const loadContributions = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await loPoContributionsAPI.list()
      // Filter for pending approvals
      const pendingList = (response.results || []).filter(c => !c.is_approved)

      // Fetch details for each pending contribution to get the full LO object
      // The list endpoint provides limited data
      const detailedPending = await Promise.all(
        pendingList.map(async (item) => {
          try {
            return await loPoContributionsAPI.get(item.id)
          } catch (e) {
            console.error(`Failed to fetch detail for ${item.id}`, e)
            return item // Fallback to list item if detail fetch fails
          }
        })
      )

      setContributions(detailedPending)
    } catch (err) {
      console.error('Failed to load contributions:', err)
      setError(err.response?.data?.detail || 'Failed to load contributions')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id) => {
    try {
      setLoading(true)
      setError(null)
      await loPoContributionsAPI.approve(id)
      await loadContributions()
      alert('Contribution approved successfully!')
    } catch (err) {
      console.error('Failed to approve:', err)
      setError(err.response?.data?.detail || 'Failed to approve contribution')
    } finally {
      setLoading(false)
    }
  }

  if (loading && contributions.length === 0) {
    return <LoadingState />
  }

  if (error) {
    return <ErrorState error={error} onRetry={loadContributions} />
  }

  const columns = [
    {
      header: 'Learning Outcome',
      accessor: 'learning_outcome',
      render: (row) => {
        // The detail endpoint returns 'learning_outcome' object
        const lo = row.learning_outcome
        if (!lo) return 'Loading...'
        return `${lo.full_code || lo.code}: ${lo.description}`
      }
    },
    {
      header: 'Program Outcome',
      accessor: 'program_outcome',
      render: (row) => {
        const po = row.program_outcome
        if (!po) return 'Loading...'
        // API returns 'full_code'
        return `${po.full_code || po.code}: ${po.description}`
      }
    },
    { header: 'Weight', accessor: 'weight' },
    {
      header: 'Status',
      accessor: 'is_approved',
      render: (row) => (
        row.is_approved ? (
          <span className="badge badge-approved">Approved</span>
        ) : (
          <span className="badge badge-pending">Pending</span>
        )
      )
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (row) => {
        if (row.is_approved) {
          return <span>Already approved</span>
        }
        return (
          <button
            onClick={() => handleApprove(row.id)}
            disabled={loading}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.875rem',
              backgroundColor: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            Approve
          </button>
        )
      }
    },
  ]

  return (
    <div className="page-container">
      <h1 className="page-title">LO-PO Contribution Approvals</h1>
      {contributions.length === 0 ? (
        <p className="text-secondary">No pending approvals</p>
      ) : (
        <DataTable columns={columns} data={contributions} />
      )}
    </div>
  )
}

export default DeptApprovals

