# 📚 EduAssign Pro

## Assignment & Academic Workflow Management Platform

EduAssign Pro is a full-stack academic workflow management platform designed for schools, colleges, and educational institutions. It provides a centralized workspace where administrators, teachers, and students can manage users, subjects, curriculum, assignments, submissions, grading, feedback, and academic review.

The platform is built around three primary roles:

- 👨‍💼 **Admin**
- 👨‍🏫 **Teacher**
- 👨‍🎓 **Student**

Each role has a dedicated workspace with role-based permissions and functionality designed around its responsibilities.

<p align="center">
  <a href="https://eduassign-6w15.onrender.com">🌐 Live Application</a>
  &nbsp;&nbsp;•&nbsp;&nbsp;
  <a href="https://github.com/mamun657/EduAssign">💻 GitHub Repository</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" alt="Next.js"/>
  <img src="https://img.shields.io/badge/React-TypeScript-blue?style=for-the-badge&logo=react" alt="React TypeScript"/>
  <img src="https://img.shields.io/badge/ASP.NET%20Core-Web%20API-purple?style=for-the-badge&logo=.net" alt="ASP.NET Core"/>
  <img src="https://img.shields.io/badge/C%23-Backend-512BD4?style=for-the-badge&logo=csharp" alt="C#"/>
  <img src="https://img.shields.io/badge/MongoDB-Database-green?style=for-the-badge&logo=mongodb" alt="MongoDB"/>
  <img src="https://img.shields.io/badge/JWT-Authentication-orange?style=for-the-badge" alt="JWT"/>
  <img src="https://img.shields.io/badge/Docker-Deployment-2496ED?style=for-the-badge&logo=docker" alt="Docker"/>
</p>

---

## 🎯 Overview

Academic institutions manage a large amount of information every day. Teachers need to create and distribute assignments, students need to submit their work, teachers need to review and grade submissions, and administrators need to maintain the academic structure behind the entire process.

When these activities are handled through disconnected tools, assignment information can become scattered, submission tracking becomes difficult, grading and feedback become less organized, and administrators may have limited visibility into academic activities.

EduAssign Pro brings these major workflows together into one structured platform.

The overall academic workflow is:

```text
Institution Setup
        ↓
User Management
        ↓
Subject & Curriculum Management
        ↓
Teacher-Student-Subject Relationships
        ↓
Assignment Creation
        ↓
Student Submission
        ↓
Teacher Review
        ↓
Similarity Analysis
        ↓
Marks & Feedback
        ↓
Student Result
```

The goal is to make academic assignment management more organized, connected, and easier to operate.

---

## ✨ Features

### 👨‍💼 Admin Management

The Admin workspace provides centralized control over the academic environment.

Administrators can:

- Manage teachers
- Manage students
- Activate users
- Deactivate users
- Permanently delete users
- Manage subjects
- Manage academic levels
- Manage curriculum
- Manage teacher-student-subject relationships
- Manage assignments
- Monitor academic data
- Maintain institutional structure

  <img width="1907" height="832" alt="image" src="https://github.com/user-attachments/assets/3a189f3c-ca89-432f-bc4a-20f84b621dbd" />


The admin panel provides dedicated management pages for the different areas of the academic system.

---

### 👨‍🏫 Teacher Management

Teachers have a dedicated workspace focused on teaching, assignment management, submission review, and evaluation.

Teachers can:

- View assigned students
- View assigned subjects
- Create assignments
- Manage assignments
- View submissions
- Review student work
- Analyze submission similarity
- Assign marks
- Provide feedback
- Access individual submission details

  <img width="1899" height="925" alt="image" src="https://github.com/user-attachments/assets/6e7c4983-afed-4e67-baa3-0e560a1d9dae" />


The teacher workflow is:

```text
Teacher
   ↓
View Subjects
   ↓
View Students
   ↓
Create Assignment
   ↓
Receive Submissions
   ↓
Review Work
   ↓
Similarity Analysis
   ↓
Assign Marks
   ↓
Provide Feedback
```

---

### 👨‍🎓 Student Management

Students receive a dedicated workspace for managing their academic activities.

Students can:

- View assigned subjects
- View assignments
- View assignment details
- Check deadlines
- Submit assignments
- Track submission status
- View marks
- View teacher feedback

<img width="1919" height="939" alt="image" src="https://github.com/user-attachments/assets/af64b3ce-f88a-498c-a282-8166381f9e6a" />


The student workflow is:

```text
Student
   ↓
View Subjects
   ↓
View Assignments
   ↓
Open Assignment
   ↓
Submit Work
   ↓
Wait for Review
   ↓
View Marks
   ↓
View Feedback
```

---

### 📝 Assignment Management

Assignment management is one of the core workflows of EduAssign Pro.

Teachers can create assignments and define the information students need to complete their work.

Assignments can contain:

- Title
- Description
- Subject
- Deadline
- Maximum marks
- Assigned students

The assignment lifecycle is:

```text
Create
  ↓
Assign
  ↓
Student Access
  ↓
Submit
  ↓
Review
  ↓
Grade
  ↓
Feedback
```

Once an assignment is created, the relevant students can access it through their student workspace.

---

### 📤 Submission Management

Students can submit their assignments directly through the platform.

Teachers can access submitted work from their submission management interface and review the submitted material.

Teachers can:

- View submitted assignments
- Open submission details
- Review student work
- Check submission information
- Analyze similarity
- Assign marks
- Provide feedback

After evaluation, students can access their results and feedback through their own dashboard.

---

### 🔍 AI-Assisted Similarity Analysis

EduAssign Pro includes a similarity analysis feature designed to assist teachers during academic submission review.

The system compares submitted documents using lexical and semantic similarity techniques and provides similarity information that can help teachers identify potentially similar submissions.

Similarity analysis includes:

- Lexical similarity
- Semantic similarity
- Overall similarity score

The workflow is:

```text
Student Submission
        ↓
Text Analysis
        ↓
Lexical Similarity
        ↓
Semantic Similarity
        ↓
Overall Similarity Score
        ↓
Teacher Review
```
<img width="1626" height="921" alt="image" src="https://github.com/user-attachments/assets/8be4a9f9-a54e-4b1f-9665-1dcd3234bbb1" />


The similarity system is designed to support academic review. It does not automatically determine whether plagiarism has occurred. The final interpretation and academic decision remain with the teacher or institution.

---

### 📚 Subject & Curriculum Management

EduAssign Pro provides tools for maintaining the academic structure of an institution.

Administrators can organize:

- Academic levels
- Curriculum
- Subjects
- Teachers
- Students
- Teacher-student-subject relationships

This keeps assignments and academic activities connected to the appropriate academic context.

```text
Academic Level
      ↓
Curriculum
      ↓
Subjects
      ↓
Teachers
      ↓
Students
      ↓
Assignments
```

---

### 🔗 Teacher-Student-Subject Relationships

The platform provides dedicated management for relationships between teachers, students, and subjects.

These relationships determine the academic context in which teachers and students interact.

```text
              Subject
                 │
        ┌────────┴────────┐
        ↓                 ↓
     Teacher           Students
        │                 │
        └────────┬────────┘
                 ↓
            Assignments
                 ↓
            Submissions
                 ↓
          Review & Grading
```

This relationship-based structure helps maintain controlled academic access throughout the system.

---

## 🔐 Authentication & Authorization

Security and access control are important parts of the application architecture.

EduAssign Pro uses authentication and role-based authorization to ensure users can access functionality appropriate to their role.

### Security features

- JWT-based authentication
- Role-based authorization
- Protected API endpoints
- Server-side authorization
- Client-side validation
- Server-side validation
- Role-specific dashboards
- Controlled access to academic resources

The application separates the responsibilities of the three primary roles:

```text
Admin
 ├── User Management
 ├── Academic Management
 └── Institution Configuration

Teacher
 ├── Assignment Management
 ├── Submission Review
 ├── Grading
 └── Similarity Analysis

Student
 ├── Subject Access
 ├── Assignment Access
 ├── Submission
 └── Results
```

---

## 🛡️ User Account Management

Administrators can activate, deactivate, and permanently delete teacher and student accounts.

Permanent deletion includes a confirmation workflow to reduce accidental deletion.

The backend also performs safety checks before processing deletion requests.

```text
Delete Request
      ↓
Authentication
      ↓
Admin Authorization
      ↓
User Validation
      ↓
Related Data Handling
      ↓
User Removal
      ↓
Success Response
```

Administrative accounts are protected from normal deletion operations, including self-deletion, to prevent accidental removal of critical administrative access.

---

## 🔄 Complete Academic Workflow

EduAssign Pro follows a clear end-to-end academic workflow.

### 01 — Setup

Administrators establish the academic environment.

```text
Admin
 ↓
Teachers
 ↓
Students
 ↓
Academic Levels
 ↓
Subjects
 ↓
Curriculum
```

### 02 — Assign

Teachers create assignments for the appropriate academic context.

```text
Teacher
   ↓
Create Assignment
   ↓
Select Subject
   ↓
Assign Students
   ↓
Publish Assignment
```

### 03 — Submit

Students access their assignments and submit their completed work.

```text
Student
   ↓
View Assignment
   ↓
Complete Work
   ↓
Submit
```

### 04 — Review

Teachers review submitted assignments.

```text
Submission
    ↓
Teacher Review
    ↓
Similarity Analysis
    ↓
Academic Evaluation
```

### 05 — Grade

Teachers provide marks and feedback.

```text
Teacher
   ↓
Marks
   ↓
Feedback
   ↓
Student Result
```

---

## 🏗️ System Architecture

EduAssign Pro follows a layered full-stack architecture that separates the frontend, backend, application logic, and database.

```text
┌──────────────────────────────────────────────┐
│                  FRONTEND                    │
│                                              │
│        Next.js + React + TypeScript          │
│                                              │
│   Admin │ Teacher │ Student Workspaces       │
└──────────────────────┬───────────────────────┘
                       │
                       │ REST API
                       ▼
┌──────────────────────────────────────────────┐
│                   BACKEND                    │
│                                              │
│             ASP.NET Core Web API             │
│                                              │
│ Controllers → Services → Repositories        │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│                  DATABASE                    │
│                                              │
│                    MongoDB                   │
└──────────────────────────────────────────────┘
```

The frontend handles the user experience and role-specific interfaces.

The backend handles:

- Authentication
- Authorization
- Business logic
- Validation
- API operations
- Database communication

MongoDB provides persistent storage for the application's academic data.

---

## 🧩 Technology Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- Axios
- React Hook Form
- Zod
- Lucide React
- Sonner

### Backend

- C#
- ASP.NET Core Web API
- REST API
- JWT Authentication
- Role-Based Authorization
- Repository Pattern
- Service Layer
- Swagger / OpenAPI
- Serilog

### Database

- MongoDB

### Testing & Verification

- TypeScript Compiler
- .NET Build
- .NET Test
- Playwright
- API Testing
- Browser Testing

### Deployment

- Docker
- Render
- GitHub

---

## 🗂️ Project Structure

```text
EduAssign/
│
├── web/
│   ├── public/
│   └── src/
│       ├── app/
│       │   ├── admin/
│       │   │   ├── assignments/
│       │   │   ├── students/
│       │   │   ├── teachers/
│       │   │   ├── subjects/
│       │   │   ├── curriculum/
│       │   │   └── ...
│       │   │
│       │   ├── teacher/
│       │   │   ├── assignments/
│       │   │   ├── students/
│       │   │   ├── subjects/
│       │   │   └── submissions/
│       │   │
│       │   ├── student/
│       │   │   ├── assignments/
│       │   │   └── subjects/
│       │   │
│       │   ├── login/
│       │   └── register/
│       │
│       ├── components/
│       └── lib/
│
├── server/
│   ├── EduAssignPro.Api/
│   ├── EduAssignPro.Application/
│   ├── EduAssignPro.Domain/
│   ├── EduAssignPro.Infrastructure/
│   └── ...
│
├── Dockerfile.server
├── render.yaml
└── README.md
```

---

## 🌐 REST API

The frontend communicates with the ASP.NET Core backend through RESTful APIs.

The application follows standard HTTP methods:

```text
GET       → Retrieve data
POST      → Create data
PUT/PATCH → Update data
DELETE    → Remove data
```

Common HTTP responses include:

| Status | Meaning |
|--------|---------|
| 200 | Request successful |
| 201 | Resource created |
| 204 | Operation completed successfully |
| 400 | Invalid request |
| 401 | Authentication required |
| 403 | Access denied |
| 404 | Resource not found |
| 409 | Request conflict |
| 500 | Internal server error |

The backend is responsible for validating requests and enforcing protected operations.

---

## 📊 Role-Based Dashboards

Each role receives a workspace designed around its responsibilities.

### Admin Dashboard

The Admin dashboard provides access to:

- Teachers
- Students
- Subjects
- Curriculum
- Academic levels
- Assignments
- Teacher-student-subject relationships

### Teacher Dashboard

The Teacher dashboard provides access to:

- Students
- Subjects
- Assignments
- Submissions
- Similarity analysis
- Grading
- Feedback

### Student Dashboard

The Student dashboard provides access to:

- Subjects
- Assignments
- Submission status
- Marks
- Feedback

This role-based structure keeps the interface focused and prevents users from being exposed to functionality outside their responsibilities.

---

## 🎨 User Interface

EduAssign Pro follows a clean, modern SaaS-style interface focused on usability and consistency.

The application includes:

- Structured dashboards
- Responsive layouts
- Clear navigation
- Consistent typography
- Status indicators
- Action buttons
- Confirmation dialogs
- Form validation
- Feedback notifications
- Organized data tables
- Role-specific workflows

The Admin, Teacher, and Student interfaces share a consistent visual language while maintaining separate responsibilities.

---

## 🚀 Deployment

EduAssign Pro is designed to run as separate frontend and backend services.

```text
                       GitHub
                          │
                          ▼
                    Render Platform
                          │
             ┌────────────┴────────────┐
             ▼                         ▼
       Frontend Service           API Service
          Next.js               ASP.NET Core
             │                         │
             └────────────┬────────────┘
                          ▼
                       MongoDB
```

The backend is containerized using Docker, while the deployment configuration is maintained through the project's Render configuration.

### 🌐 Live Application

https://eduassign-6w15.onrender.com

---

## ⚙️ Local Development

### Requirements

Before running EduAssign Pro locally, make sure the following are installed:

- Node.js
- npm
- .NET SDK
- MongoDB
- Git

### Clone the repository

```bash
git clone https://github.com/mamun657/EduAssign.git
cd EduAssign
```

### Run the frontend

```bash
cd web
npm install
npm run dev
```

The frontend will be available at:

```text
http://localhost:3000
```

### Run the backend

Open another terminal:

```bash
cd server
dotnet restore
dotnet build
dotnet run
```

The backend URL is determined by the configured ASP.NET Core launch settings and environment.

---

## 🔧 Environment Configuration

EduAssign Pro uses environment variables for application configuration and sensitive credentials.

Depending on the environment, configuration can include:

```text
MongoDB connection string
MongoDB database name
JWT secret
JWT issuer
JWT audience
Seed administrator credentials
CORS configuration
Frontend API base URL
```

Sensitive credentials should never be committed to the repository.

For production deployments, these values should be configured through the deployment environment.

---

## 🧪 Testing & Verification

The project can be validated through automated checks, API testing, and browser-based verification.

### Frontend TypeScript Check

```bash
cd web
npx tsc --noEmit
```

### Frontend Production Build

```bash
npm run build
```

### Backend Build

```bash
cd server
dotnet build
```

### Backend Tests

```bash
dotnet test
```

### Browser Verification

Important application workflows can be verified through a real browser environment, including:

- Login
- Registration
- Admin dashboard
- Teacher dashboard
- Student dashboard
- Teacher management
- Student management
- Subject management
- Curriculum management
- Assignment creation
- Assignment editing
- Assignment submission
- Submission review
- Grading
- Feedback
- Similarity analysis
- User activation
- User deactivation
- User deletion

---

## 📱 Application Routes

### Public Routes

```text
/
/login
/register
```

### Admin Routes

```text
/admin
/admin/users
/admin/teachers
/admin/students
/admin/subjects
/admin/teacher-student-subject
/admin/curriculum
/admin/assignments
```

### Teacher Routes

```text
/teacher
/teacher/students
/teacher/subjects
/teacher/assignments
/teacher/assignments/new
/teacher/assignments/[id]
/teacher/submissions
/teacher/submissions/[id]
```

### Student Routes

```text
/student
/student/subjects
/student/assignments
/student/assignments/[id]
```

---

## 📈 Why EduAssign Pro?

EduAssign Pro focuses on a practical challenge in academic management: keeping assignment-related activities organized and connected.

The platform brings together:

- User management
- Academic structure
- Assignment management
- Submission management
- Teacher evaluation
- Grading
- Feedback
- Similarity-assisted review

This creates a more structured workflow for institutions, teachers, and students.

```text
             ADMIN
               │
               ▼
       Academic Management
               │
       ┌───────┴───────┐
       ▼               ▼
    TEACHER          STUDENT
       │               │
       ▼               ▼
  Assignments      Submissions
       │               │
       └───────┬───────┘
               ▼
             Review
               │
               ▼
        Marks & Feedback
               │
               ▼
             Results
```

---

## 🔮 Future Improvements

EduAssign Pro currently focuses on its core academic assignment and submission workflows.

Potential future improvements include:

- Advanced academic analytics
- Institutional reports
- Notification system
- Email notifications
- Calendar integration
- Question bank management
- Advanced assessment tools
- Mobile application
- Multi-institution support
- Additional learning analytics

These are future directions and are not presented as currently implemented features.

---

## 🌱 Project Vision

The vision behind EduAssign Pro is to create a dependable academic workspace where institutions can manage everyday assignment workflows through one connected system.

The platform aims to make academic operations easier to organize for administrators, teachers, and students while maintaining clear responsibilities and controlled access.

```text
Institution
     │
     ▼
Academic Structure
     │
     ├───────────────┐
     ▼               ▼
  Teachers        Students
     │               │
     ▼               ▼
Assignments      Submissions
     │               │
     └───────┬───────┘
             ▼
          Review
             │
             ▼
      Marks & Feedback
             │
             ▼
          Results
```

---

## 👨‍💻 Developer

### Mohammed Minul Islam

**Software Developer | Full-Stack Developer | AI/ML Enthusiast**

EduAssign Pro was developed as a full-stack academic software project with a focus on real-world application architecture, role-based access control, REST API development, database integration, authentication, academic workflows, and production deployment.

### Technologies Used

- Next.js
- React
- TypeScript
- Tailwind CSS
- ASP.NET Core
- C#
- MongoDB
- REST APIs
- JWT
- Docker
- Render
- Git & GitHub

---

## 🔗 Project Links

🌐 **Live Application**  
https://eduassign-6w15.onrender.com

💻 **GitHub Repository**  
https://github.com/mamun657/EduAssign

👨‍💻 **Developer GitHub**  
https://github.com/mamun657

---

## 📄 License

This project was developed as a full-stack academic software engineering project.

---

<p align="center">
  <strong>📚 EduAssign Pro</strong>
  <br><br>
  Assignment & Academic Workflow Management Platform
  <br><br>
  Built to make academic workflows more organized, connected, and manageable.
</p>
