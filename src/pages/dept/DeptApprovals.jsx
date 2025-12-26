import { useState, useEffect } from 'react'
import { loPoContributionsAPI } from '../../api/loPoContributions'
import { useToast } from '../../context/ToastContext'
import LoadingState from '../../components/LoadingState'
import ErrorState from '../../components/ErrorState'
import DataTable from '../../components/DataTable'
import ConfirmationModal from '../../components/ConfirmationModal'
import '../../styles/pages.css'

const DeptApprovals = () => {
  const { addToast } = useToast()
  const [activeTab, setActiveTab] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [contributions, setContributions] = useState([])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [itemToDecline, setItemToDecline] = useState(null)
  const [declineReason, setDeclineReason] = useState('')

  useEffect(() => {
    loadContributions()
  }, [activeTab])

  const loadContributions = async () => {
    try {
      setLoading(true)
      setError(null)
      let response
      if (activeTab === 'pending') {
        response = await loPoContributionsAPI.list({ approval_status: 'PENDING' })
      } else {
        response = await loPoContributionsAPI.getDeclined()
      }
      
      const list = Array.isArray(response) ? response : (response.results || [])

      const detailedList = await Promise.all(
        list.map(async (item) => {
          try {
            if (item.learning_outcome && typeof item.learning_outcome === 'object') {
                return item
            }
            return await loPoContributionsAPI.get(item.id)
          } catch (e) {
            console.error(`Failed to fetch detail for ${item.id}`, e)
            return item
          }
        })
      )

      setContributions(detailedList)
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
      addToast('Contribution approved successfully!', 'success')
    } catch (err) {
      console.error('Failed to approve:', err)
      setError(err.response?.data?.detail || 'Failed to approve contribution')
      addToast('Failed to approve contribution', 'error')
    } finally {
      setLoading(false)
    }
  }

  const openDeclineModal = (item) => {
    setItemToDecline(item)
    setDeclineReason('')
    setIsModalOpen(true)
  }

  const confirmDecline = async () => {
    if (!itemToDecline) return
    if (!declineReason.trim()) {
      addToast('Reason is required for declining.', 'error')
      return
    }

    try {
      setLoading(true)
      setError(null)
      await loPoContributionsAPI.decline(itemToDecline.id, declineReason)
      await loadContributions()
      addToast('Contribution declined successfully!', 'success')
      setIsModalOpen(false)
      setItemToDecline(null)
      setDeclineReason('')
    } catch (err) {
      console.error('Failed to decline:', err)
      const errorData = err.response?.data
      const errorMessage = errorData?.reason ? errorData.reason[0] : (errorData?.detail || 'Failed to decline contribution')
      
      setError(errorMessage)
      addToast(errorMessage, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleResetToPending = async (id) => {
    try {
        setLoading(true)
        await loPoContributionsAPI.resetToPending(id)
        await loadContributions()
        addToast('Contribution reset to pending status.', 'success')
    } catch (err) {
        console.error('Failed to reset:', err)
        addToast('Failed to reset contribution', 'error')
    } finally {
        setLoading(false)
    }
  }

  if (error) {
    return <ErrorState error={error} onRetry={loadContributions} />
  }

  const columns = [
    {
      header: 'Learning Outcome',
      accessor: 'learning_outcome',
      render: (row) => {
        const lo = row.learning_outcome
        if (!lo) return 'Loading...'
        return (
            <div>
                <div style={{fontWeight: 600}}>{lo.full_code || lo.code}</div>
                <div style={{fontSize: '0.9rem', color: '#666'}}>{lo.description}</div>
            </div>
        )
      }
    },
    {
      header: 'Program Outcome',
      accessor: 'program_outcome',
      render: (row) => {
        const po = row.program_outcome
        if (!po) return 'Loading...'
        return (
            <div>
                <div style={{fontWeight: 600}}>{po.full_code || po.code}</div>
                <div style={{fontSize: '0.9rem', color: '#666'}}>{po.description}</div>
            </div>
        )
      }
    },
    { header: 'Weight', accessor: 'weight' },
    {
      header: 'Status',
      accessor: 'approval_status',
      render: (row) => {
        if (row.approval_status === 'APPROVED') {
          return <span className="badge badge-approved">Approved</span>
        } else if (row.approval_status === 'DECLINED') {
          return <span className="badge badge-error">Declined</span>
        } else {
          return <span className="badge badge-pending">Pending</span>
        }
      }
    },
  ]

  if (activeTab === 'declined') {
      columns.push({
          header: 'Reason',
          accessor: 'decline_reason',
          render: (row) => <span style={{fontStyle: 'italic', color: '#d32f2f'}}>{row.decline_reason || 'No reason provided'}</span>
      })
      columns.push({
          header: 'Date',
          accessor: 'approved_at',
          render: (row) => row.approved_at ? new Date(row.approved_at).toLocaleDateString() : '-'
      })
  }

  columns.push({
      header: 'Actions',
      accessor: 'id',
      render: (row) => {
        if (activeTab === 'declined') {
            return (
                <button
                    onClick={() => handleResetToPending(row.id)}
                    disabled={loading}
                    className="btn btn-secondary btn-sm"
                >
                    Reconsider
                </button>
            )
        }

        if (row.approval_status !== 'PENDING') {
          return <span>{row.approval_status}</span>
        }
        return (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
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
            <button
              onClick={() => openDeclineModal(row)}
              disabled={loading}
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.875rem',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              Decline
            </button>
          </div>
        )
      }
    })

  const renderDeclineModalContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <p>Are you sure you want to decline this contribution? This action cannot be undone.</p>
      <div className="form-group">
        <label htmlFor="declineReason" style={{ fontWeight: 500 }}>Reason for declining <span style={{color: 'red'}}>*</span></label>
        <textarea
          id="declineReason"
          className="form-control"
          rows="3"
          value={declineReason}
          onChange={(e) => setDeclineReason(e.target.value)}
          placeholder="Please provide a reason..."
          style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
        />
      </div>
    </div>
  )

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{margin: 0}}>LO-PO Contribution Approvals</h1>
        
        <div style={{ display: 'flex', background: '#e0e0e0', borderRadius: '8px', padding: '4px' }}>
            <button 
                onClick={() => setActiveTab('pending')}
                style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: activeTab === 'pending' ? '#fff' : 'transparent',
                    boxShadow: activeTab === 'pending' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    fontWeight: activeTab === 'pending' ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                }}
            >
                Pending
            </button>
            <button 
                onClick={() => setActiveTab('declined')}
                style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: activeTab === 'declined' ? '#fff' : 'transparent',
                    boxShadow: activeTab === 'declined' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    fontWeight: activeTab === 'declined' ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                }}
            >
                Declined History
            </button>
        </div>
      </div>

      {loading && contributions.length === 0 ? (
        <LoadingState />
      ) : contributions.length === 0 ? (
        <div className="empty-state" style={{ padding: '3rem', textAlign: 'center', background: '#f9f9f9', borderRadius: '8px' }}>
            <p className="text-secondary">
                {activeTab === 'pending' ? 'No pending approvals at the moment.' : 'No declined contributions found.'}
            </p>
        </div>
      ) : (
        <DataTable columns={columns} data={contributions} />
      )}

      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={confirmDecline}
        title="Decline Contribution"
        message={renderDeclineModalContent()}
        confirmText="Decline"
        confirmVariant="danger"
        disabled={!declineReason.trim()}
      />
    </div>
  )
}

export default DeptApprovals
