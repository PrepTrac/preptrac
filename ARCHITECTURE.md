# PrepTrac Architecture

## High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                         │
│  ┌──────────┐  ┌──────────┐  ┌────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Dashboard│  │Inventory │  │ Import │  │ Calendar │  │ Settings │  │
│  └──────────┘  └──────────┘  └────────┘  └──────────┘  └──────────┘  │
│                                                             │
│  React Components (TailwindCSS, Next.js App Router)       │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ tRPC Client
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer (tRPC)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Items  │  │Categories│  │ Locations│  │  Events  │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                │
│  │Dashboard │  │Notifications│ │  Auth   │                │
│  └──────────┘  └──────────┘  └──────────┘                │
│                                                             │
│  Type-safe API with automatic type inference              │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Prisma ORM
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer                            │
│                                                               │
│  ┌────────┐  ┌──────────┐  ┌─────────┐  ┌──────────┐      │
│  │  User  │  │ Category │  │ Location│  │   Item   │      │
│  └────────┘  └──────────┘  └─────────┘  └──────────┘      │
│  ┌────────┐  ┌──────────┐                                  │
│  │ Event  │  │Notification│                                │
│  └────────┘  └──────────┘                                  │
│                                                               │
│  SQLite (default) or PostgreSQL                             │
└─────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Frontend Components

```
components/
├── Navigation.tsx          # Main navigation bar
├── ThemeToggle.tsx         # Dark mode toggle
├── DashboardMetrics.tsx     # Dashboard statistics cards
├── UpcomingEvents.tsx      # Event list component
├── CategoryNav.tsx          # Category filter navigation
├── ItemCard.tsx            # Individual item display card
├── ItemForm.tsx            # Item create/edit form
├── CategoryForm.tsx        # Category management
└── LocationForm.tsx        # Location management
```

### Page Structure

```
app/
├── layout.tsx              # Root layout with providers
├── page.tsx                # Home/redirect page
├── dashboard/
│   └── page.tsx           # Dashboard with metrics
├── inventory/
│   └── page.tsx           # Inventory list with filters, CSV/JSON export
├── import/
│   └── page.tsx           # CSV template download + upload import
├── calendar/
│   └── page.tsx           # Calendar view
├── settings/
│   └── page.tsx           # Settings page
└── auth/
    ├── signin/
    │   └── page.tsx       # Sign in page
    └── register/
        └── page.tsx       # Registration page
```

## Data Flow

### Reading Data
1. Component calls tRPC hook (e.g., `api.items.getAll.useQuery()`)
2. tRPC client sends request to `/api/trpc`
3. tRPC server router processes request
4. Prisma queries database
5. Data flows back through tRPC to component
6. React Query caches and updates UI

### Writing Data
1. Component calls tRPC mutation (e.g., `api.items.create.useMutation()`)
2. tRPC validates input with Zod
3. Prisma writes to database
4. tRPC invalidates relevant queries
5. UI automatically refetches and updates

## Database Schema Relationships

```
User (1) ────< (Many) Category
User (1) ────< (Many) Location
User (1) ────< (Many) Item
User (1) ────< (Many) Event
User (1) ────< (1) NotificationSettings

Category (1) ────< (Many) Item
Location (1) ────< (Many) Item
Item (1) ────< (Many) Event
```

## Authentication Flow

1. User submits credentials on sign-in page
2. NextAuth validates against database
3. JWT session created
4. Session stored in cookie
5. Protected routes check session via tRPC middleware
6. Session available in all tRPC procedures

## Notification System

### In-App Notifications
- Queried via `api.notifications.getPendingNotifications`
- Displayed in UI components
- Real-time updates via React Query

### Email Notifications (Future)
- Background job checks expiring items
- Sends email based on user preferences
- Configurable via NotificationSettings

## Calendar System

### Event Types
- **Expiration**: Based on item expiration dates
- **Maintenance**: Calculated from maintenance intervals
- **Rotation**: Based on rotation schedules
- **Battery Replacement**: Manual or scheduled events

### Event Generation
- Automatic: Created from item attributes
- Manual: User creates custom events
- Recurring: Based on intervals

## Search & Filtering

### Filter Options
- Category: Filter by item category
- Location: Filter by storage location
- Search: Text search in name/description
- Expiring Soon: Items expiring within 30 days
- Low Inventory: Items with quantity ≤ 10
- Needs Maintenance: Items past maintenance date

### Implementation
- Filters combined with AND logic
- Server-side filtering via Prisma
- Optimized with database indexes

## Import & Export

### CSV Export (Inventory)
- **Location**: Inventory page → CSV / JSON buttons.
- **Implementation**: `src/utils/export.ts` — `exportToCSV` uses a single header list (`CSV_HEADERS`) that includes all item fields: id, name, description, quantity, unit, categoryId, category, locationId, location, expiration/maintenance/rotation dates, notes, imageUrl, qrCode, minQuantity, targetQuantity, caloriesPerUnit, createdAt, updatedAt.
- Exported CSV is quoted and UTF-8; dates are ISO strings.

### CSV Import (Import page)
- **Location**: Import page — Download template, then Upload CSV.
- **Template**: `downloadCSVTemplate()` in `src/utils/export.ts` downloads an empty CSV with the same headers so users can fill rows in a spreadsheet.
- **Backend**: `items.importFromCSV` in `src/server/api/routers/items.ts` parses CSV (quoted fields, commas inside quotes), resolves category/location by name (exact match) or by ID, creates items and syncs events. Returns `{ created, errors }` with per-row errors.

## QR Code System

### Generation
- Client-side: Using `qrcode` library
- Server-side: API endpoint `/api/qrcode`
- Data format: JSON with type, id, name, url

### Use Cases
- Item labels: Quick access to item details
- Location labels: Quick inventory by location
- Barcode scanning: Future mobile app integration

## PWA Features

### Service Worker
- Caches static assets
- Offline support for viewing
- Background sync for updates

### Manifest
- App metadata
- Icons for home screen
- Standalone display mode

## Security Considerations

### Authentication
- Password hashing with bcrypt
- JWT-based sessions
- Protected API routes

### Authorization
- User-scoped data queries
- Cascade deletes on user deletion
- No cross-user data access

### Input Validation
- Zod schemas for all inputs
- Type-safe throughout stack
- SQL injection prevention via Prisma

## Performance Optimizations

### Database
- Indexed fields (userId, categoryId, locationId, dates)
- Efficient queries with Prisma
- Connection pooling

### Frontend
- React Query caching
- Code splitting via Next.js
- Optimized images
- Lazy loading components

### API
- tRPC batching
- Efficient data fetching
- Minimal payload sizes

## Extension Points

### Adding New Features
1. Update Prisma schema
2. Create/update tRPC router
3. Build UI components
4. Add to navigation

### Custom Categories
- Flexible category system
- Color and icon customization
- User-defined categories

### Custom Event Types
- Extend event type enum
- Add calendar rendering
- Update notification logic

## Deployment Architecture

### Development
- SQLite database
- Local file storage
- Development server

### Production
- PostgreSQL database
- Cloud storage (optional)
- Reverse proxy (nginx/Caddy)
- HTTPS required
- Environment variables for secrets

## Monitoring & Maintenance

### Database
- Regular backups
- Prisma Studio for inspection
- Migration management

### Application
- Error logging
- Performance monitoring
- User feedback collection

---

This architecture provides a solid foundation for a self-hosted preparedness inventory system with room for growth and customization.

