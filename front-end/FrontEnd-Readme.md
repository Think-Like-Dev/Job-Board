# JobBoard FrontEnd
  The front end is split into two directories , with respect to candidate and recruiter. Usually the relevant UI can be shown by verifying the role of logged in user. But for the practice of managing multi container application and deployments we are having this overhead of managing two separate applications.

This Project uses following tools and tech stack
  - React with Typescript
  - Vite
  - TailwindCss with ShadCN UI
  - React router
  - Redux with Redux Toolkit for global app state management
  - TanstackQuery for api and caching management
  - i18next / react-i18next for internationalization
  - Recharts for data visualization for recruiter dashboard (planned)
  - Zod for schema validation , react-hook-forms for form management


## list of services
 - [candidate-portal](./candidate-portal/CandidatePortal-Readme.md) - candidate portal front end for job application
 - [recruiter-platform](./recruiter-platform/RecruiterPlatform-Readme.md) - recruiter portal for posting job and manage operations like candidates , their applications , interviews and more.