# EduAssign Pro

<p align="center">
  <strong>Assignment & Submission Platform</strong>
</p>

<p align="center">
  <em>Manage Assignments. Empower Learning.</em>
</p>

<p align="center">
  EduAssign Pro is a full-stack academic management platform designed for schools and colleges to manage assignments, submissions, grading, feedback, curriculum, and academic workflows from one centralized workspace.
</p>

<p align="center">
  <a href="https://eduassign-6w15.onrender.com/">Live Demo</a>
  &nbsp;•&nbsp;
  <a href="https://github.com/mamun657/EduAssign">GitHub Repository</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-TypeScript-3178C6?style=for-the-badge&logo=react&logoColor=white" alt="React + TypeScript" />
  <img src="https://img.shields.io/badge/ASP.NET%20Core-Web%20API-512BD4?style=for-the-badge&logo=.net&logoColor=white" alt="ASP.NET Core" />
  <img src="https://img.shields.io/badge/C%23-239120?style=for-the-badge&logo=csharp&logoColor=white" alt="C#" />
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
</p>

---

## Overview

EduAssign Pro is an academic assignment and submission management system built to simplify the day-to-day workflow of educational institutions.

The platform provides separate role-based workspaces for Administrators, Teachers, and Students, allowing each user to access the tools and information relevant to their responsibilities.

Instead of managing assignments, submissions, grading, users, subjects, and curriculum across multiple disconnected tools, EduAssign Pro brings these workflows together into a single platform.

The core workflow is simple:

**Setup → Assign → Submit → Review → Grade → Feedback**

The system is designed with a focus on usability, secure access control, structured academic relationships, and maintainable full-stack architecture.

---

## Key Features

### Assignment Management

Teachers can create and manage academic assignments from their dedicated workspace.

- Create assignments
- Edit assignments
- Delete assignments
- Publish assignments
- Manage assignment descriptions
- Set deadlines
- Set maximum marks
- Associate assignments with subjects
- Track assignment status
- Manage assignment workflows

### Student Management

Administrators can manage student accounts and their academic information.

- View registered students
- Search students by name or email
- Filter students by academic level
- View account status
- Activate students
- Deactivate students
- Permanently delete students
- Manage student-subject relationships

### Teacher Management

Administrators can manage teaching staff through a dedicated administration workspace.

- View teachers
- Search teachers by name or email
- Filter teachers by status
- Activate teachers
- Deactivate teachers
- Permanently delete teachers
- Manage teacher-student-subject relationships

### Subject Management

Administrators can manage the academic subjects available within the institution.

- Create and manage subjects
- Organize subjects within academic levels
- Associate subjects with teachers
- Associate subjects with students
- Support assignment-related subject relationships

### Curriculum Management

EduAssign Pro provides curriculum management for organizing the institution's academic structure.

The platform supports academic levels such as:

- School
- College

Curriculum and subject information can be maintained from the administration workspace.

### Submission & Grading

Students can submit their assignments through their dedicated workspace, while teachers can review submissions and provide academic evaluation.

The workflow includes:

- Assignment submission
- Submission status tracking
- Submission review
- Marks assignment
- Teacher feedback
- Student result viewing
- Individual submission details

### AI-Powered Similarity Detection

EduAssign Pro includes a similarity analysis feature designed to assist teachers when reviewing student submissions.

The system can analyze submissions using:

- Lexical similarity
- Semantic similarity
- Overall similarity scoring

The purpose of similarity analysis is to provide teachers with useful information when reviewing potentially similar submissions.

Similarity analysis is a supporting academic tool and does not automatically determine whether plagiarism has occurred. Final academic decisions remain with the teacher or institution.

---

## Role-Based Workspaces

EduAssign Pro is organized around three primary roles.

### Admin

Administrators manage the institution's academic environment.

- Manage students
- Manage teachers
- Manage subjects
- Manage curriculum
- Manage teacher-student-subject relationships
- Manage assignments
- Activate and deactivate users
- Permanently delete users
- Monitor academic workflows

### Teacher

Teachers manage assignments and evaluate student work.

- View dashboard
- View students
- View subjects
- Create assignments
- Edit assignments
- Delete assignments
- Publish assignments
- Manage deadlines
- Review submissions
- Analyze similarity
- Assign marks
- Provide feedback

### Student

Students use their workspace to manage academic tasks.

- View dashboard
- View subjects
- View assignments
- View assignment details
- Check deadlines
- Submit assignments
- Track submission status
- View marks
- View teacher feedback

---

## Academic Workflow

EduAssign Pro connects the complete assignment lifecycle into one structured workflow.

```text
                    ADMIN
                      │
                      ▼
          Institution Setup & Management
                      │
                      ▼
                   TEACHER
                      │
                      ▼
             Create Assignment
                      │
                      ▼
             Publish Assignment
                      │
                      ▼
                   STUDENT
                      │
                      ▼
               View Assignment
                      │
                      ▼
                Submit Work
                      │
                      ▼
                   TEACHER
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
    Review Submission       Similarity Analysis
          │                       │
          └───────────┬───────────┘
                      ▼
                 Assign Marks
                      │
                      ▼
                Give Feedback
                      │
                      ▼
                   STUDENT
                      │
                      ▼
               View Result
