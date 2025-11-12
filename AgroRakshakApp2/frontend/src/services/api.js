import axios from 'axios';

const API_BASE_URL = 'https://josna1234567-agrobackend.hf.space';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

export const detectDisease = async (imageFile) => {
  try {
    const formData = new FormData();
    formData.append('file', imageFile);
    
    const response = await api.post('/api/detect', formData);
    return response.data;
  } catch (error) {
    console.error('Detection API error:', error);
    throw error;
  }
};

export const healthCheck = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    console.error('Health check failed:', error);
    throw error;
  }
};

export default api;
