import { createTRPCRouter } from "~/server/api/trpc";
import { itemsRouter } from "~/server/api/routers/items";
import { categoriesRouter } from "~/server/api/routers/categories";
import { locationsRouter } from "~/server/api/routers/locations";
import { eventsRouter } from "~/server/api/routers/events";
import { dashboardRouter } from "~/server/api/routers/dashboard";
import { notificationsRouter } from "~/server/api/routers/notifications";
import { authRouter } from "~/server/api/routers/auth";

export const appRouter = createTRPCRouter({
  items: itemsRouter,
  categories: categoriesRouter,
  locations: locationsRouter,
  events: eventsRouter,
  dashboard: dashboardRouter,
  notifications: notificationsRouter,
  auth: authRouter,
});

export type AppRouter = typeof appRouter;

