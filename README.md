# SimpleBudget

A web application for quick expense tracking and simple monthly budget analysis.

## Table of Contents

- [Project Description](#project-description)
- [Tech Stack](#tech-stack)
- [Getting Started Locally](#getting-started-locally)
- [Available Scripts](#available-scripts)
- [Project Scope](#project-scope)
- [Project Status](#project-status)
- [License](#license)

## Project Description

SimpleBudget is a minimalist web application designed for users who want to track their daily expenses without the complexity of full-featured financial applications. The app focuses on speed and simplicity, allowing users to record transactions in just a few taps and analyze their spending on a monthly basis.

### Key Features

- **Quick Transaction Entry** - Minimal form fields with smart defaults (current date/time)
- **Two Transaction Types** - Track both expenses and income
- **Custom Categories** - Organize transactions with user-defined categories
- **Monthly Analysis** - View summaries by total and per category
- **Filtered Transaction Lists** - Browse transactions by month and category

### Target Audience

Everyday users who want to control their spending (groceries, services, etc.) in the simplest and fastest way possible.

## Tech Stack

### Frontend

| Technology                                    | Version | Purpose                                       |
| --------------------------------------------- | ------- | --------------------------------------------- |
| [Astro](https://astro.build/)                 | 5.x     | Fast, efficient pages with minimal JavaScript |
| [React](https://react.dev/)                   | 19.x    | Interactive components                        |
| [TypeScript](https://www.typescriptlang.org/) | 5.x     | Static typing and IDE support                 |
| [Tailwind CSS](https://tailwindcss.com/)      | 4.x     | Utility-first styling                         |
| [shadcn/ui](https://ui.shadcn.com/)           | -       | Accessible component library                  |

### Backend

| Technology                        | Purpose                                           |
| --------------------------------- | ------------------------------------------------- |
| [Supabase](https://supabase.com/) | PostgreSQL database, authentication, and BaaS SDK |

### Testing

| Technology                                                        | Version | Purpose                  |
| ----------------------------------------------------------------- | ------- | ------------------------ |
| [Vitest](https://vitest.dev/)                                     | 3.x     | Unit test framework      |
| [Testing Library](https://testing-library.com/docs/react-testing-library/intro/) | 16.x    | React component testing  |
| [MSW](https://mswjs.io/)                                          | 2.x     | API mocking              |
| [Playwright](https://playwright.dev/)                             | -       | E2E test framework       |

### DevOps

| Technology     | Purpose                        |
| -------------- | ------------------------------ |
| GitHub Actions | CI/CD pipelines                |
| DigitalOcean   | Application hosting via Docker |

## Getting Started Locally

### Prerequisites

- **Node.js** 22.14.0
- **npm**

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/mwargocki/simple-budget.git
   cd simple-budget
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

| Script     | Command            | Description                          |
| ---------- | ------------------ | ------------------------------------ |
| `dev`      | `npm run dev`      | Start the development server         |
| `build`    | `npm run build`    | Create a production build            |
| `preview`  | `npm run preview`  | Preview the production build locally |
| `lint`     | `npm run lint`     | Run ESLint to check for code issues  |
| `lint:fix` | `npm run lint:fix` | Automatically fix ESLint issues      |
| `format`   | `npm run format`   | Format code with Prettier            |

## Project Scope

### MVP Features

- **User Authentication**
  - Registration with email and password
  - Login/logout functionality
  - Password change (requires current password)
  - Account deletion with all associated data

- **Category Management**
  - Create, read, update, and delete custom categories
  - Default "None" category (non-deletable)
  - Alphabetical sorting with "None" always at top
  - Automatic transaction reassignment when deleting categories

- **Transaction Management**
  - Create, read, update, and delete transactions
  - Fields: amount (PLN), date/time, category, description (optional), type (expense/income)
  - Amount validation: 0.01 - 1,000,000.00 PLN
  - Support for both comma and period as decimal separators

- **Transaction List**
  - Sorted by date (newest first)
  - Filtering by month and category
  - Pagination with "load more" functionality

- **Monthly Summary**
  - Total balance (income minus expenses)
  - Per-category breakdown
  - Click-through navigation to filtered transaction list

### Out of Scope (Post-MVP)

- Bank import (CSV, PDF)
- Multi-currency support
- Budget planning and spending limits
- Shared accounts
- External integrations
- Mobile applications
- Full-text search in descriptions

## Project Status

🚧 **In Development** - This project is currently in the early stages of development. The MVP is being built according to the product requirements document.

## License

This project is proprietary software. All rights reserved.

---

For more detailed documentation, see the `.ai/` directory containing the PRD and technical specifications.
