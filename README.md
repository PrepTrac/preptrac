# PrepTrac - Preparedness Inventory Application

A self-hosted web application for tracking all preparedness-related inventory built with the T3 Stack (Next.js, tRPC, Prisma, TailwindCSS, TypeScript).

## Features

- **Inventory Management**: Full CRUD operations for tracking items (food, water, ammo, medical supplies, tools, etc.)
- **Categories & Locations**: Organize items by category and storage location
- **Calendar System**: Track expirations, rotations, maintenance schedules, and battery replacements
- **Dashboard**: View key metrics including total water, food days, ammo counts, and upcoming events
- **Notifications**: Email and in-app notifications for expirations, maintenance, and low inventory
- **Search & Filters**: Find items by category, location, expiration status, maintenance needs, and more
- **QR Code Support**: Generate QR codes for items and locations
- **Dark Mode**: Full dark mode support
- **PWA Support**: Progressive Web App with offline capabilities

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **API**: tRPC
- **Database**: Prisma (SQLite or PostgreSQL)
- **Styling**: TailwindCSS
- **Authentication**: NextAuth.js (Credentials)
- **Forms**: React Hook Form
- **Icons**: Lucide React
- **Date Handling**: date-fns

## Architecture

### Database Schema

The application uses Prisma with the following models:

- **User**: Authentication and user management
- **Category**: Item categories (Food, Water, Ammo, Medical, etc.)
- **Location**: Storage locations (basement, garage, vehicle, etc.)
- **Item**: Inventory items with quantity, expiration, maintenance tracking
- **Event**: Calendar events (expiration, maintenance, rotation, battery replacement)
- **NotificationSettings**: User notification preferences

### API Structure

tRPC routers organized by domain:
- `items`: Item CRUD and filtering
- `categories`: Category management
- `locations`: Location management
- `events`: Calendar event management
- `dashboard`: Dashboard statistics and metrics
- `notifications`: Notification settings and pending notifications
- `auth`: User registration

### Frontend Structure

```
src/
├── app/              # Next.js App Router pages
│   ├── dashboard/   # Dashboard page
│   ├── inventory/   # Inventory list page
│   ├── calendar/    # Calendar view
│   ├── settings/    # Settings page
│   └── auth/        # Authentication pages
├── components/      # React components
├── server/          # Backend code
│   ├── api/         # tRPC routers
│   ├── db.ts        # Prisma client
│   └── auth.ts      # NextAuth configuration
└── utils/           # Utility functions
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- SQLite (default) or PostgreSQL

### Installation

1. **Clone or copy the project files**

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and set:
   - `DATABASE_URL`: Database connection string
     - SQLite: `file:./dev.db`
     - PostgreSQL: `postgresql://user:password@localhost:5432/preptrac?schema=public`
   - `NEXTAUTH_SECRET`: Generate a random string (e.g., `openssl rand -base64 32`)
   - `NEXTAUTH_URL`: Your app URL (e.g., `http://localhost:3000`)

4. **Set up the database**:
   ```bash
   npm run db:push
   ```

5. **Generate Prisma Client**:
   ```bash
   npm run db:generate
   ```

6. **Start the development server**:
   ```bash
   npm run dev
   ```

7. **Open your browser**:
   Navigate to `http://localhost:3000`

### First-Time Setup

1. **Create an account**: Click "Create a new account" on the sign-in page
2. **Set up categories**: Go to Settings → Categories and create your categories (Food, Water, Ammo, etc.)
3. **Set up locations**: Go to Settings → Locations and create storage locations
4. **Add items**: Go to Inventory and start adding items
5. **Configure notifications**: Go to Settings → Notifications to set up your preferences

## Database Options

### SQLite (Default)

SQLite is the default and requires no additional setup. Perfect for single-user deployments.

```env
DATABASE_URL="file:./dev.db"
```

### PostgreSQL

For multi-user or production deployments, use PostgreSQL:

1. Install and start PostgreSQL
2. Create a database:
   ```sql
   CREATE DATABASE preptrac;
   ```
3. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
4. Update `.env`:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/preptrac?schema=public"
   ```
5. Run migrations:
   ```bash
   npm run db:push
   ```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Docker

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Self-Hosted

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

3. Use a reverse proxy (nginx, Caddy) for HTTPS and domain routing

## Usage Guide

### Adding Items

1. Navigate to **Inventory**
2. Click **Add Item**
3. Fill in the required fields:
   - Name, Quantity, Unit
   - Category and Location
4. Optionally add:
   - Expiration date
   - Maintenance interval and last maintenance date
   - Rotation schedule
   - Notes and image URL
5. Click **Create**

### Managing Categories

1. Go to **Settings** → **Categories**
2. Click **Add Category**
3. Set name, description, color, and icon
4. Use colors to visually organize categories in the UI

### Managing Locations

1. Go to **Settings** → **Locations**
2. Click **Add Location**
3. Set name and description
4. Examples: "Basement Shelf A", "Garage Cabinet", "Vehicle Trunk", "Bin #3"

### Calendar Events

Events are automatically created based on:
- **Expiration dates**: From item expiration dates
- **Maintenance**: Based on maintenance intervals
- **Rotations**: Based on rotation schedules

You can also manually create events in the calendar view.

### Notifications

Configure notifications in **Settings** → **Notifications**:
- Enable/disable email and in-app notifications
- Set how many days before expiration/maintenance to notify
- Enable low inventory alerts

### QR Codes

QR codes can be generated for items and locations. Use the QR code API endpoint:
```
/api/qrcode?data=<encoded-data>
```

## Extending the Application

### Adding New Item Fields

1. Update `prisma/schema.prisma`:
   ```prisma
   model Item {
     // ... existing fields
     newField String?
   }
   ```

2. Run migration:
   ```bash
   npm run db:push
   ```

3. Update tRPC router in `src/server/api/routers/items.ts`
4. Update `ItemForm` component to include the new field

### Adding New Event Types

1. Update the Event type enum in `src/server/api/routers/events.ts`
2. Add handling in the calendar component
3. Update the event color mapping

### Custom Categories

The category system is flexible. Common categories include:
- Food
- Water
- Ammo
- Medical
- Fuel
- Tools
- Energy Systems
- Batteries
- Filters
- Clothing
- Documents
- Communication Equipment

### Email Notifications

To enable email notifications:

1. Add SMTP settings to `.env`:
   ```env
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_USER=your-email@example.com
   SMTP_PASSWORD=your-password
   SMTP_FROM=noreply@example.com
   ```

2. Implement email sending in `src/server/api/routers/notifications.ts` using nodemailer or similar

## Development

### Database Studio

View and edit data directly:
```bash
npm run db:studio
```

### Type Safety

The T3 Stack provides end-to-end type safety:
- Prisma types for database
- tRPC types for API
- TypeScript for frontend

### Code Structure

- **Modular**: Each feature in its own router/component
- **Type-safe**: Full TypeScript coverage
- **Reusable**: Components designed for reuse
- **Clean**: Follows Next.js and React best practices

## Troubleshooting

### Database Connection Issues

- Verify `DATABASE_URL` in `.env`
- For PostgreSQL, ensure the database exists and credentials are correct
- Run `npm run db:push` to sync schema

### Authentication Issues

- Ensure `NEXTAUTH_SECRET` is set
- Check `NEXTAUTH_URL` matches your deployment URL
- Clear browser cookies if having login issues

### Build Errors

- Run `npm run db:generate` to regenerate Prisma Client
- Delete `.next` folder and rebuild
- Check Node.js version (requires 18+)

## Security Considerations

- Change `NEXTAUTH_SECRET` in production
- Use strong passwords
- Enable HTTPS in production
- Regularly backup your database
- Keep dependencies updated

## License

This project is provided as-is for personal use. Modify and extend as needed.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the code comments
3. Consult Next.js, tRPC, and Prisma documentation

## Roadmap Ideas

- [ ] Barcode scanning for items
- [ ] Mobile app (React Native)
- [ ] Multi-user support with sharing
- [ ] Export/import functionality
- [ ] Advanced reporting and analytics
- [ ] Integration with external APIs
- [ ] Automated inventory suggestions
- [ ] Photo upload for items
- [ ] Inventory templates

---

Built with ❤️ using the T3 Stack

