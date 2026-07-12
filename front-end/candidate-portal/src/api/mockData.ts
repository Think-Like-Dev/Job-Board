export const mockJobs = [
  {
    id: '1',
    title: 'Senior Frontend Engineer',
    category: 'Engineering',
    location: 'Remote',
    experience: '5+ years',
    salaryRange: '$120,000 - $160,000',
    description: 'We are looking for a Senior Frontend Engineer to build robust web applications using React and TypeScript.',
    isBookmarked: false,
    postedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: '2',
    title: 'Product Designer',
    category: 'Design',
    location: 'New York, NY',
    experience: '3-5 years',
    salaryRange: '$90,000 - $130,000',
    description: 'Join our design team to create intuitive and beautiful user experiences.',
    isBookmarked: true,
    postedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: '3',
    title: 'Backend Developer',
    category: 'Engineering',
    location: 'San Francisco, CA (Hybrid)',
    experience: '2-4 years',
    salaryRange: '$100,000 - $140,000',
    description: 'Build scalable backend services using Node.js and PostgreSQL.',
    isBookmarked: false,
    postedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
];

export const mockUser = {
  id: 'user-123',
  email: 'candidate@example.com',
  firstName: 'John',
  lastName: 'Doe',
};

export const mockApplications = [
  {
    id: 'app-1',
    jobId: '1',
    jobTitle: 'Senior Frontend Engineer',
    status: 'Interview Scheduled',
    appliedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    details: {
      interviewRound: '1 of 4',
      scheduledAt: new Date(Date.now() + 86400000 * 2).toISOString(),
      mode: 'Online',
      location: 'Google Meet Link: https://meet.google.com/abc-defg-hij',
    }
  },
  {
    id: 'app-2',
    jobId: '2',
    jobTitle: 'Product Designer',
    status: 'Offer Extended',
    appliedAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    details: {
      offerExtendedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      offerDeadline: new Date(Date.now() + 86400000 * 3).toISOString(),
      offerLink: '#',
    }
  },
  {
    id: 'app-3',
    jobId: '3',
    jobTitle: 'Backend Developer',
    status: 'Rejected',
    appliedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    details: {
      reason: 'We decided to move forward with a candidate who had more extensive experience in our specific tech stack.',
    }
  }
];
