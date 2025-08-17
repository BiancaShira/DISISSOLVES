# Overview

DisiSolves is a web-based internal troubleshooting system designed to function like a private StackOverflow for workplace IT/software issues. The platform enables employees to raise, view, and solve daily problems specifically around IBML Scanners, SoftTrac, and OmniScan systems. The application features role-based access control with three user types (Admin, User, Supervisor) and implements a question-answer workflow with approval mechanisms.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Framework**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with custom design tokens and CSS variables for theming
- **Build Tool**: Vite for fast development and optimized production builds

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules for modern JavaScript features
- **Authentication**: Passport.js with local strategy and session-based auth
- **Session Management**: Express sessions with MySQL session store
- **API Design**: RESTful endpoints with role-based middleware protection

## Database Architecture
- **Database**: MySQL for XAMPP compatibility on local development
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema**: Structured with enums for categories (IBML, SoftTrac, OmniScan), user roles (admin, user, supervisor), and status tracking
- **Key Tables**: Users, Questions, Answers, Activity Log with proper foreign key relationships
- **Migrations**: Drizzle Kit for schema management and database migrations

## Authentication & Authorization
- **Strategy**: Session-based authentication with encrypted passwords using scrypt
- **Role-based Access Control**: Three-tier permission system
  - Admin: Full system control, user management, approval workflows
  - Supervisor: Can post questions and answers (pending approval)
  - User: Read access and issue submission only
- **Session Security**: HTTP-only cookies with secure flags in production

## Data Flow & Business Logic
- **Question Lifecycle**: Submit → Pending → Admin Review → Approved/Rejected
- **Answer Workflow**: Supervisor posts → Admin approval required → Visible to all
- **Analytics**: Admin dashboard with system statistics and trending issue tracking
- **Search & Filtering**: Multi-criteria filtering by category, status, and text search with sorting options

# External Dependencies

## Database Services
- **MySQL**: MySQL database server for local XAMPP development
- **mysql2**: MySQL database driver with Promise support for Node.js

## UI & Component Libraries
- **Radix UI**: Comprehensive headless component primitives for accessibility
- **shadcn/ui**: Pre-styled component system built on Radix UI
- **Tailwind CSS**: Utility-first CSS framework with custom design system
- **Lucide React**: Feather-inspired icon library

## Development & Build Tools
- **Vite**: Modern build tool with hot module replacement and optimized bundling
- **TypeScript**: Static type checking across frontend and backend
- **ESBuild**: Fast JavaScript bundler for production server builds

## Authentication & Session Management
- **Passport.js**: Authentication middleware with local strategy
- **express-mysql-session**: MySQL session store for persistent sessions
- **Express Session**: Server-side session management with security configurations

## Data Management
- **Drizzle ORM**: Type-safe database queries with MySQL dialect
- **Drizzle Kit**: Migration management and schema introspection tools
- **TanStack Query**: Client-side data fetching, caching, and synchronization