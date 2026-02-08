---
name: planning-implementation
description: Generates comprehensive implementation plans for multi-step tasks. Use when you have a spec or requirements and need a detailed roadmap before coding.
---

# Planning Implementation

## When to use this skill
- When requirements are clear (possibly after `brainstorming-ideas`).
- When the user asks for a plan, roadmap, or step-by-step guide.
- Before starting any complex coding task involving multiple files.

## Workflow

### 1. Context Setup
- Assume the implementer (could be you or another agent) has **zero context**.
- Reference specific file paths and existing code structures.

### 2. Plan Header Structure
Every plan file (e.g., `docs/plans/YYYY-MM-DD-feature.md`) must start with:

```markdown
# [Feature Name] Implementation Plan

**Goal:** [One sentence describing what this builds]
**Architecture:** [2-3 sentences about approach]
**Tech Stack:** [Key technologies/libraries]
```

### 3. Task Granularity (The "Bite-Sized" Rule)
Break work into atomic tasks (2-5 mins each). Each task should follow TDD:
1.  **Write Failing Test**: `git add ...` -> `commit`
2.  **Verify Failure**: Command to run.
3.  **Minimal Implementation**: Code to pass test.
4.  **Verify Success**: Command to run.
5.  **Commit**: `git commit -m ...`

### 4. Task Template
Use this structure for every task in the plan:

```markdown
### Task N: [Component/Feature Name]

**Files:**
- Create: `src/path/to/new_file.ts`
- Modify: `src/path/to/existing.ts`

**Step 1: Test**
- Create/Update testing code to assert new behavior.
- Run: `npm test -- filter`
- Expect: FAIL

**Step 2: Implement**
- Write the code.

**Step 3: Verify**
- Run: `npm test -- filter`
- Expect: PASS

**Step 4: Commit**
- `git add .`
- `git commit -m "feat: implement X"`
```

## Guidelines
- **Exact Paths**: Alway use absolute or relative paths from root.
- **Black Box**: Instructions should be clear enough for a junior dev to follow without asking questions.
- **DRY/YAGNI**: Don't plan for features not requested.
- **Reference Skills**: If a task requires a specific skill (e.g., database migration), mention it.
