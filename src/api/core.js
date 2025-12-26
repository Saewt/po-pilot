import apiClient from './client'

/**
 * Core API functions (Departments, Program Outcomes, LO-PO Contributions)
 * All endpoints use relative paths (/api/...) for deploy-ready setup
 */

export const coreAPI = {
  /**
   * Get list of departments
   * Read: All authenticated users
   */
  listDepartments: async () => {
    const response = await apiClient.get('/departments/')
    return response.data
  },

  /**
   * Get single department by ID
   */
  getDepartment: async (id) => {
    const response = await apiClient.get(`/departments/${id}/`)
    return response.data
  },

  /**
   * Get list of program outcomes
   * Read: All authenticated users
   */
  listProgramOutcomes: async () => {
    const response = await apiClient.get('/program-outcomes/')
    return response.data
  },

  /**
   * Get program outcomes for a specific department
   */
  getProgramOutcomesByDepartment: async (departmentId) => {
    const response = await apiClient.get('/program-outcomes/', {
      params: { department: departmentId }
    })
    return response.data
  },

  /**
   * Get single program outcome by ID
   */
  getProgramOutcome: async (id) => {
    const response = await apiClient.get(`/program-outcomes/${id}/`)
    return response.data
  },

  /**
   * Create a new program outcome (Department Heads/Admins only)
   */
  createProgramOutcome: async (data) => {
    const response = await apiClient.post('/program-outcomes/', data)
    return response.data
  },

  /**
   * Update a program outcome (Department Heads/Admins only)
   */
  updateProgramOutcome: async (id, data) => {
    const response = await apiClient.patch(`/program-outcomes/${id}/`, data)
    return response.data
  },

  /**
   * Get list of LO-PO contributions
   * Read: All authenticated users
   */
  listLOToPOContributions: async () => {
    const response = await apiClient.get('/lo-po-contributions/')
    return response.data
  },

  /**
   * Get LO-PO contributions for a specific learning outcome
   */
  getContributionsByLearningOutcome: async (learningOutcomeId) => {
    const response = await apiClient.get('/lo-po-contributions/', {
      params: { learning_outcome: learningOutcomeId }
    })
    return response.data
  },

  /**
   * Get LO-PO contributions for a specific program outcome
   */
  getContributionsByProgramOutcome: async (programOutcomeId) => {
    const response = await apiClient.get('/lo-po-contributions/', {
      params: { program_outcome: programOutcomeId }
    })
    return response.data
  },

  /**
   * Get single LO-PO contribution by ID
   */
  getContribution: async (id) => {
    const response = await apiClient.get(`/lo-po-contributions/${id}/`)
    return response.data
  },

  /**
   * Create a new LO-PO contribution
   */
  createContribution: async (data) => {
    const response = await apiClient.post('/lo-po-contributions/', data)
    return response.data
  },

  /**
   * Update a LO-PO contribution (approve/reject - Department Heads only)
   */
  updateContribution: async (id, data) => {
    const response = await apiClient.patch(`/lo-po-contributions/${id}/`, data)
    return response.data
  },

  /**
   * Approve a LO-PO contribution (Department Heads only)
   * Uses the dedicated approve action endpoint: POST /api/lo-po-contributions/{id}/approve/
   */
  approveContribution: async (id) => {
    const response = await apiClient.post(`/lo-po-contributions/${id}/approve/`)
    return response.data
  },
}

