/**
 * Pagination utilities
 * Handles DRF pagination format: {count, next, previous, results}
 */

/**
 * Fetch all pages of a paginated endpoint
 * @param {Function} fetchFn - Function that accepts page param and returns paginated response
 * @returns {Promise<Array>} All items from all pages
 */
export const fetchAllPages = async (fetchFn) => {
  const allItems = []
  let page = 1
  let hasNext = true

  while (hasNext) {
    const response = await fetchFn({ page })
    const { results, next } = response

    if (results && Array.isArray(results)) {
      allItems.push(...results)
    }

    hasNext = !!next
    page++
  }

  return allItems
}

/**
 * Extract pagination metadata from response
 * @param {Object} response - Paginated response
 * @returns {Object} Pagination metadata
 */
export const getPaginationMeta = (response) => {
  if (!response) return null

  return {
    count: response.count || 0,
    next: response.next,
    previous: response.previous,
    hasNext: !!response.next,
    hasPrevious: !!response.previous,
  }
}


