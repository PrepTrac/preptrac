# PrepTrac

**Track your preparedness inventory in one place.** Know what you have, where it is, when it expires, and how many days of food your household can cover.

PrepTrac helps you organize food, water, ammo, medical supplies, tools, and more—by category and location—so you can see your full picture at a glance and keep everything up to date.

---

## What You Can Do

- **Dashboard** — See total water (click to toggle gallons/days), **fuel & energy** (click to cycle: gallons → total kWh → battery kWh), **days of food** (based on your household’s calorie needs), ammo count, total items, and upcoming expirations or maintenance. **Category Progress** shows goal progress for water, food, ammo, and fuel/energy with units (gallons, days, rounds, kWh) and hover tooltips with category colors. A **Recent activity** section shows consumption and additions with configurable rows (5, 10, 25), pagination, and filters (type and category); use **View all** to open the full Activity page.
- **Inventory** — Add and edit items with quantity, unit (jar, can, bag, etc.), and for food items, calories per unit. Filter by category, location, expiring soon, or low stock. **Export** to CSV or JSON (all item fields included).
- **Import** — Download a **CSV template** (same columns as export), fill it in, then upload to create many items at once. Category and location are matched by name or ID.
- **Household** — Add family members (age, weight, height, sex). PrepTrac estimates each person’s daily calorie need and uses that to show how many **days of food** your pantry can cover.
- **Locations** — Pick a location (e.g. Home, Garage, Bug-out Bag) to see everything stored there and what’s been consumed from that spot.
- **Activity** — Log when you use something (consume) or add to inventory (e.g. refuel). Your totals update and you can review consumption and additions over time with charts. The **Recent activity** list supports configurable rows per page (5, 10, 25), pagination, and filters by type (All / Used / Added) and category.
- **Calendar** — Expiration dates, maintenance, and rotations appear automatically so you don’t miss a beat.
- **Settings** — Manage **Goals** (ammo rounds, water gallons, food days, and fuel: fuel gallons, total kWh, battery kWh), categories, locations, and notifications. Use **Test data** to load sample inventory and a sample household (2 parents, 2 kids) so you can try the app before adding your own data.

No sign-in required. Open the app and start using it.

---

## Get Started

1. **Install and run** (you need Node.js 18+ installed):
   ```bash
   npm install
   cp .env.example .env
   npm run db:push
   npm run dev
   ```
2. **Open** [http://localhost:3000](http://localhost:3000) in your browser. You’ll land on the Dashboard.

**First time?**

- Go to **Settings → Test data** and click **Fill test data** to load sample inventory and a sample household. You’ll see how the dashboard, Days of Food, and Household work. Remove it anytime with **Remove test data**.
- Or set up your own: add **Household** members, then **Categories** and **Locations** in Settings, then add items from **Inventory**. For food items, enter **calories per unit** (e.g. per jar or can) so Days of Food is accurate.

---

## Using the App

### Dashboard

Your at-a-glance view: **Water** (click to switch between gallons and days), **Fuel / Energy** (click to cycle: gallons → total kWh → battery kWh), **Days of Food** (when you’ve set up household and food calories), ammo count, total items, and lists of what’s expiring or needs maintenance. When Days of Food is based on your household, it will say “Based on your household.” Below the metrics, **Category Progress** shows progress toward your goals (Settings → Goals) for each category, with units (gallons, rounds, days, kWh) and hover tooltips that use each category’s color.

### Adding Items

Go to **Inventory** → **Add Item**. Enter name, quantity, unit (e.g. jars, cans, bags), category, and location. For **food** items, enter **Calories per unit** (the calories in one unit—e.g. one jar). That way the app can total your pantry calories and compute days of food. You can also add expiration dates, maintenance reminders, and notes.

### Household and Days of Food

In **Household**, add each family member (name optional, age, sex, weight in kg, height in cm). PrepTrac estimates daily calorie needs and sums them. On the Dashboard, **Days of Food** = your total inventory calories ÷ that household total. Add calories per unit to your food items so the number is meaningful.

### Locations

In **Locations**, choose a place from the dropdown. You’ll see all items there and their quantities, plus a history of what was consumed from that location. You can add a new item and assign it to that location with **Add item here**.

### Logging Activity (Consume or Add)

In **Activity**, choose **Consume** or **Add**, pick one or more items, enter the amount, add an optional note, and submit. Quantities update and the log is saved. The analytics section shows both consumption and additions over a chosen time range (bar chart and pie charts by item). The **Recent activity** list below lets you choose how many rows to show (5, 10, or 25), page through results, and filter by type (All / Used / Added) or by category. The same recent-activity list appears on the **Dashboard** with a **View all** link to the Activity page.

### Calendar

Expirations, maintenance due dates, and rotation schedules from your items show up on the **Calendar**. You can also add or edit events there.

### Import and Export

- **Export** — On the **Inventory** page, use **CSV** or **JSON** to download your current (filtered) inventory. The CSV includes all item fields: name, quantity, unit, category, location, expiration, maintenance, rotation, notes, imageUrl, qrCode, minQuantity, targetQuantity, caloriesPerUnit, and timestamps.
- **Import** — Go to **Import**, click **Download template** to get an empty CSV with the same columns. Fill in rows (name, unit, category, and location are required; category and location must match the exact names in Settings, or use categoryId/locationId from an export). Then click **Upload CSV**. The app reports how many items were created and any row-level errors.

### Notifications

Under **Settings → Notifications** you can turn on in-app or email alerts for expirations, maintenance, and low inventory, and choose how many days in advance to be reminded.

### Goals (Settings → Goals)

Set overall targets for ammo (rounds), water (gallons), food (days), and fuel/energy. Fuel has three optional goals: **Fuel (gallons)**, **Total kWh** (generator + battery; generator uses 6 kWh per gallon), and **Battery kWh only** (items with unit “kWh”, e.g. portable power stations). When a goal is set, the dashboard Category Progress uses it and item-level targets for that category/unit are disabled so Settings is the single place to manage those goals.

### Test Data

Under **Settings → Test data**, **Fill test data** adds sample categories, locations, items (food with calories, water in gallons/bottles, ammo, fuel in gallons and kWh, and more), **four household members** (2 parents, 2 kids: Dad 35, Mom 32, and two children), **consumption and addition** activity history (so you can see both “Used” and “Added” in Activity and on the dashboard), and sets your **Goals** (ammo, water, food, and all three fuel goals) so you can see the full dashboard and Category Progress. Item-level targets are not set for goal-covered items (e.g. Canned beans, Water jugs, 5.56 NATO) so goals come from Settings only. **Remove test data** removes only that sample data and leaves anything you added yourself. This is for trying the product, not for production use.

---

## Need More Detail?

- **Quick setup** — See [QUICKSTART.md](./QUICKSTART.md) for a short step-by-step.
- **Technical details** — Setup options, database, deployment, and development info are in [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md).

---

## License

PrepTrac is licensed under the [GNU Affero General Public License v3.0](./LICENSE). You may use, modify, and distribute it under the terms of that license.
