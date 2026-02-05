# PrepTrac - Preparedness Inventory Application

A self-hosted web application for tracking all preparedness-related inventory built with the T3 Stack (Next.js, tRPC, Prisma, TailwindCSS, TypeScript).

## Features

- **Inventory Management**: Full CRUD operations for tracking items (food, water, ammo, medical supplies, tools, etc.). Food items require **calories per unit** (e.g. per jar, can, bag) so the app can compute total pantry energy.
- **Categories & Locations**: Organize items by category and storage location
- **Household Profile**: Add family members (age, weight, height, sex). The app calculates each person’s daily calorie need (Mifflin-St Jeor) and uses the household total for **Days of Food**.
- **Days of Food**: Total inventory calories (sum of quantity × calories per unit for all items) ÷ household daily calorie requirement. Shown on the dashboard; “Based on your household” when using this formula.
- **Locations View**: Select a location to see everything stored there and consumption history from that location
- **Consume**: Log consumption (single or multiple items), view recent consumption and analytics (charts, time range, by category)
- **Calendar System**: Track expirations, rotations, maintenance schedules, and battery replacements
- **Dashboard**: View key metrics: total water, **Days of Food** (household-based when set up), ammo count, total items, and upcoming events
- **Notifications**: Email and in-app notifications for expirations, maintenance, and low inventory
- **Search & Filters**: Find items by category, location, expiration status, maintenance needs, and more
- **Test Data (Settings)**: Fill sample preparedness inventory to visualize the app; remove test data without touching your real preps
- **QR Code Support**: Generate QR codes for items and locations
- **Dark Mode**: Full dark mode support
- **PWA Support**: Progressive Web App with offline capabilities

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **API**: tRPC
- **Database**: Prisma (SQLite or PostgreSQL)
- **Styling**: TailwindCSS
- **Forms**: React Hook Form
- **Icons**: Lucide React
- **Date Handling**: date-fns

The app runs **without authentication**: a single default user is used automatically, so there is no sign-in or registration. Open the app and start using Dashboard, Inventory, Locations, and Consume.

## Architecture

### Database Schema

The application uses Prisma with the following models:

- **User**: Single default user (no login; created automatically)
- **Category**: Item categories (Food, Water, Ammo, Medical, etc.)
- **Location**: Storage locations (basement, garage, vehicle, etc.)
- **Item**: Inventory items with quantity, unit, expiration, maintenance tracking, and optional **caloriesPerUnit** (required for food category for Days of Food)
- **FamilyMember**: Household profile — age, weight (kg), height (cm), sex; used to compute daily calorie need per person
- **Event**: Calendar events (expiration, maintenance, rotation, battery replacement)
- **ConsumptionLog**: Records of item consumption (quantity, note, date)
- **NotificationSettings**: User notification preferences
- **TestDataRecord**: Tracks entities created by “Fill test data” so they can be removed without affecting real data

### API Structure

tRPC routers organized by domain:
- `items`: Item CRUD, filtering, consumption logging, and consumption stats
- `categories`: Category management
- `locations`: Location management and consumption-by-location
- `events`: Calendar event management
- `dashboard`: Dashboard statistics and metrics (including Days of Food from inventory calories ÷ household)
- `household`: Family member CRUD and total daily calorie calculation
- `notifications`: Notification settings and pending notifications
- `settings`: Fill test data, remove test data, and test-data status

### Frontend Structure

```
src/
├── app/              # Next.js App Router pages
│   ├── dashboard/   # Dashboard page
│   ├── inventory/   # Inventory list page
│   ├── locations/   # Location detail: items and consumption per location
│   ├── consume/     # Log consumption and view consumption analytics
│   ├── household/   # Household profile: family members and daily calorie needs
│   ├── calendar/    # Calendar view
│   ├── settings/    # Settings (notifications, categories, locations, test data)
│   └── auth/        # Legacy auth pages (unused; app uses default user)
├── components/      # React components
├── server/          # Backend code
│   ├── api/         # tRPC routers
│   ├── db.ts        # Prisma client
│   └── auth.ts      # Default user (getOrCreateDefaultUser)
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
   - `NEXTAUTH_SECRET` and `NEXTAUTH_URL` are optional (the app does not use authentication; they are only needed if you add auth later)

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
   Navigate to `http://localhost:3000`. The app has no login — you are taken straight to the Dashboard.

### First-Time Setup

1. **Optional – try with sample data**: Go to Settings → Test data and click **Fill test data** to load a sample preparedness inventory and see how the app works. Use **Remove test data** later to clear only that data (your real preps are never touched). The test data tool is for visualization only and not for production use.
2. **Household profile (for accurate Days of Food)**: Go to **Household** and add family members (age, weight in kg, height in cm, sex). The app uses Mifflin-St Jeor to estimate daily calorie needs and divides total food calories by this to show **Days of Food** on the dashboard.
3. **Set up categories**: Go to Settings → Categories and create your categories (Food, Water, Ammo, etc.), or use the default categories created on first run.
4. **Set up locations**: Go to Settings → Locations and create storage locations, or use the defaults.
5. **Add items**: Go to Inventory and add items. For **food** items you must enter **Calories per unit** (e.g. per jar, can, bag); total calories = quantity × calories per unit. Non-food items can leave calories blank.
6. **Configure notifications**: Go to Settings → Notifications to set up your preferences (optional).

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
   - **Name**, **Quantity**, **Unit** (e.g. jar, can, bag)
   - **Category** and **Location**
   - **Calories per unit**: Required when the category is Food. Enter the calories for one unit (e.g. 3100 for a jar of peanut butter). Total calories for the entry = quantity × calories per unit.
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

### Household Profile and Days of Food

1. Go to **Household** (main nav)
2. Click **Add member** and enter each family member’s name (optional), age, sex, weight (kg), and height (cm)
3. The app shows each person’s estimated daily calorie need and the **total household daily requirement**
4. On the **Dashboard**, **Days of Food** = (total calories in inventory from all items with calories per unit) ÷ (household daily requirement). When this is used, the card shows “Based on your household”
5. For the calculation to work, add food (and any other) items with **Calories per unit** set so the app can sum total inventory calories

### Viewing by Location

1. Go to **Locations** (main nav)
2. Select a location from the dropdown
3. View all items at that location and their quantities
4. Scroll to **Consumed from this location** to see consumption history for that location
5. Use **Add item here** to create a new item pre-assigned to the selected location

### Calendar Events

Events are automatically created based on:
- **Expiration dates**: From item expiration dates
- **Maintenance**: Based on maintenance intervals
- **Rotations**: Based on rotation schedules

You can also manually create events in the calendar view.

### Logging Consumption

1. Go to **Consume** (main nav)
2. Select one or more items and enter the quantity consumed (add rows for multiple items)
3. Optionally add a note (e.g., "Range day", "Emergency use")
4. Click **Record consumption** — inventory quantities are updated and the log is saved
5. Use the **Consumption analytics** section to view charts and totals over a chosen time range (by category)

### Notifications

Configure notifications in **Settings** → **Notifications**:
- Enable/disable email and in-app notifications
- Set how many days before expiration/maintenance to notify
- Enable low inventory alerts

### Test Data (Settings)

In **Settings** → **Test data** you can:
- **Fill test data**: Add a sample preparedness inventory (categories, locations, items, some consumption) to visualize the app. Safe to run multiple times; existing categories and locations are reused. Not for production use.
- **Remove test data**: Remove only data that was added by "Fill test data". Your real categories, locations, and items are never deleted. If you edited or tracked preps using the test data, that data will be removed when you click Remove test data.

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

### Build Errors

- Run `npm run db:generate` to regenerate Prisma Client
- Delete `.next` folder and rebuild
- Check Node.js version (requires 18+)

### Starting Over (Empty Database)

To wipe all data and start from scratch:
1. Stop the dev server
2. Delete the database file(s): `prisma/dev.db` and `prisma/dev.db-journal` (if present)
3. Run `npm run db:push` to recreate the schema
4. Restart the app; the default user and default categories/locations will be created automatically on first load

## Security Considerations

- The app does not use authentication; it is intended for single-user / local use. Do not expose it to the internet without adding access control if needed.
- Enable HTTPS in production if deployed
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

