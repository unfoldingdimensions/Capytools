---
name: codebase-refactoring
description: Expert guidance for restructuring existing code without changing its external behavior. Use this skill when the user asks to "cleanup", "refactor", "improve structure", "reduce technical debt", or when "code smells" are identified.
---

# Codebase Refactoring Skill

This skill provides a disciplined approach to improving the internal design of a codebase while preserving its external behavior.

## Core Principles

1.  **The Two Hats:** Never mix refactoring with adding new features or fixing bugs. If you are refactoring, do not change behavior. If you are adding a feature, do not refactor unless it's "preparatory refactoring" to make the feature easier to add.
2.  **Small Incremental Steps:** Refactor in tiny, manageable steps. After each step, verify that the code still works.
3.  **Test-First Refactoring:** ALWAYS ensure you have a solid test suite before starting. If tests are missing, your first task is to write them.
4.  **No Behavior Change:** If the tests pass before and after the change, and the logic remains logically equivalent, the refactor is successful.
5.  **Clean Code over Clever Code:** Prioritize readability, maintainability, and clarity. Follow SOLID, DRY, and KISS principles.

## Refactoring Workflow

### 1. Identify the Need
- **Code Smells:** Long methods, large classes, duplicate code, "magic numbers", feature envy, primitive obsession.
- **Preparatory:** Restructuring to make an upcoming feature easier to implement.
- **Comprehension:** Refactoring to understand complex code better.

### 2. Establish a Safety Net
- Verify existing tests pass: `npm test`, `pytest`, etc.
- If tests are missing, create them to document current behavior.
- Ensure type-checking and linting are passing.

### 3. Apply Techniques (One at a Time)
- **Extraction:** `Extract Method`, `Extract Class`, `Extract Variable`.
- **Simplification:** `Replace Conditional with Polymorphism`, `Decompose Conditional`, `Consolidate Duplicate Conditional Fragments`.
- **Organization:** `Move Method`, `Rename Method/Variable` (for clarity), `Encapsulate Field`.
- **Generalization:** `Form Template Method`, `Extract Interface`.

### 4. Verify & Commit
- Run tests after *every* small change.
- Run linting/type-checking.
- Commit refactors separately from feature work with clear messages (e.g., `refactor: extract user validation logic to service`).

## Rules & Guardrails

- **NEVER** refactor code that doesn't have tests unless you are adding those tests first.
- **NEVER** change the public API of a module/service if other modules depend on it, unless you update all consumers simultaneously.
- **AVOID** "Big Bang" refactorings. If it takes more than a few hours, break it down.
- **RESPECT** existing project conventions (naming, file structure, patterns).

## Common Techniques

| Technique | Description |
| :--- | :--- |
| **Extract Method** | Turn a code fragment into a method whose name explains the purpose of the method. |
| **Extract Class** | When one class does the work of two, create a new class and move the relevant fields and methods. |
| **Rename Symbol** | Change names of methods, variables, or classes to better reflect their intent. |
| **Inline Method** | If a method body is just as clear as its name, put the method body into its callers and remove the method. |
| **Replace Magic Number** | Replace a literal value with a symbolic constant. |
| **Decompose Conditional** | Extract the `if`, `then`, and `else` parts into separate methods. |
