import api from './api';

/**
 * Submits user login credentials to generate a secure session token.
 * @param {Object} credentials - Contains email and password keys.
 */
export const login = async (credentials) => {
  try {
    const loginData = {
      email: credentials.email,
      password: credentials.password
    };
    
    const response = await api.post('/auth/login', loginData);
    return response.data;
  } catch (error) {
    console.error("AuthService Login Exception:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Registers a new account profile structure in the system database.
 * @param {Object} userData - Contains signup specifications.
 */
export const register = async (userData) => {
  try {
    const response = await api.post('/auth/register', userData);
    return response.data;
  } catch (error) {
    console.error("AuthService Registration Exception:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Retrieves profile context metadata parameters for the currently logged-in user.
 */
export const getUserProfile = async () => {
  try {
    const response = await api.get('/auth/profile');
    return response.data;
  } catch (error) {
    console.error("AuthService Profile Fetch Exception:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * Destroys token validation state parameters to cleanly sign out the client session.
 */
export const logout = async () => {
  try {
    await api.post('/auth/logout');
    return { success: true };
  } catch (error) {
    console.error("AuthService Logout Error:", error.response?.data || error.message);
    return { success: false, error };
  }
};

/**
 * Fetches the paginated or complete user table directory listing from the administration endpoint.
 * Aligns your frontend's 1-indexed pagination with Spring Boot's 0-indexed Pageable requirements.
 * @param {Object} params - Contains page indices, sizes, or query strings.
 */
export const getAllUsers = async (params = {}) => {
  try {
    const formattedParams = {
      ...params,
      page: params.page ? params.page - 1 : 0, // Convert to 0-indexed for Spring PageRequest
      size: params.pageSize || 10
    };

    // Corrected target path endpoint base vector pointing to your UserManagementController routing context
    const response = await api.get('/admin/users', { params: formattedParams });
    return response.data; 
  } catch (error) {
    console.error("AuthService Directory Listing Exception:", {
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    });
    return { content: [], totalElements: 0, totalPages: 1 };
  }
};

/**
 * Leverages the backend administration stats endpoint to pull user aggregation summaries 
 * rather than loading entire user lists into client arrays.
 */
export const getCustomerCount = async () => {
  try {
    // Queries your UserManagementController.getUserStats() mapping
    const response = await api.get('/admin/users/stats');
    
    // Maps dynamically to the returned UserStatsResponse data object properties
    return response.data?.customerCount ?? response.data?.totalCustomers ?? 0;
  } catch (error) {
    console.warn("Stats aggregator failed, processing list fallback scan array...", error.message);
    
    // Fallback: Fetch page content to approximate value safely if stats endpoint throws an exception
    const usersData = await getAllUsers({ page: 1, pageSize: 100 });
    const users = usersData?.content || [];
    
    return users.filter(user => {
      if (!user) return false;
      const roleStr = typeof user.role === 'string' ? user.role : user.roles?.[0] || '';
      return ['CUSTOMER', 'USER'].includes(roleStr.toUpperCase());
    }).length;
  }
};

/**
 * Evaluates structural permission scopes on user nodes to extract account types safely.
 * Handles both classic array string elements, single entities, and boolean parameters.
 */
export const isCustomerUser = (user) => {
  if (!user) return false;
  
  let isCustomer = false;
  
  if (Array.isArray(user.roles)) {
    isCustomer = user.roles.some(role => 
      typeof role === 'string' ? 
        ['CUSTOMER', 'USER', 'customer', 'user'].includes(role.toUpperCase()) : 
        (role && typeof role === 'object' && role.name && ['CUSTOMER', 'USER'].includes(role.name.toUpperCase()))
    );
  } 
  else if (typeof user.roles === 'string') {
    const rolesArray = user.roles.split(',').map(r => r.trim().toUpperCase());
    isCustomer = rolesArray.some(role => ['CUSTOMER', 'USER'].includes(role));
  }
  else if (typeof user.role === 'string') {
    isCustomer = ['CUSTOMER', 'USER', 'customer', 'user'].includes(user.role.toUpperCase());
  }
  
  if (!isCustomer && typeof user.isCustomer === 'boolean') {
    isCustomer = user.isCustomer;
  }
  
  let isActive = false;
  
  if (typeof user.status === 'string') {
    isActive = ['ACTIVE', 'active', 'ENABLED', 'enabled', 'true'].includes(user.status.toLowerCase());
  } 
  else if (typeof user.active === 'boolean') {
    isActive = user.active;
  }
  else if (typeof user.enabled === 'boolean') {
    isActive = user.enabled;
  }
  
  if (user && Object.keys(user).length > 0 && isCustomer && isActive === false && 
      user.status === undefined && user.active === undefined && user.enabled === undefined) {
    isActive = true;
  }
  
  return isCustomer && isActive;
};