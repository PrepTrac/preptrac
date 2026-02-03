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
- `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
- `NEXTAUTH_URL="http://localhost:3000"`

## Step 3: Initialize Database

```bash
npm run db:push
npm run db:generate
```

## Step 4: Start Development Server

```bash
npm run dev
```

## Step 5: Create Your Account

1. Open http://localhost:3000
2. Click "Create a new account"
3. Enter your email and password (min 8 characters)
4. You'll be automatically signed in

## Step 6: Set Up Your First Data

### Create Categories

1. Go to **Settings** → **Categories**
2. Click **Add Category**
3. Create categories like:
   - Food
   - Water
   - Ammo
   - Medical
   - Tools
   - Fuel

### Create Locations

1. Go to **Settings** → **Locations**
2. Click **Add Location**
3. Create locations like:
   - Basement Shelf A
   - Garage Cabinet
   - Vehicle Trunk
   - Storage Bin #1

### Add Your First Item

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

- **Dashboard**: See your inventory metrics
- **Inventory**: Browse and filter your items
- **Calendar**: View upcoming expirations and maintenance
- **Settings**: Configure notifications and manage categories/locations

## Common First Steps

1. ✅ Create 5-10 categories
2. ✅ Create 3-5 locations
3. ✅ Add 10-20 items
4. ✅ Set expiration dates for perishables
5. ✅ Configure notification preferences

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

**Can't sign in?**
- Make sure you created an account first
- Check that NEXTAUTH_SECRET is set
- Clear browser cookies

## Next Steps

- Read the full [README.md](./README.md) for detailed documentation
- Check [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the system
- Customize categories and locations to fit your needs
- Set up email notifications (see README)

Happy tracking! 🎯

