# Candidate Portal

The Candidate Portal is the frontend application that enables job seekers to search for opportunities, submit applications, manage their profiles, and track the recruitment process from application to offer.

## Features
- Candidates can see the available jobs in an organization with advanced filters such as:-
    
  * Job Title / Designation
  * Job Category / Department
  * Location
  * Years of Experience
  * Salary Range (when available)
  * Additional custom filters
- Candidates can apply for the jobs by viewing the detailed Job Description.
- Track application status in real time.
- View interview schedules and join online interviews when applicable.

## Project structure

```
    src/ 
    ├── api/ 
    ├── assets/ 
    ├── components/ 
    ├── pages/ 
    ├── routes/ 
    ├── store/ 
    │   ├── redux/ 
    │   └── slices/ 
    └── utils/
```

## Screens

### Landing Dashboard

 The landing dashboard serves as the primary job discovery page.

- Desktop Experience
    - Hero section occupies approximately 70% of the viewport height.
        - Hero section supports either:
            - Company cover image
            - Image carousel
    - A global search bar appears immediately below the hero section.
    - The page layout consists of
        - 10% left and right empty space margins, wrapping the filter and job list cards
        - 25% width left sidebar containing search filters.
        - 65% width right section containing a paginated list of job cards.
        - Job cards are list of horizontal wide cards that support pagination to reduce API load.
        - Job cards will be having empty bookmark icon to indicate save for later and filled bookmark icon when clicked to indicate saved state.
        - Skeleton loading animations are displayed while data is being fetched.        
- Mobile Experience
    - Hero image occupies approximately 40% of the viewport height.
    - Search bar is displayed below the hero image.
    - Filters are presented in a mobile-friendly drawer or modal.
    - Job listings appear beneath the search bar.

### Search Filters

  - job_title
  - job_category
  - location
  - years_of_experience
  - salary_range

### Authentication

**Login**

The navigation bar displays:
- Profile menu (when authenticated)
- Login / Signup button (when unauthenticated)

Clicking Login / Signup opens an authentication modal with the following options:
- Continue with Google
- Continue with LinkedIn
- Continue using Email

Email authentication requires OTP verification for both registration and login.

Authenticated users are allowed to see private menus such as the profile menu by checking the session cookie. We are **not using JWT tokens**. Authentication is **stateful**: the cookie carries only an opaque session token, while the authoritative session payload (principal, email, role, expiry) is stored in **Redis** with a TTL. All API requests must be sent with credentials so the cookie is included.
**Profile Menu**

Authenticated users can access:
- Profile
- My Applications
- Logout

Logout clears the current session and redirects the user to the landing page.

**After New Signup**
After successful registration, the candidate is redirected to the Profile page to complete their profile.

1. Basic Personal Info , Adress , Contact Details
2. Profile Picture (max size 1MB , passport size dimension , need to enforce in frontend ) and resume upload  (pdf or docx - 2mb max) or Linkedin sync button. LinkedIn synchronization should automatically populate available profile information.
3. Educational history
    <ol type="a">
    <li> Educational qualifications will be in a different borderless table like layout</li>
    <li> Add / Edit / Delete buttons will be available in the table like rows</li>
    <li> For add and edit modal shall show up.. The following fields shall be available:

            - Instituition name
            - Degree 
            - Field of study
            - Start Date
            - End Date
            - Grade (optional)
            - GPA (optional)
            - Additional details (optional)
    </li>
    </ol>
4. Job experience (Optional)
    <ol type="a">
    <li> Job experience will be in a different borderless table like layout</li>
    <li> Add / Edit / Delete buttons will be available in the table like rows.</li>
    <li> For add and edit modal shall show up. The following fields shall be available:

        * Company name
        * Job title
        * Start Date
        * End Date
        * Salary (optional)
        * Additional details (optional)
    </li>
    </ol>
5. Skills and certifications
6. Portfolio and Social links


### Job Details Page

Selecting a job card opens a **full-screen slide-up drawer** displaying the complete job description.

**Job Actions**
1. The _Apply Now_ button is displayed beside the job title.
    If the candidate has already applied:
    - Button text changes to **Applied**
    - Button remains disabled
2. Save for later icon appears once again in the job detail to indicate bookmark state and allowing to edit bookmark state of job.
3. Job Cards and job detail will have share option to share the job link. (So clicking on every job card should update the browser url with specificjob id , even though it is rendered in a modal.)
4. Each job card will have share url button

**Applying for a Job**

- Unauthenticated Users :- Selecting **Apply Now** opens the Login / Signup modal.
- Authenticated Users :- Selecting **Apply Now** opens a multi-step application workflow.
    1. Resume Submission
        * Upload latest resume(pdf or docx - 2mb max)
        * Optional cover letter(pdf or docx - 1mb max)
    2. Candidate Profile review and edit 
        Just invoke the profile filling step component form here used right after onboarding.
        The candidate reviews the same profile created during onboarding.
        * Optional LinkedIn synchronization
        * Previously completed fields are displayed as read-only.
        * Each section includes an **Edit** option.
        * Saving updates automatically synchronizes changes with the master profile.
    3. Job specific Recruiter Questions
        If the recruiter has configured application questions, These questions are rendered dynamically when a candidate applies.
        Example Questions like:
        * Visa sponsorship requirements
        * Disability declaration
        * Notice period
        * Additional recruiter-specific questions.
        
        The application form supports multiple field types, including (but not limited to):

        * Short Text
        * Long Text (Text Area)
        * Radio Buttons
        * Checkboxes
        * Dropdown Lists
        * Date Picker
        * Number Input
        * File Upload (optional)
        * Email
        * Phone Number

        Each question includes its own configuration, such as:

        * Field type
        * Label
        * Required/Optional
        * Validation rules
        * Available options (for radio buttons, checkboxes, and dropdowns)
        * Default value (optional)

        This feature is conceptually similar to Google Forms, where recruiters design the application form by selecting field types and defining the expected responses. The Candidate Portal dynamically renders the corresponding input components based on the configuration received from the backend.

        This step is skipped if no questions are configured.
    4. Declaration (Final Step)
        
        The candidate accepts the declaration and submits the application.
        After successful submission:
        * The application modal closes.
        * The **Apply Now** button changes to **Applied**.
        * The button becomes disabled.

    5. Candidates are also allowed to do draft submissions, so that they can apply later by visiting "my applications" page. During this process the status will be show as **Draft**.

### My Applications

This page shows two tabs - 
- **BookMarks tab**- Shows list of jobs which are bookmarked by the user. It shall be a list of job cards , each card showing the job title and bookmark state. Clicking on bookmark shall remove the bookmark and the job card shall disappear from the list.
- **Applications tab** - This tab shall show all the applications submitted by the user. It shall be a list of job cards , each card showing the job title and application status. The status shall be one of the following
    1. Applied
    2. In Review
    3. Interview Scheduled (on the card itself we will have the interview round number and scheduled datetime)
    4. Offer Extended
    5. Offer Accepted
    6. Offer Rejected 
    7. Withdrawn
    8. Rejected

Clicking on the card will once again show the detailed JD in a full screen canvas modal, along with the answers provided at the time of job application.  
Just below the Job title we show a card with current status of the application with below reasons:

1. Rejected - will show along with reason for rejection.
2. Offer Extended - will show offer letter download link along with date when offer was extended and candidate should accept or reject the offer within the given deadline.
3. Offer Accepted - will show offer letter download link along with date when offer was accepted.
4. Offer Rejected - will show along with reason for rejection and date when offer was rejected.
    a. declined by the candidate itself 
    b. other recruiter provided reason or anything.
5. Withdrawn - will show just datetime when the application was withdrawn.
6. In Review - will just show the date and time when the application was put under review.
7. Interview Scheduled - will show following details
    1. Interview Round Number out of maximum like (1 of 4)
    2. date and time of schedule
    3. Mode of interview (In person , Online , Phone call)
    4. Location address and map link (only for in person ) or interview meet link (for online) or just the name of the interviewer (for phone call)
8. Applied - will just show the date and time of application

### Additional Job application status flow constraints
 1. Once an application is submitted it cannot be moved back to draft.
 2. Candidates can withdraw the application before its status is changed to "In Review".
 3. Once the status reaches "Offer Extended" , Candidates should be able to either
    - accept the offer within given deadline (have accept offer button and upload acceptance letter)
    - reject the offer within given deadline (reject with reason mandatory)
    - if no action taken it will be marked as  "Auto Rejected" with reason as "no response" - this "Auto Reject" is set only by the system for quicker identification, but it should have the same effect as rejected.

## Notifications

- Display a notification bell with an unread badge next to the profile dropdown, visible only when the user is logged in.
- Use **Server-Sent Events (SSE)** to fetch notifications. The client opens `EventSource` with `withCredentials: true`, so the browser sends the HttpOnly session cookie; the backend resolves it against the Redis session store. Do not try to read the session token in JavaScript.
- Open an SSE connection every **5 minutes**, receive the latest notifications, then close the connection once all events are received.
- Notifications represent **application status updates**.
- Allow users to:
  - Mark individual notifications as **read** or **unread**.
  - **Mark all** notifications as read.
  - **Clear read** notifications only.
  - **Clear all** notifications, including unread ones.

## UI enhancements
- Show toast notifications at appropriate places for success or failed api calls
- In form pages mandatory fields are marked with red asterisk
- When trying to submit or move to next page of form without filling mandatory field , appropriate error is shown beside the field and also toast notifcation is shown.
- Apply/Save/Submit/Apply for job and any other button should show loading spinner and disabled state until the api call is completed.
- Responsive layouts supporting desktop, mobile and tablet experiences.

## Code Constraints

- Use **TypeScript** with strict typing. Every function, component, variable, parameter, and return type must be typed. Use `interface` for props, state, and API payloads, and `type`, unions, generics(T), or derived types whereever appropriate.
- Use **enums** for application-wide constants (e.g., status, roles, permissions). Avoid hardcoded constant strings.
- Place reusable types in the `types/` folder. Define component-specific types locally unless they are shared and not used multiple times.
- Support **i18n**. Never hardcode UI text; store all labels, messages, and placeholders in locale JSON files.
- Centralize API configuration. Keep all entity endpoints in a single config (JSON/object) keyed by action_entity (GET_JOBS). Do not hardcode URLs throughout codebase.
- Use **TanStack Query** with reusable custom hooks for common api's, proper caching, and query invalidation. Avoid duplicate API logic.
- Follow the **DRY** principle. Extract shared logic into reusable hooks, utilities, and components.
- Reuse **components/ui** components whenever possible and keep newly creating custom shareable components under `components/` folder.
- Maintain a clean, modular project structure with clear separation of concerns and scalable architecture.
- Follow '@' alias directives when importing components , do not write long relative path imports. Refer tsconfig , viteconfig files and already imported App.tsx file for reference.
- Use zod for formData schema validation and react hook forms for form management.