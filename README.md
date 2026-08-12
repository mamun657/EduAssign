# EduAssign Pro

<p align="center">
  <strong>Assignment & Submission Management Platform</strong>
</p>

<p align="center">
  A full-stack academic management system for schools and colleges.
</p>

<p align="center">
  <a href="https://eduassign-6w15.onrender.com">Live Demo</a>
  •
  <a href="https://github.com/mamun657/EduAssign">Repository</a>
</p>

---

## Overview

EduAssign Pro is a full-stack web application built to simplify the way educational institutions manage assignments, submissions, teachers, students, subjects, curriculum, grading, and academic workflows.

The platform provides separate workspaces for three types of users:

- Admin
- Teacher
- Student

Each role has its own permissions and workflow, while the backend enforces authorization for protected operations.

The main goal of EduAssign Pro is simple: bring the everyday assignment workflow of an institution into one organized platform instead of relying on multiple disconnected tools.

The platform covers the complete assignment lifecycle:

**Manage → Assign → Submit → Review → Grade → Feedback**

---

## What EduAssign Pro Provides

EduAssign Pro currently includes the core functionality required to manage an academic assignment workflow.

### Administration

Administrators can manage the academic environment and user accounts from a centralized dashboard.

- Manage teachers
- Manage students
- Manage subjects
- Manage curriculum
- Manage academic levels
- Manage teacher-student-subject relationships
- Manage assignments
- Activate users
- Deactivate users
- Permanently delete users
- View administrative statistics and information

### Teacher Workspace

Teachers have a dedicated workspace for managing their teaching activities.

- View assigned students
- View assigned subjects
- Create assignments
- Edit assignments
- Delete assignments
- Publish assignments
- Set assignment deadlines
- Set maximum marks
- View submissions
- Review student work
- Assign marks
- Provide feedback
- Analyze submission similarity

### Student Workspace

Students can manage their academic tasks from their own dashboard.

- View assigned subjects
- View available assignments
- View assignment details
- Check deadlines
- Submit assignments
- Track submission status
- View marks
- View teacher feedback

---

## Core Features

### Assignment Management

Teachers can create and manage assignments associated with their academic subjects.

Each assignment can contain relevant information such as its title, description, deadline, subject, and maximum marks.

The assignment workflow allows teachers to create work for students and later review the submitted results.

### Submission Management

Students can submit their work through the platform.

Teachers can then access submitted assignments from their submission workspace and review individual submissions.

This keeps the assignment and submission process connected instead of requiring separate communication or file-sharing tools.

### Grading & Feedback

Teachers can evaluate student submissions by assigning marks and providing feedback.

Students can then access their results from their own workspace.

This creates a simple feedback loop between teachers and students:

**Submit → Review → Grade → Feedback → Result**

### Subject Management

Subjects are managed centrally by administrators.

Subjects can be connected with the appropriate academic levels, teachers, and students so that assignments and academic activities are organized around the correct subject structure.

### Curriculum Management

The administration workspace provides curriculum-related management functionality.

Academic levels and subjects can be organized to reflect the institution's academic structure.

### Teacher & Student Management

Administrators can manage user accounts from dedicated management pages.

The system supports:

- User listing
- User status management
- Activation
- Deactivation
- Permanent deletion
- Role-based access

Permanent deletion is protected with confirmation and backend validation to reduce the risk of accidental data removal.

---

## Similarity Analysis

EduAssign Pro includes a similarity analysis feature to help teachers review student submissions.

The system provides similarity information using both textual and semantic comparison techniques.

The available analysis includes:

- Lexical similarity
- Semantic similarity
- Overall similarity score

The purpose of this feature is to assist teachers during academic review by highlighting submissions that may contain significant similarities.

Similarity analysis is a supporting tool. It does not automatically determine whether a student has committed plagiarism. The final academic decision remains with the teacher or institution.

---

## User Roles

EduAssign Pro is built around three primary roles.

### Admin

The Admin is responsible for managing the institution's academic environment.

Admin capabilities include:

- Teacher management
- Student management
- Subject management
- Curriculum management
- Academic level management
- Teacher-student-subject management
- Assignment management
- User activation/deactivation
- User deletion

### Teacher

Teachers are responsible for creating academic work and evaluating student submissions.

Teacher capabilities include:

- Student access
- Subject access
- Assignment management
- Submission review
- Similarity analysis
- Grading
- Feedback

### Student

Students use the platform to access and complete their academic work.

Student capabilities include:

- Subject access
- Assignment access
- Assignment submission
- Submission tracking
- Result viewing
- Feedback viewing

---

## Assignment Workflow

The platform follows a straightforward academic workflow.

```text
                    ADMIN
                      │
                      ▼
              Academic Setup
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
       Teachers                Students
          │                       │
          └───────────┬───────────┘
                      ▼
                   Subjects
                      │
                      ▼
                   Teacher
                      │
                      ▼
             Create Assignment
                      │
                      ▼
                   Student
                      │
                      ▼
              Submit Assignment
                      │
                      ▼
                   Teacher
                      │
              ┌───────┴────────┐
              ▼                ▼
           Review         Similarity
              │             Analysis
              └───────┬────────┘
                      ▼
                    Grade
                      │
                      ▼
                  Feedback
                      │
                      ▼
                   Student
