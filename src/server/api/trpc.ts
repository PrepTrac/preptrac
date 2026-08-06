import { initTRPC, TRPCError } from "@trpc/server";
import { type CreateNextContextOptions } from "@trpc/server/adapters/next";
import { getOrCreateDefaultUser } from "~/server/auth";
import { prisma } from "~/server/db";
import { isReadOnly } from "~/server/appMode";
import { ensureSeededOnce } from "~/server/seedData";

/**
 * Canonical tRPC module for the app.
 *
 * All routers, the root router, and the Pages Router handler import their
 * context, router, and procedure helpers from here (`~/server/api/trpc`). There
 * is exactly one definition site and one import path.
 */

type CreateContextOptions = {
  userId: string;
};

const createInnerTRPCContext = (opts: CreateContextOptions) => {
  return {
    userId: opts.userId,
    prisma,
  };
};

export const createTRPCContext = async (_opts: CreateNextContextOptions) => {
  const defaultUser = await getOrCreateDefaultUser();
  // Auto-seed sample data once per process when PREPTRAC_MODE is demo/seeded.
  // Cheap on the hot path: ensureSeededOnce short-circuits after the first call.
  await ensureSeededOnce(prisma, defaultUser.id);
  return createInnerTRPCContext({
    userId: defaultUser.id,
  });
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof Error &&
          error.cause.name === "ZodError" &&
          "flatten" in error.cause &&
          typeof (error.cause as { flatten: () => unknown }).flatten === "function"
            ? (error.cause as { flatten: () => unknown }).flatten()
            : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

/**
 * Rejects every mutation when the app is in read-only (demo) mode. Queries are
 * always allowed. This is the single server-side enforcement point: every write
 * in the app goes through `protectedProcedure`, so gating it here covers all
 * tRPC mutations regardless of router. Defense in depth — the client also
 * hides/disables write controls, but the server is the authority.
 */
const enforceReadOnly = t.middleware(async ({ type, next }) => {
  if (type === "mutation" && isReadOnly()) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Demo mode is read-only — adding, editing, and deleting are disabled.",
    });
  }
  return next();
});

/** Procedure that provides ctx.userId (always the default user; auth removed). */
export const protectedProcedure = t.procedure
  .use(enforceReadOnly)
  .use(({ ctx, next }) =>
    next({ ctx: { userId: ctx.userId } })
  );
