# Software Requirements Specification (SRS)
## AI-Powered Quiz Generator for Students

---

## 1. Introduction

### 1.1 Purpose
The purpose of this document is to specify the software requirements for an AI-Powered Quiz Generator. This web application is tailored for students, enabling them to upload study materials (PDFs) and automatically generate interactive, multi-format quizzes using Large Language Model (LLM) agents.

### 1.2 Scope
The application will provide a seamless end-to-end workflow: from document ingestion and context scoping to taking interactive quizzes. It utilizes a LangGraph-based agentic system to generate high-quality questions and detailed explanations. The primary goal is to enhance study efficiency through active recall and personalized testing.

### 1.3 Target Audience
- **Students (High School, University, Lifelong Learners):** Users looking to test their knowledge on specific lecture notes or textbook chapters.

---

## 2. Overall Description

### 2.1 Product Perspective
The system operates as a layered monolithic web application. The frontend provides a highly interactive and responsive user experience, while the Django-based backend handles data persistence, user sessions, and orchestrates the sophisticated LangGraph agent workflows needed for AI generation.

### 2.2 Technology Stack
*   **Frontend:** ReactJS, TailwindCSS, Material-UI (MUI) for complex structural components, and HeroIcons for iconography.
*   **Backend:** Python, Django (Django REST Framework for API construction).
*   **AI/Agent System:** LangGraph for building stateful, multi-actor LLM applications.
*   **Database:** PostgreSQL for relational data storage (users, quiz history, document metadata).

---

## 3. System Features (Functional Requirements)

### 3.1 Document Ingestion & Context Scoping
*   **PDF Upload:** The main workspace features a drag-and-drop zone to import PDF files (e.g., lecture notes).
*   **Content Scoping:** Users can select specific pages, chapters, or highlight text to narrow down the context from which the quiz will be generated.
*   **Context Extension (Agentic Web Search):** Users can toggle an option to let the agent search additional external resources to supplement the PDF content and generate more comprehensive questions.

### 3.2 AI Agent System (LangGraph Workflow)
The backend utilizes an agent pipeline to create educational content:
1.  **Extraction Agent:** Parses text and tables from the PDF.
2.  **Context & Search Agent:** Filters the text based on user scoping and optionally fetches external context.
3.  **Quiz Generation Agent:** Formulates diverse question types based on the context.
4.  **Evaluation/Explanation Agent:** Generates detailed reasoning for correct/incorrect options.

### 3.3 Quiz Interface & Mechanics
*   **Interactive Flashcards:** For standard Multiple Choice Questions, the UI presents a flashcard. When a user selects an answer, the card flips with an animation to reveal if they were right/wrong, along with the agent-generated explanation.
*   **Diverse Question Types:**
    *   *Multiple Choice Questions (Flashcard style)*
    *   *Multiple Answer Selection (Tick boxes)*
    *   *Fill in the Blanks*
    *   *Structured-type Questions:* Short-form text input where the LLM evaluates the user's semantic understanding.
*   **Mock Exam Mode:** A timed, comprehensive test mode combining all question types into a formal exam interface.

### 3.4 Dashboard & Navigation
*   **Header / Navbar:** Includes branding, user profile, and global navigation.
*   **Sidebar Tabs:** 
    *   **Previous Quizzes:** A history tab allowing users to revisit past quizzes, review explanations, and see their scores.
    *   **New Quiz:** A prominent button/tab to initialize a new PDF upload.
*   **Footer:** Standard links to terms, privacy, and support.

### 3.5 Proposed Additional Features (Refinement Ideas)
*   **Spaced Repetition System (SRS):** The app tracks historical performance and suggests "weak areas" or past quizzes to retake at optimal intervals.
*   **Export to Anki/Quizlet:** Allow users to export the generated MCQ flashcards to popular study apps via CSV.
*   **Gamification:** Implement study streaks and mastery badges to keep students motivated.

---

## 4. User Interface Requirements

### 4.1 Layout Overview
*   **Header:** Fixed top navigation.
*   **Left Sidebar:** Collapsible menu containing History (Previous Quiz Tabs) and "Create New Quiz" action.
*   **Main Content Area:** Dynamically switches between:
    *   *Upload & Scope View:* PDF viewer alongside scoping controls.
    *   *Active Quiz View:* The flashcard/testing interface.
    *   *Results View:* Score summary and explanations.

### 4.2 Design System
*   **Aesthetics:** Modern, clean, "study-focused" UI using TailwindCSS. Consistent use of primary colors to indicate interactive elements, with accessible contrast for reading long text. MUI components will be utilized for complex interactive elements like data tables (for history) or sliders (for scoping).

---

## 5. Non-Functional Requirements

### 5.1 Architecture & Maintainability
*   **Layered Monolithic Architecture:** The Django backend will cleanly separate the API/Presentation layer, the Business Logic layer (where LangGraph resides), and the Data Access layer (PostgreSQL models). This ensures the application is easy to deploy and maintain while allowing internal modularity.

### 5.2 Performance & Scalability
*   **Asynchronous Processing:** Since LLM generation can be slow, PDF processing and quiz generation must be handled asynchronously (e.g., using Celery with Django) to prevent blocking the UI. The frontend will display a loading skeleton/progress bar.

### 5.3 Data Privacy & Security
*   **User Isolation:** Uploaded PDFs and generated quizzes are strictly tied to the user's account and cannot be accessed by others.
*   **Ephemeral Storage Option:** Allow users to delete PDFs from the server immediately after the quiz is generated to protect proprietary study material.
