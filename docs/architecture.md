# Architecture Documentation

## Overview
The application is built on Next.js 14 utilizing the App Router. It follows a component-based architecture with a focus on accessibility, state management separation, and atomic design principles.

## Core Components

### Dashboard (`/dashboard`)
Refactored from a monolithic client into:
- **`DashboardHeader`**: Sticky navigation and user controls.
- **`DashboardStats`**: Bento-grid style statistics display.
- **`ResumeGrid`**: Main document management interface.
- **`UploadsList`**: Sidebar component for recent file uploads.
- **`DashboardClient`**: Top-level container managing data fetching (SWR/Fetch) and local state.

### Resume Builder (`/resume/[id]`)
Refactored for performance and maintainability:
- **`BuilderLayout`**: Structural shell handling responsive sidebar and main content area.
- **`BuilderHeader`**: Navigation, title management, and action buttons (Save/Preview).
- **`SectionNavigation`**: Progress tracking and section switching.
- **`ResumeBuilder`**: Orchestrator component. Connects to Redux store (`resumeSlice`) and manages form visibility.

## State Management
- **Global UI State**: Managed via React Context (e.g., `TailoringContext`).
- **Resume Data**: Managed via Redux Toolkit (`resumeSlice`) to handle complex nested updates and auto-saving.
- **Server State**: Managed via React Query or standard `useEffect` + `fetch` patterns in container components.

## Design Systems
- **Styling**: Tailwind CSS with custom design tokens (see `design-tokens.md`).
- **Icons**: Lucide React.
- **Components**: Radix UI primitives (Dialog, Slot) wrapped in custom `ui` components.

## Accessibility
- **Focus**: Global focus ring handling via `globals.css`.
- **Navigation**: `SkipLink` implemented for keyboard users.
- **ARIA**: All interactive elements (Buttons, Modals) adhere to WAI-ARIA patterns.
