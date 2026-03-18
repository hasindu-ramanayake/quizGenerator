# AI-Powered Quiz Generator

## Overview
This is a web application aimed at students to generate Multiple Choice Quizzes, Flashcards, and other question formats using LLM agents based on user-provided PDFs. 

## Prerequisites
- Docker
- Docker Compose

## Getting Started

1. **Clone/Navigate to the repository:**
   Ensure you are in the `quiz-generator` root directory.

2. **Environment Variables:**
   A `.env` file should be present in the backend folder to hold API keys (like OpenAI or Anthropic for LangGraph) and database credentials. You can copy an example from `.env.example` if available.

3. **Build and Run (Dockerized Setup):**
   Run the following command to start both the frontend and backend services:
   ```bash
   docker compose up --build -d
   ```

4. **Access the application:**
   - **Frontend (React):** [http://localhost:5173](http://localhost:5173)
   - **Backend API (Django):** [http://localhost:8000](http://localhost:8000)
   - **Database (PostgreSQL):** Exposed on port `5432`

## Development Notes
- The React frontend uses Vite, TailwindCSS, and Material UI. It supports live reloading on port 5173.
- The Django backend runs on port 8000. Changes to Django code will be automatically reloaded by the Django dev server inside the container.
