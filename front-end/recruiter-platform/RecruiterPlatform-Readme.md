# Recruiter Portal

The Recruiter Portal is the frontend application that enables recruiters and hiring teams to manage the complete recruitment lifecycle, from creating job postings and screening applications to scheduling interviews, communicating with candidates, and making hiring decisions through a centralized recruitment dashboard.

## Features

### Job Management
- Create, edit, publish, and archive job postings.
- Configure job details including (but not limited to):
  - Job title
  - Department / Category
  - Employment type
  - Location
  - Experience requirements
  - Salary range (optional)
  - Skills
  - Job description
  - Additional hiring information
- Draft jobs before publishing, and soft-delete drafts that are no longer needed.
- View active, draft, and archived job openings.

### Dynamic Application Form Builder
Recruiters can configure job-specific application questions while createing a job, which the candidates must answer during application submission. This is simlar to google forms.

### Candidate Management

Recruiters can:

- View all applications submitted for each job.
- Search and filter candidates.
- View complete candidate profiles.
- Review resumes and uploaded documents.
- Review responses to job-specific questions.
- Bulk Shortlist candidates by changing their profile status manually as a bulk operation.
- Reject applications by updating the same status in their application.
- Move candidates between recruitment stages.
- Track complete application history.


### Recruitment Pipeline

Applications progress through configurable recruitment stages.

Typical stages include:

1. Applied
2. In Review
3. Shortlisted
4. Interview Scheduled
5. Offer Extended
6. Offer Accepted
8. Rejected

Recruiters can update candidate status at any stage while maintaining a complete audit trail of recruitment activities.

### Interview Management

Recruiters can do the following operations as a bulk or individually:

- Schedule interviews.
- Reschedule interviews.
- Cancel interviews.
- Configure interview rounds.
- Assign interviewers.
- Choose interview mode:
  - Online
  - In-person
  - Phone Call
- Add interview notes and instructions.
- Attach meeting links or location details.

Interview schedules are automatically reflected in the Candidate Portal and also sent as email whenever status is changed.

### Email Template Management

Recruiters can manage reusable email templates for different recruitment events.

Examples include:

- Application received
- Application under review
- Shortlisted notification
- Interview invitation
- Interview reschedule
- Interview cancellation
- Offer letter
- Offer reminder
- Rejection email
- General communication

Templates support placeholder variables for candidate, job, and interview information. The email body templates are created using popular editor packages like react-quilljs-editor npm package.

### Automated Candidate Communication

The platform automatically sends email notifications when recruiters perform actions such as:

- Scheduling interviews
- Rescheduling interviews
- Sending offers
- Updating application status
- Auto-rejecting applications having no response crossing offer deadlines
- Requesting additional information

Manual email communication is also supported whenever required.

### Offer Management

Recruiters can:

- Extend offers to selected candidates.
- Upload offer documents.
- Configure response deadlines.
- Track offer acceptance or rejection.
- Monitor pending offers.

### Recruitment Dashboard

The dashboard provides recruiters with an overview of hiring activities including:

- Open job postings
- Total applications
- Candidates by recruitment stage
- Interview schedules
- Pending recruiter actions
- Recently updated applications
- Hiring progress across open positions

## Project Structure

```text
src/
├── api/
├── assets/
├── components/
├── pages/
├── routes/
├── store/
│   ├── redux/
│   └── slices/
├── types/
└── utils/
```

## Screens

### Authentication

- Since this is an internal tool, there is no signup.
- Authentication is done via email and password, followed by OTP verification on every login. `POST /auth/login` validates the password and sends the OTP; `POST /auth/otp/verify` completes the login.
- There are no public pages: every page except login and password reset requires authentication.
- Authentication is **stateful and cookie-based**: the `session_token` cookie carries an opaque token whose authoritative session payload (principal, email, role, expiry) lives in **Redis** with a TTL. We do not use JWT. The app calls `GET /auth/me` on load to restore Redux state, and validates session validity before major API calls such as job publish and status updates.
- **Role-based routing:** only `RECRUITER` gets the dashboard/workspace routes (`/`, `/jobs`). `ADMIN` and `HIRING_MANAGER` currently land on a welcome screen (`/`) showing their name and role in muted text. Add new pages by extending the role branches in `src/routes/AppRoutes.tsx`.

### Dashboard

The recruiter dashboard acts as the central workspace for all recruitment activities.

It provides quick access to:

- Hiring statistics
- Active job postings
- Recruitment pipeline summary
- Interview schedule
- Recent candidate activity
- Pending recruiter tasks

### Job Management

This Job list page displays all jobs in three tabs.

- **Drafts** showing jobs saved but not yet published.
- **Published Jobs** showing actively published jobs that are receiving applications.
- **Archived Jobs** showing jobs which are archived.

Search, filter and sort apply across all three tabs and reset pagination when changed:

* Search is debounced for 2 seconds and matches job code, title, category or location.
* Compensation filter lives in one dropdown: any compensation, not provided, negotiable, or a salary range chosen with a dual-thumb slider. Range mode lists jobs whose pay overlaps the selected window, including fixed salaries; the range is applied after the slider has been idle for 2 seconds.
* Sort by compensation, created date or updated date from the column header: first click sorts ascending, second descending, third clears back to the API's default order.
* Clearing the filters restores the default newest-created order.

Each job card allows recruiters to:

* Create a new job
* Edit a draft job (editing is disabled once the job is published)
  - Perform create and edit on a new page, strictly not in a popup modal. The page URL must include the job id.
* Publish a draft, or archive a published job
* Delete a draft (soft delete: the record is retained for history)
* Configure application questions
* View candidate statistics

Only the recruiter whose user id created a job can edit, publish, archive, or delete it. Other recruiters can view the job but cannot perform these actions.
**Creating a Job**

- Creating a Job Collects following details
  - Mandatory:
      Job title, Job Description , Location ,
      Total Interview Rounds, Last application submission date, Skills (tags)
  - Optional:
    Vacancy count, SalaryRange ,Designation , Department ,Benefits , Job specific questions , which is a dynamic form
    **Job specific Q/A**
    the recruiter can configure application questions, These questions are rendered dynamically when a candidate applies.
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

- A Job can be saved in draft state before publishing it.

**Editing, Publishing, Archiving and Deleting**
- Draft jobs can be edited and either stay drafts or be published.
- Published Jobs cannot be edited.
- Jobs cannot be unpublished. A published job can only be archived.
- Once a Job process is fully completed — a candidate was hired or it is being closed for another reason — the recruiter marks it as archived.
- Published Jobs can be archived even before the last submission date. Published jobs are also archived automatically once their last application date has passed.
- Constraints when clicking the archive button:
  - If no candidate accepted an offer in that job, show an alert with the following message and get confirmation:
    ```No candidates got confirmed in this Job. This archiving action cannot be reverted and it will make this job obsolete, i.e. no kind of status update for the job or candidate applications can be made.```
- Archived Jobs cannot be unarchived.
- Only draft jobs can be deleted, and deletion is always a soft delete: the record stays in the system but is hidden from the UI.
- Every delete operation in the application is a soft delete.

**Created Job cards list shows**
Each job card displays:

* Job title
* Job status
* Total candidate count
* Top 3 candidate status counts (ordered by importance)

Example:

```
Applications: 132

Offer Extended: 10
Offer Accepted: 3
Interview Scheduled: 18
```

**Job Card actions**
* **Clone Job**
 Allows to clone any draft, published or archived job - Clicking on the copy button opens the job detail popup in clone-confirmation mode. Confirming opens the create page pre-filled with the source job's contents (title kept, a past closing date cleared) so it can be saved as a new draft or published.
* **Archive Button**
  Marks a Job as archived - It just makes a job obsolete ,actions like job status round update or updating status of application in that job cannot be performed. we can just view it for visual history.
* **Detailed view** - clicking a job row opens its detail in a slide-up, scrollable drawer. The drawer shows the job information and the status actions.
* **View Applications** - inside the detail drawer, this action navigates to the **Applications List Page** for that job, using the **Job ID** to fetch all applications received. It is available on published and archived jobs.

Provide appropriate buttons for the above actions in the job row and the detail drawer.

#### Candidate List for a Job

This page displays all candidates who applied for the selected job.

_Layout_

**Center/Main Content**

A table containing all candidates.

Columns:

* Candidate Name
* Candidate email
* Resume Status
* Current Application Stage
* AI Ranking Score
* Skill Match Summary
* Applied Date

_Searching and Filtering_
  Recruiters can filter candidates using various criteria including:

- Application status
- Skills
- Experience
- Education
- Location
- AI ranking score
- Interview stage
- Application date

** Left Side Panel**

A toggleable slide-out panel displays the Job Description (JD).

Requirements:

* Visible by default when entering the Candidate List page.
* Used only as a reference while reviewing candidates.
* Can be manually toggled open or closed.

** Opening Candidate Details**

Clicking any candidate row opens a **Candidate Detail Drawer** from the right side.

When this drawer opens:

* Automatically close (or hide) the left JD panel.
* Only one side panel should be open at a time.

Closing the candidate drawer returns the recruiter to the Candidate List page.


** Candidate Detail Drawer (Right side Panel) **

The candidate details are displayed in a **right-side slide-over drawer**, not a separate page.

The drawer contains:

_Candidate Information_

* Personal Information
* Resume Preview , Cover letter Preview (if provided)
* Education
* Work Experience
* Skills
* Certifications
* Portfolio Links
* Job-specific Application Responses

**AI Evaluation**

* AI Profile Analysis
* Skill Comparison against the Job Description

**Recruitment Activity**

* Recruitment Timeline (like date andtime of application status changes)

**Recruiter Actions**

Recruiters can:

* Update application status (any of the 8 workflow statuses, including **Rejected** with a mandatory rejection reason)
* Schedule an interview
* Add recruiter notes

**Expected navigation**

```
Job Cards Dashboard
        ↓
Click Job Card
        ↓
Candidate List Page
   (JD panel on left)
        ↓
Click Candidate Row
        ↓
Candidate Detail Drawer
(from right)
(JD panel auto-closes)
```

**UI Behavior Rules**

* Clicking a job card navigates to the Candidate List page.
* The Candidate List page opens with the JD panel visible.
* Clicking a candidate opens the Candidate Detail Drawer from the right.
* Opening the Candidate Detail Drawer automatically closes the left JD panel.
* Only one side panel (JD or Candidate Detail) should be visible at a time.
* Closing the Candidate Detail Drawer returns the user to the Candidate List page without losing scroll position or applied filters.


### Interview  Management workflow

Recruiters manage the interview process round by round through the Candidate List and Job Details pages.

**Interview Scheduler**

Recruiters can schedule interviews for candidates in the current interview round by configuring:

- Interview round
- Date & time
- Interviewer(s)
- Meeting mode (In person , online or phone call)
- Meeting link or location
- Candidate instructions

Successful scheduling automatically notifies the candidate via email.

**Candidate Round Progression**

After interviews for the current round are completed, recruiters evaluate candidates collectively rather than updating each candidate individually.

From the Candidate List, recruiters can:

- Filter candidates by the current interview round.
- Select one or more shortlisted candidates using multi-select checkboxes (place at start of each table row).
- Click Move to Next Round from the bulk action toolbar.

Selecting Move to Next Round opens a confirmation modal showing:

- Current interview round
- Next interview round
- Number of selected candidates
- Summary of the candidates being progressed

If candidates still remain in the current round, the UI should display a warning before allowing the recruiter to continue.


On confirmation, the frontend calls a backend API that performs the entire round progression as a single operation:

- Advances the Job's Current Interview Round to the next configured round.
- Moves the selected candidates to the next interview stage.
- Marks all remaining candidates in the current round as not shortlisted.
- Sends notification emails to both shortlisted and non-shortlisted candidates.

The backend is responsible for determining the non-shortlisted candidates, updating all application statuses, and sending notification emails. The frontend only initiates the action and refreshes the Job Details and Candidate List upon successful completion.


### Email Templates

Recruiters can:

- Create templates
- Edit templates
- Preview templates
- Organize templates by category
- Insert dynamic variables
- Reuse templates across multiple hiring workflows

Templates support placeholder variables for candidate, job, and interview information. The email body templates are created using popular editor packages like react-quilljs-editor npm package.


## UI Enhancements

- Toast notifications for successful and failed API requests.
- Skeleton loading animations while data is being fetched.
- Mandatory form fields marked with a red asterisk.
- Inline validation messages for invalid or missing inputs.
- Loading indicators and disabled state for all asynchronous actions.
- Confirmation dialogs before destructive operations.
- Responsive layouts supporting desktop and tablet experiences.
- Pagination for candidate and job listings.
- Consistent search, sorting, and filtering across management screens.

## Code Constraints

- Use **TypeScript** with strict typing. Every function, component, variable, parameter, and return type must be typed. Use `interface` for props, state, and API payloads, and `type`, unions, generics(T), or derived types wherever appropriate.
- Use **enums** for application-wide constants (e.g., status, roles, permissions, job status). Avoid hardcoded constant strings.
- Place reusable types in the `types/` folder. Define component-specific types locally unless they are shared and not used multiple times.
- Support **i18n**. Never hardcode UI text; store all labels, messages, and placeholders in locale JSON files.
- Centralize API configuration. Keep all entity endpoints in a single config (JSON/object) keyed by action_entity (GET_CANDIDATES). Do not hardcode URLs throughout codebase.
- Use **TanStack Query** with reusable custom hooks for common api's, proper caching, and query invalidation. Avoid duplicate API logic.
- Follow the **DRY** principle. Extract shared logic into reusable hooks, utilities, and components.
- Reuse **components/ui** components whenever possible and keep newly creating custom shareable components under `components/` folder.
- Maintain a clean, modular project structure with clear separation of concerns and scalable architecture.
- Follow '@' alias directives when importing components , do not write long relative path imports. Refer tsconfig , viteconfig files and already implemented code in App.tsx file for reference.
- Use zod for formData schema validation and react hook forms for form management.