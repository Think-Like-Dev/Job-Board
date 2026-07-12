import { API_ENDPOINTS } from './endpoints.config';
import { mockJobs, mockUser, mockApplications } from './mockData';

// Simulated delay for realistic API feel
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Mock API Client to simulate fetch requests locally
export const apiClient = {
  async get(url: string) {
    await delay(600);
    
    // Simulate endpoints
    if (url === API_ENDPOINTS.AUTH.ME) {
      // Return mock user if we simulate logged in
      const isAuth = localStorage.getItem('mock_auth') === 'true';
      if (!isAuth) throw new Error('Unauthorized');
      return mockUser;
    }
    if (url === API_ENDPOINTS.JOBS.GET_ALL) {
      return mockJobs;
    }
    if (url.startsWith('/jobs/') && !url.includes('bookmark') && !url.includes('apply')) {
      const id = url.split('/')[2];
      const job = mockJobs.find(j => j.id === id);
      if (job) return job;
      throw new Error('Not found');
    }
    if (url === API_ENDPOINTS.APPLICATIONS.GET_ALL) {
      return mockApplications;
    }

    return {};
  },

  async post(url: string, data?: any) {
    await delay(800);

    if (url === API_ENDPOINTS.AUTH.LOGIN_OTP) {
      return { message: 'OTP sent' };
    }
    if (url === API_ENDPOINTS.AUTH.VERIFY_OTP) {
      if (data?.otp === '123456') { // Dummy check
        localStorage.setItem('mock_auth', 'true');
        return { user: mockUser };
      }
      throw new Error('Invalid OTP');
    }
    if (url === API_ENDPOINTS.AUTH.LOGOUT) {
      localStorage.removeItem('mock_auth');
      return { success: true };
    }

    return { success: true };
  },
};
