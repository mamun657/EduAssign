# 📚 EduAssign Pro

<p align="center">
  <img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&weight=600&size=24&pause=1000&color=16A34A&center=true&vCenter=true&width=900&lines=Assignment+%26+Submission+Management;Role-Based+Academic+Platform;Teacher+%26+Student+Workflows;AI-Powered+Academic+Intelligence;RAG-Based+Knowledge+Retrieval;Assignment+Similarity+Analysis" alt="EduAssign Pro" />
</p>

<p align="center">
  A full-stack academic assignment and submission management platform built for schools and colleges.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" />
  <img src="https://img.shields.io/badge/React-TypeScript-3178C6?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/ASP.NET%20Core-Web%20API-512BD4?style=for-the-badge&logo=.net&logoColor=white" />
  <img src="https://img.shields.io/badge/C%23-Backend-239120?style=for-the-badge&logo=csharp&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-Database-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/AI-RAG%20%7C%20LLM-7C3AED?style=for-the-badge" />
</p>

---

## 📌 Overview

**EduAssign Pro** is a role-based Assignment & Submission Management System designed for schools and colleges.

The platform brings administrators, teachers, and students into one centralized academic workflow. Administrators can manage users, subjects, curriculum, and academic relationships. Teachers can create and manage assignments, review student submissions, and provide marks and feedback. Students can access their assignments, submit answers, and track their academic progress.

The project also introduces an AI-powered academic intelligence layer that can be extended to process course materials, retrieve relevant academic content, perform assignment similarity analysis, and assist teachers with assessment generation.

The system was developed as a full-stack web application with a clear separation between the frontend, backend API, domain logic, infrastructure, and testing layers.

---

# 🎯 Problem

Academic assignment management often involves several disconnected activities:

- Managing teachers and students
- Managing subjects and classes
- Assigning teachers to academic groups
- Creating and distributing assignments
- Collecting student submissions
- Reviewing submitted work
- Providing marks and feedback
- Identifying potentially similar submissions
- Maintaining academic records

When these activities are handled manually, managing a growing number of students and assignments becomes difficult.

**EduAssign Pro** brings these workflows together into a single platform with role-based access and structured academic management.

---

# 💡 Solution

EduAssign Pro provides separate workspaces for:

### 👨‍💼 Administrator

Manage the overall academic environment.

### 👨‍🏫 Teacher

Create assignments, manage academic activities, review submissions, and provide feedback.

### 👨‍🎓 Student

Access assignments, submit answers, and view submission status and feedback.

The overall workflow is:

```text
                    EduAssign Pro
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
       Admin          Teacher        Student
          │              │              │
          │              │              │
     Manage Users    Assignments     Subjects
     Subjects        Submissions     Assignments
     Curriculum      Feedback        Submissions
     Relationships   Similarity      Results
```

---

# ✨ Core Features

## 👨‍💼 Admin Dashboard

The administrator has centralized control over the academic platform.

### User Management

- View all teachers
- View all students
- Search users
- Filter users
- Activate accounts
- Deactivate accounts
- Permanently delete users
- Safety checks before permanent deletion

### Academic Management

- Manage subjects
- Manage curriculum
- Manage teacher-student-subject relationships
- Manage assignments
- View academic activities
- Monitor application-level information

### Administrative Safety

Permanent deletion is protected with server-side validation.

For example:

```text
Admin Delete Request
        ↓
Authentication Check
        ↓
Role Authorization
        ↓
User Validation
        ↓
Safety Checks
        ↓
Related Data Handling
        ↓
Permanent Deletion
```

Administrators cannot delete administrator accounts or delete their own account.

---

# 👨‍🏫 Teacher Dashboard

Teachers have a dedicated workspace for managing their academic activities.

### Assignment Management

Teachers can:

- Create assignments
- Update assignments
- Delete assignments
- Define assignment title
- Add descriptions
- Set deadlines
- Set maximum marks
- Assign subjects
- Publish assignments
- Keep assignments as drafts

### Submission Management

Teachers can:

- View student submissions
- Open individual submissions
- Review student answers
- Assign marks
- Provide feedback
- Monitor submission status

### Academic Intelligence

The platform is designed to support:

- Assignment similarity analysis
- Academic document processing
- AI-assisted assessment generation
- RAG-based academic retrieval

---

# 👨‍🎓 Student Dashboard

Students have a simplified academic workspace.

### Student Features

- View assigned subjects
- View available assignments
- Open assignment details
- View deadlines
- Submit assignments
- Update submissions when permitted
- View submission status
- View marks
- View teacher feedback

### Student Workflow

```text
Login
  ↓
Student Dashboard
  ↓
Select Subject
  ↓
View Assignments
  ↓
Open Assignment
  ↓
Submit Answer
  ↓
Track Submission
  ↓
View Marks & Feedback
```

---

# 🔍 Assignment Similarity Analysis

EduAssign Pro includes an academic similarity analysis workflow designed to help teachers identify potentially similar student submissions.

The system can compare submitted content and generate similarity information that teachers can use during review.

### Workflow

```text
Student Submission
        ↓
Content Extraction
        ↓
Text Processing
        ↓
Vector Representation
        ↓
Similarity Calculation
        ↓
Similarity Score
        ↓
Teacher Review
```

The similarity result is intended to be an **assistive signal**, not an automatic academic misconduct decision.

Teachers should review the underlying submissions before making any final decision.

---

# 🧠 AI-Powered Academic Intelligence

A major extension of EduAssign Pro is the ability to use academic documents as a knowledge source for AI-assisted features.

For example, a teacher may upload a course PDF such as:

```text
Physics
 ├── Chapter 01
 ├── Chapter 02
 ├── Chapter 03
 └── Chapter 04
```

The document can then be processed for retrieval-based AI functionality.

### Academic Document Pipeline

```text
PDF / Academic Document
          ↓
     Text Extraction
          ↓
        Chunking
          ↓
     Embedding Creation
          ↓
      Vector Storage
          ↓
       Retrieval
          ↓
 Relevant Academic Context
          ↓
        LLM / AI
          ↓
     Generated Output
```

This approach allows AI features to use the teacher's own academic materials as context.

---

# 📝 AI-Assisted MCQ Generation

The platform is designed to support AI-assisted question generation from academic materials.

A teacher can select an academic document or relevant section and request:

> **Create MCQ**

The system can retrieve relevant content and generate multiple-choice questions from that material.

### Example

```text
Physics PDF
     ↓
Select Chapter / Topic
     ↓
Retrieve Relevant Content
     ↓
AI Processing
     ↓
Generate MCQs
     ↓
Question
 ├── Option A
 ├── Option B
 ├── Option C
 ├── Option D
 └── Correct Answer
```

Possible generation modes include:

- Topic-based questions
- Chapter-based questions
- Random questions
- Conceptual questions
- Numerical questions
- Different difficulty levels

The purpose is to reduce the manual effort required to prepare assessments while keeping generated questions grounded in the teacher's academic material.

---

# 🔄 RAG Architecture

The academic AI workflow follows a Retrieval-Augmented Generation approach.

```text
Teacher Query
      ↓
Query Processing
      ↓
Embedding
      ↓
Vector Search
      ↓
Relevant Academic Chunks
      ↓
Context Construction
      ↓
LLM
      ↓
Generated Response
```

Instead of depending entirely on the model's general knowledge, the system can provide retrieved academic content as context before generating the final response.

---

# 🏗️ System Architecture

```text
                         ┌─────────────────────┐
                         │      Frontend       │
                         │  Next.js / React    │
                         │    TypeScript       │
                         └──────────┬──────────┘
                                    │
                                    │ REST API
                                    ▼
                         ┌─────────────────────┐
                         │     Backend API     │
                         │    ASP.NET Core     │
                         │        C#           │
                         └──────────┬──────────┘
                                    │
               ┌────────────────────┼────────────────────┐
               │                    │                    │
               ▼                    ▼                    ▼
       ┌──────────────┐     ┌──────────────┐    ┌──────────────┐
       │   Database   │     │ AI / RAG     │    │  Similarity  │
       │   MongoDB    │     │   Pipeline   │    │   Analysis   │
       └──────────────┘     └──────────────┘    └──────────────┘
```

---

# 🔐 Authentication & Authorization

EduAssign Pro uses authenticated access with role-based authorization.

### Roles

| Role | Responsibilities |
|------|------------------|
| Admin | Manage users, subjects, curriculum and academic relationships |
| Teacher | Manage assignments, students, submissions and feedback |
| Student | View assignments, submit work and track results |

Authorization is enforced at the backend API level rather than relying only on frontend route protection.

---

# 🛡️ Security & Data Safety

The application includes server-side safety checks for sensitive operations.

### User deletion safeguards

- Authentication is required
- Admin authorization is required
- Administrator accounts cannot be deleted
- An administrator cannot delete their own account
- Non-existing users return an appropriate error
- Related academic records are handled before permanent deletion

### API behavior

```text
Unauthorized Request
        ↓
       401

Authenticated but Unauthorized
        ↓
       403

User Not Found
        ↓
       404

Unsafe Delete Operation
        ↓
       409

Successful Delete
        ↓
       204
```

---

# 📊 Application Modules

| Module | Status |
|--------|--------|
| Admin Dashboard | ✅ |
| Teacher Management | ✅ |
| Student Management | ✅ |
| Subject Management | ✅ |
| Curriculum Management | ✅ |
| Teacher-Student-Subject Management | ✅ |
| Assignment Management | ✅ |
| Submission Management | ✅ |
| Authentication | ✅ |
| Role-Based Authorization | ✅ |
| User Activation / Deactivation | ✅ |
| Permanent User Deletion | ✅ |
| Assignment Similarity Analysis | ✅ |
| Academic Document Processing | 🚧 |
| RAG-Based Academic Retrieval | 🚧 |
| AI MCQ Generation | 🚧 |
| Advanced AI Assessment Tools | 🚧 |

> Features marked as 🚧 represent the planned or evolving AI/academic intelligence layer and may depend on the configured AI and vector-processing services.

---

# 🛠️ Technology Stack

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- Axios
- React Hook Form
- Zod
- Lucide React
- Sonner

## Backend

- ASP.NET Core Web API
- C#
- RESTful API
- Repository Pattern
- Service Layer
- Validation
- Error Handling
- Logging
- Swagger / OpenAPI

## Database

- MongoDB

## AI / Machine Learning

- Retrieval-Augmented Generation (RAG)
- Vector Embeddings
- Large Language Models
- AI-assisted MCQ Generation
- Assignment Similarity Analysis

## Testing

- TypeScript Compiler
- .NET testing infrastructure
- API testing
- Playwright browser testing

## Development Tools

- Git
- GitHub
- Visual Studio Code
- npm
- .NET CLI

---

# 📁 Project Structure

```text
EduAssign/
│
├── web/
│   ├── public/
│   └── src/
│       ├── app/
│       │   ├── admin/
│       │   ├── teacher/
│       │   ├── student/
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
│   └── EduAssignPro.Tests/
│
├── ml-service/
│
├── qa-scripts/
│
├── .env.example
├── docker-compose.yml
└── README.md
```

---

# 🚀 Getting Started

## Prerequisites

Make sure the following are installed:

- Node.js
- npm
- .NET SDK
- MongoDB
- Git

---

## 1. Clone the Repository

```bash
git clone https://github.com/mamun657/EduAssign.git

cd EduAssign
```

---

## 2. Configure Environment Variables

Create the required environment files from the provided example configuration.

```bash
cp .env.example .env
```

For Windows PowerShell, copy the file manually if required:

```powershell
Copy-Item .env.example .env
```

Do not commit real passwords, API keys, JWT secrets, or other sensitive credentials.

---

# 🌐 Frontend Setup

Move into the frontend directory:

```bash
cd web
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The frontend will normally be available at:

```text
http://localhost:3000
```

---

# ⚙️ Backend Setup

Open another terminal and navigate to the backend:

```bash
cd server
```

Restore .NET dependencies:

```bash
dotnet restore
```

Build the backend:

```bash
dotnet build
```

Run the API:

```bash
dotnet run
```

The exact API port is determined by the project's configured launch/environment settings.

---

# 🗄️ Database Setup

EduAssign Pro uses MongoDB for persistent application data.

Before running the backend:

1. Make sure MongoDB is running.
2. Configure the MongoDB connection string in the environment configuration.
3. Start the backend.
4. Run the available seed/setup process if required by the project.

The application manages the required collections and relationships through its backend infrastructure.

---

# 🔑 Demo Credentials

For evaluation, provide working accounts for all three roles.

| Role | Email | Password |
|------|-------|----------|
| Admin | `YOUR_ADMIN_EMAIL` | `YOUR_ADMIN_PASSWORD` |
| Teacher | `YOUR_TEACHER_EMAIL` | `YOUR_TEACHER_PASSWORD` |
| Student | `YOUR_STUDENT_EMAIL` | `YOUR_STUDENT_PASSWORD` |

> Replace the placeholder values above with the actual demo credentials before submitting the project.

Do not commit real production credentials or private secrets.

---

# 🧪 Testing & Verification

## TypeScript Check

From the `web` directory:

```bash
npx tsc --noEmit
```

## Frontend Build

```bash
npm run build
```

## Backend Build

From the `server` directory:

```bash
dotnet build
```

## Backend Tests

```bash
dotnet test
```

## Browser Testing

Playwright can be used for browser-level verification:

```bash
npx playwright test
```

Important workflows should be checked in a real browser, including:

- Login
- Role-based navigation
- Admin user management
- Teacher assignment management
- Student assignment access
- Assignment submission
- Submission review
- User deletion
- API error handling

---

# 🧪 Example API Validation

Important API behavior includes:

```text
Login
  → 200 OK

Unauthorized request
  → 401 Unauthorized

Forbidden operation
  → 403 Forbidden

Missing resource
  → 404 Not Found

Unsafe delete
  → 409 Conflict

Successful permanent delete
  → 204 No Content
```

---

# 📋 Important Design Decisions

## Role-Based Architecture

The system separates Admin, Teacher, and Student responsibilities to keep permissions clear and enforce access control at the API level.

## Repository & Service Layers

The backend separates data-access operations from application/business logic.

This makes the codebase easier to maintain and allows business rules to remain independent from direct database operations.

## MongoDB Data Model

MongoDB was selected as the project's database because it fits the application's document-oriented academic records and allows flexible handling of entities such as users, assignments, submissions, subjects, and similarity analysis results.

## AI as an Assistive Layer

AI features are designed to assist teachers rather than replace academic judgment.

For example, similarity analysis provides signals for teacher review, while AI-generated questions should be reviewed before being used in an assessment.

---

# ⚠️ Assumptions

The following assumptions were made where the project requirements did not specify an exact implementation:

1. A user can have one primary application role.
2. Teachers and students are managed by administrators.
3. Assignments are associated with teachers, students, and subjects.
4. Students can only access assignments relevant to their academic relationships.
5. Teachers can review submissions associated with their assignments.
6. Permanent user deletion requires server-side safety validation.
7. AI-generated educational content should be reviewed by a teacher before official use.
8. Similarity analysis is an assistive mechanism and does not independently determine plagiarism.
9. MongoDB is used instead of PostgreSQL as the selected database implementation.

---

# ⚠️ Known Limitations

- AI-generated questions may require teacher review before publication.
- Similarity scores should not be treated as definitive proof of plagiarism.
- AI functionality depends on the availability and configuration of the selected model/service.
- Vector retrieval quality depends on document quality, chunking, embeddings, and retrieval configuration.
- The current platform is primarily designed as a web application.
- Production deployment requires appropriate security configuration, secrets management, monitoring, and database infrastructure.

---

# 🔮 Future Improvements

Possible future improvements include:

- Advanced AI question generation
- Automatic question difficulty classification
- Question bank management
- AI-generated assignment suggestions
- Student performance analytics
- Personalized learning recommendations
- Advanced semantic plagiarism detection
- Teacher analytics dashboard
- AI-assisted grading
- Automatic feedback generation
- Assignment quality analysis
- Mobile application
- Notification system
- Email notifications
- Docker-based production deployment
- Cloud deployment
- Advanced pagination and filtering

---

# 🎯 Vision

EduAssign Pro aims to evolve from a traditional assignment management system into a broader academic intelligence platform.

The long-term vision is to allow teachers to use their own course materials to:

```text
Upload Academic Material
          ↓
     Build Knowledge Base
          ↓
      Retrieve Content
          ↓
      Generate Questions
          ↓
      Review Submissions
          ↓
     Analyze Similarity
          ↓
      Understand Results
```

This creates a workflow where academic content, assignment management, assessment creation, and submission analysis can exist within one platform.

---

# 📌 Project Requirements Alignment

The project was developed around the requirements of the **Assistant Software Engineer Recruitment Project – Assignment & Submission Management System**.

The requested project emphasizes:

- Role-based school/college workflows
- Admin, Teacher, and Student roles
- Assignment creation and management
- Student submissions
- Marks and feedback
- RESTful API
- Authentication and authorization
- Database relationships
- Testing
- Clear README documentation

EduAssign Pro implements these core workflows while extending the platform with additional academic intelligence capabilities.

---

# 📈 Project Highlights

### Academic Management

- Centralized user management
- Subject and curriculum management
- Teacher-student relationships
- Assignment lifecycle management
- Submission workflow

### Backend Engineering

- ASP.NET Core Web API
- REST architecture
- Role-based authorization
- Repository and service layers
- Validation and error handling
- Logging

### Frontend Engineering

- Next.js
- React
- TypeScript
- Responsive dashboard interfaces
- Form validation
- API integration
- Role-specific navigation

### AI & Data Intelligence

- Assignment similarity analysis
- Academic document processing
- RAG architecture
- Vector-based retrieval
- AI-assisted MCQ generation

---

# 👨‍💻 Author

## Mohammed Minul Islam

**Software Developer | Full-Stack Developer | AI/ML Enthusiast**

Interested in building practical software products that combine modern web technologies with AI and machine learning.

### GitHub

https://github.com/mamun657

---

# ⭐ Support

If you find **EduAssign Pro** useful or interesting, consider giving the repository a ⭐ on GitHub.

---

<p align="center">
  Built with ❤️ for better academic workflows.
</p>
