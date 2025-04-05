// API Configuration

// You can switch between environments by changing this value
const environment = 'development'; // 'development' or 'production'

// Configuration for different environments
const API_CONFIG = {
  development: {
    API_URL: 'http://192.168.210.201:5000', // Your local IP address
  },
  production: {
    API_URL: 'https://your-production-backend-url.com', // Replace with your production URL
  }
};

// Export the configuration based on current environment
export const API_URL = API_CONFIG[environment].API_URL;

// Helper function for API requests
export const fetchApi = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;
  
  // Default headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // If we have a token in storage, add it to the headers
  const token = await getToken(); // You'll need to implement this function
  if (token) {
    headers['Authorization'] = token;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    return { data, status: response.status };
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Helper function to get the stored token (implement this)
const getToken = async () => {
  // Implementation will depend on how you store your token
  // For example, using AsyncStorage:
  // return AsyncStorage.getItem('userToken');
  return null;
};
