import { httpBatchLink, loggerLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { type inferRouterInputs, type inferRouterOutputs } from "@trpc/server";
import { type AppRouter } from "~/server/api/root";

export const api = createTRPCReact<AppRouter>();

export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;

/** Dashboard getStats breakdown item types (single source of truth from API). */
type DashboardStats = RouterOutputs["dashboard"]["getStats"];
export type FoodBreakdownItem = NonNullable<DashboardStats["foodBreakdown"]>[number];
export type AmmoBreakdownItem = NonNullable<DashboardStats["ammoBreakdown"]>[number];
export type WaterBreakdownItem = NonNullable<DashboardStats["waterBreakdown"]>[number];

