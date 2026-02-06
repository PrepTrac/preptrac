# Categories and Locations Guide

## Default Categories (Auto-created for new users)

When a new user registers, these 10 categories are automatically created:

1. **Food** - Orange (#F59E0B) - Canned goods, MREs, dried food, etc.
2. **Water** - Blue (#3B82F6) - Water storage, purification, containers
3. **Ammo** - Red (#EF4444) - Ammunition and reloading supplies
4. **Medical** - Green (#10B981) - First aid, medications, medical supplies
5. **Tools** - Gray (#6B7280) - Knives, multi-tools, equipment
6. **Clothing** - Purple (#8B5CF6) - Survival gear, boots, clothing
7. **Shelter** - Pink (#EC4899) - Tents, tarps, sleeping bags
8. **Fuel & Energy** - Orange (#F97316) - Gasoline, batteries, solar panels
9. **Communication** - Cyan (#06B6D4) - Radios, phones, signaling
10. **Defense** - Dark Red (#DC2626) - Self-defense items, security

Each category has:
- **Name** (required)
- **Description** (optional)
- **Color** (for visual identification in UI)
- **Icon** (for icon display - currently not shown in UI)

## Default Locations (Auto-created for new users)

When a new user registers, these 5 locations are automatically created:

1. **Home** - Primary residence
2. **Vehicle 1** - Primary vehicle
3. **Vehicle 2** - Secondary vehicle
4. **Cabin** - Vacation/retreat property
5. **Bug-out Bag** - Emergency go bag

Each location has:
- **Name** (required)
- **Description** (optional)

## Managing Categories & Locations

### Adding/Editing/Deleting Categories
1. Navigate to **Settings** page
2. Find the **Categories** section
3. Click **Add Category** to create a new one
4. Click the **Edit** (pencil) icon to modify an existing category
5. Click the **Trash** icon to delete a category

### Adding/Editing/Deleting Locations
1. Navigate to **Settings** page
2. Find the **Locations** section
3. Click **Add Location** to create a new one
4. Click the **Edit** (pencil) icon to modify an existing location
5. Click the **Trash** icon to delete a location

**Note**: Deleting a category or location will also delete all items assigned to it.

### CSV Import

When importing items from CSV (see **Import** in the app), category and location are matched by **exact name** (case-insensitive) or by **ID**. Use the same category and location names as in Settings, or use the `categoryId` and `locationId` values from an exported CSV. Create your categories and locations in Settings before importing.

## Filtering on Inventory Page

### Two Ways to Filter Categories

#### 1. Category Navigation Buttons (Blue)
- Located at the top of the inventory page
- Click a category button to filter by that category
- Click "All" to show items from all categories
- Click the same button again to clear the filter

#### 2. Category Dropdown (in Filters section)
- Click the **Filters** button to expand filters
- Use the **Category** dropdown to select a category
- Select "All Categories" to show items from all categories
- Works alongside other filters (location, expiring soon, etc.)

### Filtering by Location

#### Location Navigation Buttons (Green)
- Located right below category navigation
- Click a location button to filter by that location
- Click "All Locations" to show items from all locations
- Click the same button again to clear the filter

### Combining Filters

You can combine multiple filters:
- Select a category AND a location to see items in that category at that location
- Add search terms to narrow down further
- Check "Expiring Soon", "Low Inventory", or "Needs Maintenance" for more specific results

### Other Filters Available

- **Search**: Text search across item names and descriptions
- **Expiring Soon**: Items expiring within the next 30 days
- **Low Inventory**: Items with quantity <= 10
- **Needs Maintenance**: Items due for maintenance

## Example Use Cases

### Scenario 1: Check all food supplies
1. Go to Inventory page
2. Click the **Food** category button (blue)
3. View all food items across all locations

### Scenario 2: Check what's in Vehicle 1
1. Go to Inventory page
2. Click the **Vehicle 1** location button (green)
3. View all items in Vehicle 1

### Scenario 3: Check medical supplies in the cabin
1. Go to Inventory page
2. Click the **Medical** category button (blue)
3. Click the **Cabin** location button (green)
4. View only medical items stored in the cabin

### Scenario 4: Find expiring food items
1. Go to Inventory page
2. Click the **Filters** button
3. Select **Food** from the Category dropdown
4. Check the **Expiring Soon** checkbox
5. View only food items that will expire soon

## Best Practices

1. **Start with defaults**: Use the provided categories and locations as a starting point
2. **Customize as needed**: Add categories and locations that match your specific setup
3. **Use descriptive names**: Make locations and categories easy to identify
4. **Be specific**: Instead of just "Vehicle", use "Toyota 4Runner" or "Ford F-150"
5. **Review regularly**: Check expiration dates and maintenance needs
6. **Keep locations simple**: Don't create too many locations or it becomes hard to track

## Technical Details

### Categories Schema
```prisma
model Category {
  id          String   @id @default(cuid())
  name        String
  description String?
  color       String?  // Hex color for UI
  icon        String?  // Icon name
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  items       Item[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Locations Schema
```prisma
model Location {
  id          String   @id @default(cuid())
  name        String
  description String?
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  items       Item[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Items Relationship
Each item must have:
- One category
- One location
- One owner (user)

This dual categorization system provides maximum flexibility in organizing your preparedness inventory.

