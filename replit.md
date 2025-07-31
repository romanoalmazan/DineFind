# Random Eats - Restaurant Finder Application

## Overview

Random Eats is a web application that helps users discover random restaurants near their location based on customizable preferences. The app integrates with Google Places API to fetch restaurant data and provides an interactive map interface for users to explore dining options. Features include configurable distance units (miles/kilometers), multiple price display modes, and comprehensive search filters.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

This is a full-stack TypeScript application built with a modern web stack:

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **UI Components**: Radix UI primitives with shadcn/ui design system
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack React Query for server state
- **Build Tool**: Vite with React plugin

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Style**: RESTful endpoints
- **External Integration**: Google Places API for restaurant data
- **Build**: esbuild for production bundling

### Database Strategy
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Migration**: Drizzle Kit for schema management
- **Current State**: Configured but minimal usage (primarily API-driven)

## Key Components

### Frontend Components
1. **Home Page** (`client/src/pages/home.tsx`)
   - Main application interface with map integration
   - Settings management through bottom sheet
   - Restaurant search and display functionality

2. **UI System** (`client/src/components/ui/`)
   - Complete shadcn/ui component library
   - Radix UI primitives for accessibility
   - Custom bottom sheet component for mobile-first design

3. **State Management**
   - React Query for API calls and caching
   - Local state for user preferences with metric options
   - localStorage persistence for settings including distance units and display preferences

### Backend Components
1. **API Routes** (`server/routes.ts`)
   - `/api/restaurants/search` - Main search endpoint
   - Google Places API integration for restaurant data
   - Error handling and response formatting

2. **Server Setup** (`server/index.ts`)
   - Express middleware configuration
   - Request logging and error handling
   - Development/production environment handling

3. **Storage Layer** (`server/storage.ts`)
   - Interface-based storage abstraction
   - Currently minimal (API-driven architecture)

## Data Flow

1. **User Location**: Browser geolocation API provides user coordinates
2. **Settings Configuration**: User customizes search preferences (radius, price, cuisine)
3. **API Request**: Frontend sends search parameters to backend
4. **Google Places Integration**: Backend queries Google Places API with user preferences
5. **Response Processing**: Backend filters and formats restaurant data
6. **UI Update**: Frontend displays restaurant information and updates map

## External Dependencies

### Core Dependencies
- **Google Places API**: Restaurant data source (requires API key)
- **Neon Database**: PostgreSQL hosting (configured via DATABASE_URL)
- **Radix UI**: Accessible component primitives
- **TanStack React Query**: Server state management

### Development Dependencies
- **Vite**: Frontend build tool and dev server
- **TypeScript**: Type safety across the stack
- **Tailwind CSS**: Utility-first styling
- **Drizzle Kit**: Database schema management

## Deployment Strategy

### Build Process
1. **Frontend**: Vite builds React app to `dist/public`
2. **Backend**: esbuild bundles server code to `dist/index.js`
3. **Database**: Drizzle migrations in `migrations/` directory

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `GOOGLE_PLACES_API_KEY` or `GOOGLE_API_KEY`: Google Places API access
- `NODE_ENV`: Environment mode (development/production)

### Scripts
- `npm run dev`: Development server with hot reload
- `npm run build`: Production build
- `npm run start`: Production server
- `npm run db:push`: Database schema deployment

### Architecture Decisions

**API-First Approach**: The application prioritizes external API integration over local data storage, making it lightweight and reducing database complexity.

**Mobile-First Design**: Bottom sheet pattern and responsive design ensure optimal mobile experience, which is crucial for a location-based dining app.

**Type Safety**: Full TypeScript implementation with shared schemas between frontend and backend ensures consistent data handling.

**Modern Tooling**: Vite and esbuild provide fast development and build times, while Drizzle ORM offers type-safe database operations when needed.