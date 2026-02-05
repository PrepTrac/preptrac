import { initTRPC } from "@trpc/server";
import { type CreateNextContextOptions } from "@trpc/server/adapters/next";
import { getOrCreateDefaultUser } from "~/server/auth";
import { prisma } from "~/server/db";

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

/** Procedure that provides ctx.userId (always the default user; auth removed). */
export const protectedProcedure = t.procedure.use(({ ctx, next }) =>
  next({ ctx: { userId: ctx.userId } })
);

