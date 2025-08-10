# Invoice Generator for Kazakhstan

## Overview

This is a web application for generating official invoices (счета-фактуры) compliant with Kazakhstan legislation. The system provides a comprehensive solution for individual entrepreneurs and small businesses to quickly create, manage, and distribute professional invoices. The application features Telegram integration for authentication and bot notifications, comprehensive invoice management with PDF/Excel export capabilities, and a modern React-based user interface.

## Recent Changes (August 2025)

- **Complete API Route Fix (August 10, 2025)**: Comprehensive audit and fix of all invoice-related API endpoints:
  - **Fixed Database Connectivity**: All API routes now use correct `storage` instead of `telegramStorage`
  - **Restored "Мои счета" Section**: Fixed invoice listing, editing, PDF/Excel generation routes
  - **Added Invoice Editing**: Created edit-invoice.tsx page with proper PUT endpoint for updates
  - **Improved PDF Generation**: Added GET route for direct PDF downloads from web interface
  - **Enhanced Telegram Integration**: Separated web app routes from bot internal routes
  - **Fixed Currency Display**: Removed "00 тиын" from amount-to-words conversion
  - **Improved UI Layout**: Fixed services table column distribution to prevent field overlapping
- **Smart Database Configuration**: Fixed production/development database routing:
  - **Production Environment**: Single unified database for all operations (web app, Telegram bot, users)
  - **Development Environment**: Separate databases - production DB for Telegram bot, development DB for web app
  - **Automatic Environment Detection**: System automatically uses correct database configuration based on NODE_ENV
  - **Unified User Management**: In production all users/data in same database, in development separate for testing
- **Domain Configuration**: Updated all Telegram bot references to use kazinvoice.brnd.kz exclusively
- **Production Deployment Ready**: All components automatically use production database when deployed

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
- **File Upload**: Secure file upload with type validation (JPEG, PNG, GIF) and 5MB size limit
- **Session Management**: Express sessions with PostgreSQL session store
- **Security**: File type validation, size limits, and secure object storage integration
- **Error Handling**: Centralized error handling middleware with status code management

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for database migrations and schema synchronization
- **Connection**: Neon Database serverless PostgreSQL for cloud hosting
- **Object Storage**: Replit Object Storage for secure file management with proper ACL policies
- **Storage Structure**: Relational design with separate tables for users, suppliers, buyers, invoices, invoice items, and signature settings

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
- **Invoice Management**: Create, edit, copy, and manage invoice data with automatic calculations
- **Advanced Telegram Bot**: Enhanced bot with search, statistics, status management, and interactive buttons
- **Status Workflow**: Draft → Sent → Paid status management with automatic notifications
- **Smart Search**: Bot commands for searching invoices by number, supplier, buyer, or item names
- **Comprehensive Statistics**: Real-time analytics on invoice counts, amounts, and monthly summaries
- **Interactive Controls**: Inline buttons for PDF/Excel downloads, status changes, and invoice copying
- **Document Export**: Generate PDF and Excel formats with Kazakhstan-compliant payment table layouts
- **Service Templates**: Predefined templates for different business types (IT, design, marketing, etc.)
- **Telegram Integration**: Full bot notifications, authentication, and document delivery through Telegram
- **Multi-language Support**: Kazakh and Russian language support for amount conversion
- **Secure File Management**: Object storage integration with file type and size validation
- **Data Persistence**: Save supplier and buyer information for reuse with copy functionality
- **Comprehensive Validation**: Real-time validation of BIN/IIN, IIK, BIK, and required fields
- **Compliance**: Meets Kazakhstan legislation requirements with exact payment table formatting

### Development Tools
- **Build System**: Vite with React plugin and development server
- **Type Safety**: Full TypeScript coverage across frontend and backend
- **Code Quality**: ESLint and Prettier configuration for consistent code style
- **Development Mode**: Hot module replacement and error overlay for efficient development