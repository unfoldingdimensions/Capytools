---
name: creating-coding-prompts
description: Generates high-precision, role-specific prompts for coding tasks (frontend, backend, database, refactoring) using advanced techniques like Chain-of-Thought, TDD, and persona injection. Use when the user needs to formulate a complex coding request or "meta-prompt".
---

# Coding Prompt Creator

This skill generates expert-level prompts for AI coding assistants. It encapsulates "small nuances, all tricks, and all techniques" to ensure the generated code is high-quality, maintainable, and context-aware.

## When to use this skill
- The user asks for help writing a prompt for another AI (or this one).
- The user has a complex coding task and needs a structured plan/prompt to execute it.
- The user mentions "Coding-Prompt-Creater" or asks for "best prompting principles".
- The user wants to "refactor this code" but needs a strategy first.

## Workflow
1.  **classify_intent**: Specify the domain (Frontend, Backend, DB, Auth, Refactoring).
2.  **multi_perspective_analysis**: BEFORE responding, analyze the request from multiple angles (User, Developer, Security, Scalability) to identify gaps.
3.  **strategic_interrogation**: Ask the user detailed follow-up questions about specific features, edge cases, nuances, or preferred tools.
    *   *Constraint*: Do not generate the final prompt yet. Wait for the user's answers.
4.  **select_strategy**: Choose the best prompting pattern (CoT, TDD, Persona, etc.) based on the refined context.
5.  **generate_prompt**: Construct the final prompt using the "Perfect Prompt Architecture".
6.  **save_artifact**: Save the generated prompt to a file named `[topic]_prompt.md`.
7.  **provide_guide**: Give the user a step-by-step guide on how to use the generated file to execute the code generation in phases.

## Multi-Directional Thinking & Questioning
Before asking questions, you must simulate the problem from different perspectives to ensure your questions are insightful, not just generic.

**Perspectives to simulate:**
1.  **The Cynical QA**: "What happens if the network fails? What if the input is 1GB?"
2.  **The Minimalist Designer**: "Is this feature actually necessary? Can we simplify the UI?"
3.  **The Security Auditor**: "Where is the PII? Is the input sanitized?"
4.  **The Future Maintainer**: "Will this code make sense in 6 months? Is it too coupled?"

**Example Question Formulation:**
*   *Bad*: "What tools do you want to use?"
*   *Good (derived from 'Future Maintainer' perspective)*: "You mentioned using Redux. Since this is a small app, would you prefer a lighter solution like Zustand or Context API to reduce boilerplate, or stick to Redux for strict enterprise patterns?"

## The "Perfect Prompt" Architecture
Every generated prompt must follow this structure:
1.  **Persona/Role**: Who is the AI? (e.g., "Senior Security Engineer", "UX Design Lead").
2.  **Context**: The "World State" (Tech stack, variable names, existing patterns). Use XML tags `<context>...</context>`.
3.  **Task**: The specific instruction (Active verbs, broken down steps).
4.  **Constraints**: Negative constraints ("Do NOT use...", "Must be dry").
5.  **Output Format**: How the response should look (Code block, JSON, Markdown).
6.  **Verification**: A self-correction step ("Review your code for X").

---

## Domain-Specific Nuances (The "Tricks")

### 1. Frontend (UI/UX)
- **Nuance**: Visuals are subjective; Logic is objective.
- **Tricks**:
    - **"Visual Hierarchy First"**: Ask for the DOM structure/Layout rationale *before* CSS.
    - **"Accessibility Guard"**: "Ensure 100% WCAG AA compliance. Use semantic HTML."
    - **"State-Visual Separation"**: "First define the state interface, then the visual component."
    - **Pattern**: "Act as a Design Systems Engineer. Modernize this component using the 'Swiss Modern' aesthetic."

### 2. Backend (API/Logic)
- **Nuance**: Correctness, Error Handling, and Performance are paramount.
- **Tricks**:
    - **"Happy Path Last"**: "Handle all error cases (Network, Auth, Validation) *before* writing the success logic."
    - **"Idempotency Check"**: "Ensure this API endpoint is safe to retry 10 times."
    - **"TDD Injection"**: "Write the PyTest case for this function first, covering edge cases A, B, and C."

### 3. Database (SQL/NoSQL)
- **Nuance**: Data integrity is hard to repair.
- **Tricks**:
    - **"Explain Plan"**: "Before writing the query, explain the expected execution plan and index usage."
    - **"Migration Safety"**: "Write the migration safely (lock checks). Include the Down/Rollback script."
    - **"N+1 Detector"**: "Explicitly check for and resolving N+1 query issues in this ORM fetch."

### 4. Authorization & Security
- **Nuance**: Fail-closed, not fail-open.
- **Tricks**:
    - **"Attacker Mindset"**: "Critique this code as a Red Teamer. Where would you inject SQL? How would you bypass Auth?"
    - **"Principle of Least Privilege"**: "Ensure the query only selects the strict minimum columns needed."

### 5. Refactoring
- **Nuance**: Don't break existing behavior.
- **Tricks**:
    - **"The Pattern Lift"**: "Refactor this widely-used function. Apply the 'Strategy Pattern' to remove the switch statement."
    - **"Cognitive Load Reduction"**: "Rewrite this to have a maximum indentation depth of 2."
    - **"Legacy Wrapper"**: "Isolate the legacy code behind an interface before changing the internals."

---

## Instruction: How to Generate a Prompt

When the user asks you to create a prompt, follow this interaction loop:

### Phase 1: Analysis & Questioning (The "Pause")
**Internal Thought Process:**
- *Intent*: [User goal]
- *Perspectives Tested*: [Security, UX, Ops]
- *Missing Info*: [Tools, specific error handling preference, scale]

**Agent Output to User:**
"I have analyzed your request. To build the perfect prompt, I need to clarify a few nuances from different angles:
1.  **(From a Security perspective)**: How should we handle failed auth attempts? Silent fail or specific error messages?
2.  **(From a Tooling perspective)**: You mentioned 'database'. Are we strictly using the existing SQLite, or should I prep the prompt for a future migration to Postgres?
3.  ...
"

- [Negative Constraint 1]
- [Negative Constraint 2]

# Verification Plan
- Before outputting code, verify:
  1. [Check 1]
  2. [Check 2]
```

---

## Example Usage

**User Input:** "Help me write a prompt to fix a slow SQL query."

**Agent Output:**
"Here is a high-precision prompt you can use:

```markdown
**Act as:** A Database Reliability Engineer (DBRE).

**Context:**
We have a PostgreSQL 15 database. Table `orders` has 10M rows.
The query `SELECT * FROM orders WHERE user_id = ? AND status = 'pending'` is taking 2s.

**Task:**
1. Analyze the provided query and scheme.
2. Explain *why* it is slow (missing index? cardinality?).
3. Propose a Composite Index strategy.
4. Rewrite the query if necessary to function with the index.

**Constraints:**
- Do NOT suggest `VACUUM FULL`.
- Ensure the index creation is `CONCURRENTLY`.

**Output:**
- SQL for Index creation.
- Explanation of the B-Tree lookup.
```
"
