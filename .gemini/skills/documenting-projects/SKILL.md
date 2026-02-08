---
name: documenting-projects
description: Generates comprehensive technical documentation for the project, including architecture, file mapping, dependency graphs, and operational guardrails. Use when the user needs a technical overview, a README update, or a project handover document.
---

# Project Documentation Generator

This skill generates high-fidelity technical documentation. It is designed to map the codebase for other agents or developers, effectively acting as a "ReadMe on Steroids".

## When to use this skill
- The user asks to "document the project" or "create a technical design doc".
- The user needs a "map" of the codebase.
- The user is preparing for a project handover or onboarding a new developer.

## Usage

```
/technical_doc <prompt>
```

## Workflow
1.  **explore_codebase**:
    *   Use `list_dir` to understand the high-level folder structure.
    *   Use `find_by_name` to identify key source files (ignoring node_modules, build, etc.).
2.  **analyze_components**:
    *   Read key entry points (e.g., `main.dart`, `app.py`, `index.js`).
    *   Identify core domain logic, repositories, and UI components.
3.  **map_dependencies**:
    *   Trace imports to build a mental dependency graph (Module A -> Module B).
4.  **generate_report**:
    *   Create a markdown file named `TECHNICAL_DOCS.md` (or user specified name).
    *   Fill the file strictly following the **Standard Template** below.

## Instructions
- **Accuracy is paramount**: Do not guess function names. If you haven't read the file, do not list specific functions for it.
- **Visuals**: Use Markdown tree structures for directories.
- **Tables**: Use Markdown tables for the File-to-Function mapping.

## Standard Documentation Template

You must use this exact structure for the output:

### 1. Introduction & Project Scope
*   **1.1 Purpose**: High-level objective of the tool/app.
*   **1.2 System Architecture**: 
    *   Description of the design pattern (Clean Arch, MVC, etc.).
    *   **ASCII Diagram**: A visual representation of the layers (e.g., Presentation -> Domain -> Data).
*   **1.3 Technology Stack**: Table of languages, frameworks, and significant libraries.

### 2. Implementation Registry (The Core)
*   **2.1 Directory Structure**: A visual tree representation of the project folders.
*   **2.2 File-to-Function Mapping**:
    *   **Group by Layer** (e.g., Core, Domain, Data, Presentation).
    *   Table format:
        | File Name | Responsibility | Key Functions/Classes | Primary Dependencies |
        | :--- | :--- | :--- | :--- |
        | `lib/main.dart` | Entry point | `main()`, `App` | `flutter`, `core` |
*   **2.3 Dependency Graph**: 
    *   **ASCII Diagram**: Visual flow of dependencies (e.g., UI -> Bloc -> Use Case -> Repo).

### 3. Logic & Data Flow
*   **3.1 Core Logic Flow**: 
    *   Step-by-step breakdown of key user flows (e.g., "User Action -> Event -> Use Case -> DB -> State").
*   **3.2 Data Schema**:
    *   **Entities/Models**: Class definitions or JSON structures.
    *   **Database Schema**: SQL `CREATE TABLE` statements or NoSQL schemas.
    *   **State Objects**: BLoC states or Redux store shapes.

### 4. API & Interface Specifications
*   **4.1 Internal API (Use Cases/Services)**:
    *   Table format:
        | Use Case | Signature | Input | Output | Description |
        | :--- | :--- | :--- | :--- | :--- |
        | `AddNote` | `call(Note n)` | `Note` | `int (id)` | Adds a note to DB |
*   **4.2 External API**: Remote endpoints used or exposed.
*   **4.3 Configuration**: Environment variables, Shared References keys, or Database config.

### 5. Setup & Operational Guardrails
*   **5.1 Prerequisites**: Required tools and versions.
*   **5.2 Installation & Run**: 
    *   Setup commands (`pub get`).
    *   Run commands (`flutter run`).
    *   Test commands (`flutter test`).
    *   Build commands (`flutter build`).
*   **5.3 Critical Constraints**: Layout rules, Database constraints (Foreign Keys), or specific Coding Patterns (e.g., "BLoC events must be Equatable").
