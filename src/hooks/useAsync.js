import { useState, useCallback, useEffect } from 'react'

/**
 * useAsync Hook
 * Reusable hook for handling async data fetching with loading, error, and retry states
 * 
 * @param {Function} asyncFunction - The async function to execute
 * @param {Array} dependencies - Dependencies array (like useEffect dependencies)
 * @param {boolean} immediate - Whether to execute immediately on mount (default: true)
 * @returns {Object} { data, loading, error, execute, reset }
 */
export const useAsync = (asyncFunction, dependencies = [], immediate = true) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(immediate)
  const [error, setError] = useState(null)

  const execute = useCallback(async (...args) => {
    try {
      setLoading(true)
      setError(null)
      const result = await asyncFunction(...args)
      setData(result)
      return { success: true, data: result }
    } catch (err) {
      console.error('Async operation failed:', err)
      const errorMessage = err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        'An error occurred. Please try again.'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, dependencies)

  // Execute on mount and when dependencies change if immediate is true
  useEffect(() => {
    if (immediate) {
      execute()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate, ...dependencies])

  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setLoading(false)
  }, [])

  return { data, loading, error, execute, reset }
}

/**
 * useMultipleAsync Hook
 * Handles multiple parallel async operations
 * 
 * @param {Object} asyncFunctions - Object with keys as data names and values as async functions
 * @param {Array} dependencies - Dependencies array
 * @param {boolean} immediate - Whether to execute immediately on mount (default: true)
 * @returns {Object} { data, loading, error, refetch, reset }
 * 
 * Example:
 * const { data, loading, error, refetch } = useMultipleAsync({
 *   courses: () => coursesAPI.listInstances(),
 *   grades: () => gradesAPI.list()
 * })
 * // data.courses, data.grades
 */
export const useMultipleAsync = (asyncFunctions, dependencies = [], immediate = true) => {
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(immediate)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Execute all async functions in parallel
      const keys = Object.keys(asyncFunctions)
      const promises = keys.map(key => asyncFunctions[key]())
      const results = await Promise.all(promises)

      // Combine results into object with original keys
      const combinedData = {}
      keys.forEach((key, index) => {
        combinedData[key] = results[index]
      })

      setData(combinedData)
      return { success: true, data: combinedData }
    } catch (err) {
      console.error('Multiple async operations failed:', err)
      const errorMessage = err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        'Failed to load data. Please try again.'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
    // Note: asyncFunctions intentionally not in deps - it's expected to be recreated
    // Dependencies array should contain values that the functions depend on
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies)

  // Execute on mount and when dependencies change if immediate is true
  useEffect(() => {
    if (immediate) {
      refetch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate, ...dependencies])

  const reset = useCallback(() => {
    setData({})
    setError(null)
    setLoading(false)
  }, [])

  return { data, loading, error, refetch, reset }
}

