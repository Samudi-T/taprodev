import api from './api';

/**
 * Dispatches an AI-generated native SQL query string to the secure Spring Boot execution controller route.
 * @param {string} sqlString - Generated read-only standard SQL select query string statement.
 * @returns {Promise<Array>} - Structured JSON representation database payload records array.
 */
export const executeAgentQuery = async (sqlString) => {
  try {
    const response = await api.post('/admin/ai/query', { sqlQuery: sqlString });
    return response.data;
  } catch (error) {
    // Gracefully format exception statements bubbling back from security filters
    const backendErrorMessage = error.response?.data || error.message;
    console.error("Agent data execution pipeline failure:", backendErrorMessage);
    throw new Error(backendErrorMessage);
  }
};