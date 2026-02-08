---
name: brainstorming-ideas
description: Facilitates creative exploration of user intent, requirements, and design before implementation. Use when the user needs to discuss ideas, design features, or clarify requirements.
---

# Brainstorming Ideas Into Designs

## When to use this skill
- When the user wants to add a new feature but hasn't provided a full spec.
- When the user asks "How should we build this?" or "What do you think?".
- Before strictly following the `planning-implementation` skill if the requirements are vague.
- When the user want to brainstorm about a new idea from scratch.

## Workflow

### 1. Understanding the Idea
- **Context Check**: Briefly list files/docs/commits reviewed to understand current state.
- **Clarification Loop**:
  - Ask **one question at a time**.
  - Prefer multiple-choice questions (A/B/C) to reduce friction.
  - Focus on purpose, constraints, and success criteria.

### 2. Exploring Approaches
- Propose **2-3 different approaches** with trade-offs (e.g. "Quick & Dirty", "Robust & Scalable", "Bleeding Edge").
- Explain your recommendation and reasoning.

### 3. Presenting the Design
- Once understanding is solidified, present the design in **small sections** (200-300 words).
- Pause after each section to ask: "Does this look right so far?"
- Cover:
  - Architecture & Components
  - Data Flow & State Management
  - Error Handling
  - Testing Strategy

### 4. Documentation (Post-Agreement)
- Write the final validated design to a markdown file (e.g., `docs/plans/YYYY-MM-DD-topic-design.md`) if requested.
- If proceeding to implementation, transition to the `planning-implementation` skill.

## Guidelines
- **YAGNI (You Ain't Gonna Need It)**: Ruthlessly suggest removing unnecessary complexity.
- **Degrees of Freedom**: This is a high-freedom skill. Use your judgment to guide the user, but don't invent requirements they didn't ask for without validation.
- **Incremental Validation**: Never write a massive design doc in one go. Validate piece by piece.
