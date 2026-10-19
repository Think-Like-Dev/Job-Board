import MockAdapter from 'axios-mock-adapter';
import httpClient from './httpClient';
import { API_ENDPOINTS } from './endpoints.config';
import { mockJobs, mockUser, mockApplications } from './mockData';
import { ENV } from '../config/env.config';

// Only initialise the mock adapter if the environment variable is set
if (ENV.MOCK_API) {
  console.log('🔧 Mock API is enabled via VITE_MOCK_API');
  
  // Set a delay of 800ms for all requests to simulate network latency
  const mock = new MockAdapter(httpClient, { delayResponse: 800 });

  // ─── AUTH ─────────────────────────────────────────────────────────
  
  mock.onPost(API_ENDPOINTS.AUTH.LOGIN_OTP).reply(200, {
    message: 'OTP sent to email',
  });

  mock.onPost(API_ENDPOINTS.AUTH.VERIFY_OTP).reply((config) => {
    const data = JSON.parse(config.data);
    if (data.otp === '123456') {
      return [200, { user: mockUser }];
    }
    return [401, { message: 'Invalid OTP' }];
  });

  mock.onGet(API_ENDPOINTS.AUTH.ME).reply(() => {
    return [200, { user: mockUser }];
  });

  mock.onPost(API_ENDPOINTS.AUTH.LOGOUT).reply(200, {
    success: true,
  });

  // ─── JOBS ─────────────────────────────────────────────────────────

  mock.onGet(API_ENDPOINTS.JOBS.GET_ALL).reply(200, mockJobs);

  // Match /jobs/:id (must come after GET_ALL)
  const jobDetailRegex = new RegExp(`${API_ENDPOINTS.JOBS.GET_ALL}/([a-zA-Z0-9-]+)$`);
  mock.onGet(jobDetailRegex).reply((config) => {
    const match = config.url?.match(jobDetailRegex);
    const id = match ? match[1] : null;
    const job = mockJobs.find((j) => j.id === id);
    if (job) {
      return [200, job];
    }
    return [404, { message: 'Job not found' }];
  });

  // Match /jobs/:id/bookmark
  const bookmarkRegex = new RegExp(`${API_ENDPOINTS.JOBS.GET_ALL}/([a-zA-Z0-9-]+)/bookmark`);
  mock.onPost(bookmarkRegex).reply((config) => {
    const match = config.url?.match(bookmarkRegex);
    const id = match ? match[1] : null;
    const jobIndex = mockJobs.findIndex((j) => j.id === id);
    if (jobIndex > -1) {
      // Toggle bookmark status in mock data
      mockJobs[jobIndex].isBookmarked = !mockJobs[jobIndex].isBookmarked;
      return [200, { success: true, isBookmarked: mockJobs[jobIndex].isBookmarked }];
    }
    return [404, { message: 'Job not found' }];
  });

  // ─── APPLICATIONS ─────────────────────────────────────────────────

  mock.onGet(API_ENDPOINTS.APPLICATIONS.GET_ALL).reply(200, mockApplications);

  const applyRegex = new RegExp(`${API_ENDPOINTS.JOBS.GET_ALL}/([a-zA-Z0-9-]+)/apply`);
  mock.onPost(applyRegex).reply(200, {
    success: true,
    applicationId: 'new-app-id',
  });

  const respondOfferRegex = new RegExp(`${API_ENDPOINTS.APPLICATIONS.GET_ALL}/([a-zA-Z0-9-]+)/offer-response`);
  mock.onPost(respondOfferRegex).reply(200, {
    success: true,
  });

  // Pass through anything that isn't explicitly mocked
  mock.onAny().passThrough();
}
