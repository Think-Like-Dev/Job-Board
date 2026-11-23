# Job Board and Recruitment Platform

A modern **Job Board and Recruitment Platform** designed as an **internal recruitment solution for organizations** to streamline hiring, manage candidate applications, and maintain a centralized database of job seekers.

## Features

The platform is designed with the following capabilities:

### For Candidates

* Search and discover job opportunities using filters
* Track the status of submitted job applications.
* Receive automated email notifications for application updates, interview schedules, and recruitment outcomes.

### For Recruiters

* Create and manage job postings.
* Screen and evaluate resumes using AI-powered agents.
* Automatically rank candidates based on their profile's relevance to the job description.
* Shortlist candidates and schedule interviews.
* Notify candidates of interview schedules through automated email communication.
* Track candidates across multiple interview stages using a centralized recruitment dashboard.

## Project Goals

In addition to serving as an internal recruitment platform, this project is a hands-on exploration of building a **multilingual full-stack web application** with **AI-powered capabilities**. It focuses on modern software engineering practices, scalable architecture, and intelligent automation.

The project is intended to explore and demonstrate:

* **Full-Stack Web Development**
* **AI Agent Development and Integration**
* **Scalable System Design**
* **DevOps and Deployment Practices**

# Architecture

This Project uses the popular **React with Typescript** to build the user interface.
    
**Node.js with NestJS** , **Python with Fastapi**  are used to build the server-side applications.

**Project Structure:-**
```markdown
Job-Board
├───back-end
│   ├───ai-platform
│   └───platform-api
└───front-end
    ├───candidate-portal
    └───recruiter-platform
```

For a more detailed overview of the architecture and implementation, refer to the documentation in the respective [front-end](./front-end/FrontEnd-Readme.md) and [back-end](./back-end/BackEnd-Readme.md) directories.

## Local development

Prerequisites: **Node 22 LTS**, **pnpm 12.21.0**, **Docker + Compose**, and **Python 3.14 with
uv** (AI service only). The pnpm version is pinned in each `package.json` (`packageManager`)
and in the API Dockerfiles; keep them in sync when upgrading.

```sh
# from the repository root
./dk setup                 # back-end env files + host dependencies
./scripts/setup-hooks.sh   # enables the tracked Git hooks (once per clone)
./dk run:dev               # whole local stack
```

The frontends are installed independently:

```sh
cd front-end/candidate-portal && pnpm install && pnpm dev
cd front-end/recruiter-platform && pnpm install && pnpm dev
```

**Git hooks are not installed automatically.** This repository does not use husky or
`pre-commit install`; it ships a plain hook in `.githooks/` and enables it with
`git config core.hooksPath .githooks`, which `./scripts/setup-hooks.sh` does for you. Run that
once per clone (and after moving the repository). The hook works from any subdirectory and in
any terminal: Git itself runs it from the work-tree root, through the bash bundled with Git
(Git Bash on Windows).

`pre-commit` checks only the projects a commit touches: ESLint with zero warnings, Prettier
`--check` and the project build/typecheck for each affected app; `ruff format --check` and
`ruff check` for staged Python files; and the migration filename limit (32 characters
including `.ts`/`.py`). It never rewrites files.

The full setup guide — migrations, dependency and version updates, cleanup, branch/PR
conventions and repo quirks — is in [CONTRIBUTING.md](./CONTRIBUTING.md).

## License
This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
