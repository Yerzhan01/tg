# Invoice Generator for Kazakhstan

## Overview

This is a web application for generating official invoices (счета-фактуры) compliant with Kazakhstan legislation. The system provides a comprehensive solution for individual entrepreneurs and small businesses to quickly create, manage, and distribute professional invoices. The application features Telegram integration for authentication and bot notifications, comprehensive invoice management with PDF/Excel export capabilities, and a modern React-based user interface.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Styling**: Tailwind CSS with CSS variables for theming and dark mode support
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod schema validation

### Backend Architecture
- **Framework**: Express.js with TypeScript running on Node.js
- **API Design**: RESTful API with JSON request/response format
- **File Upload**: Multer middleware for handling signature and stamp image uploads
- **Session Management**: Express sessions with PostgreSQL session store
- **Error Handling**: Centralized error handling middleware with status code management

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for database migrations and schema synchronization
- **Connection**: Neon Database serverless PostgreSQL for cloud hosting
- **Storage Structure**: Relational design with separate tables for users, suppliers, buyers, invoices, and invoice items

### Authentication and Authorization
- **Primary Method**: Telegram Web App authentication using Telegram Bot API
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **User Identification**: Telegram user ID as primary identifier
- **Security**: Telegram authentication data validation and session-based authorization

### External Dependencies
- **Telegram Bot API**: For user authentication and invoice notifications
- **Neon Database**: Serverless PostgreSQL hosting
- **PDF Generation**: jsPDF library for client-side PDF creation
- **Excel Export**: XLSX library for spreadsheet generation
- **Image Processing**: Client-side image handling for signatures and stamps
- **Number Conversion**: Custom implementation for converting amounts to Kazakh text format

### Key Features
- **Invoice Management**: Create, edit, and manage invoice data with automatic calculations
- **Document Export**: Generate PDF and Excel formats with customizable layouts
- **Telegram Integration**: Bot notifications and authentication through Telegram
- **Multi-language Support**: Kazakh and Russian language support for amount conversion
- **Signature Management**: Upload and position digital signatures and company stamps
- **Data Persistence**: Save supplier and buyer information for reuse
- **Compliance**: Meets Kazakhstan legislation requirements for official invoices

### Development Tools
- **Build System**: Vite with React plugin and development server
- **Type Safety**: Full TypeScript coverage across frontend and backend
- **Code Quality**: ESLint and Prettier configuration for consistent code style
- **Development Mode**: Hot module replacement and error overlay for efficient development