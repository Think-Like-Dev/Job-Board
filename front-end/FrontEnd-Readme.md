# JobBoard FrontEnd
  The front end is split into two directories , with respect to candidate and recruiter. Usually the relevant UI can be shown by verifying the role of logged in user. But for the practive of managing multi container application and deployments we are having this overhead of managing two separate applications.

This Project uses following tools and tech stack
  - React with Typescript
  - Vite
  - TailwindCss with ShadCN UI
  - React router
  - Redux with Redux Toolkit for global app state management
  - TanstackQuery for api and cacheing management
  - Recharts for data visualization for recruiter dashboard
  - Zod for schema validation , react-hook-forms for form management



 - [candidate-portal](./candidate-portal/CandidatePortal-Readme.md)
 - [recruiter-platform](./recruiter-platform/RecruiterPlatform-Readme.md)