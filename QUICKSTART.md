# Quick Start Guide

Get PrepTrac up and running in 5 minutes!

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Configure Environment

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and set:
- `DATABASE_URL="file:./dev.db"` (SQLite - no setup needed)
- `NEXTAUTH_SECRET` and `NEXTAUTH_URL` are optional (the app has no authentication)

## Step 3: Initialize Database

```bash
npm run db:push
npm run db:generate
```

## Step 4: Start Development Server

```bash
npm run dev
```

## Step 5: Open the App

1. Open http://localhost:3000
2. You’re taken straight to the **Dashboard** — there is no sign-in or registration

## Step 6: Set Up Your First Data

You can either try the app with sample data first, or set up your own data.

### Option A: Try With Sample Data (Recommended for First Run)

1. Go to **Settings** → **Test data**
2. Read the disclaimer: the test data tool is for visualizing the app only, not for production
3. Click **Fill test data**
4. You’ll get categories, locations, items (including fuel in gallons and kWh), **four household members** (2 parents, 2 kids), consumption history, and **Goals** (ammo, water, food, fuel gallons / total kWh / battery kWh). Explore **Dashboard** (click Water to toggle gallons/days, Fuel & Energy to cycle gallons → total kWh → battery kWh), **Category Progress** (hover for details and category colors), **Inventory**, **Locations**, **Activity**, and **Calendar**
5. When you’re ready to use real data, go back to **Settings** → **Test data** and click **Remove test data** (only test data is removed; any real data you added is safe)

### Option B: Set Up Your Own Data

#### Create Categories

1. Go to **Settings** → **Categories**
2. Click **Add Category**
3. Create categories like: Food, Water, Ammo, Medical, Tools, Fuel & Energy

#### Create Locations

1. Go to **Settings** → **Locations**
2. Click **Add Location**
3. Create locations like: Basement Shelf A, Garage Cabinet, Vehicle Trunk, Storage Bin #1

#### Add Your First Item

1. Go to **Inventory**
2. Click **Add Item**
3. Fill in:
   - Name: "Emergency Water"
   - Quantity: 10
   - Unit: "gallons"
   - Category: Water
   - Location: Basement Shelf A
   - Expiration Date: (optional)
4. Click **Create**

## Step 7: Explore Features

- **Dashboard**: See water (toggle gallons/days), fuel & energy (cycle gallons → total kWh → battery kWh), days of food, ammo, total items; Category Progress with units and hover tooltips; upcoming events
- **Inventory**: Browse and filter items; add or edit items; export to CSV or JSON
- **Import**: Download the CSV template, fill in your items (name, unit, category, location required), then upload to create many items at once
- **Locations**: Select a location to see what’s stored there and activity (consumption or additions) from that location
- **Activity**: Log consumption or additions (single or multiple items) and view activity analytics
- **Calendar**: View upcoming expirations and maintenance
- **Settings**: Goals (ammo, water, food, fuel gallons / total kWh / battery kWh), Notifications, Categories, Locations, and Test data (fill/remove sample data)

## Common First Steps

1. ✅ Try **Fill test data** in Settings → Test data to see the app with sample data, or create your own categories and locations
2. ✅ Create 5-10 categories (or use the ones from test data)
3. ✅ Create 3-5 locations
4. ✅ Add 10-20 items (from Inventory, from **Import** with a filled CSV, or from Locations → Add item here)
5. ✅ Log consumption or additions from **Activity** and check **Locations** for per-location history
6. ✅ Set expiration dates for perishables
7. ✅ Configure notification preferences in Settings → Notifications

## Troubleshooting

**Database errors?**
```bash
npm run db:push
```

**Build errors?**
```bash
rm -rf .next node_modules
npm install
npm run db:generate
```

**Want to start over with no data?**
- Delete `prisma/dev.db` (and `prisma/dev.db-journal` if it exists)
- Run `npm run db:push`
- Restart the app; the default user and default categories/locations are created automatically

## Next Steps

- Read the full [README.md](./README.md) for detailed documentation
- Check [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the system
- Customize categories and locations to fit your needs
- Set up email notifications (see README)

Happy tracking! 🎯

