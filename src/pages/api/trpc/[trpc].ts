import { createNextApiHandler } from "@trpc/server/adapters/next";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { logger } from "~/server/logger";

export default createNextApiHandler({
  router: appRouter,
  createContext: createTRPCContext,
  onError: ({ path, error }) => {
    logger.error("tRPC request failed", {
      path: path ?? "<no-path>",
      code: error.code,
      error: error.message,
    });
  },
  responseMeta({ type, errors }) {
    // Handle CORS if needed
    return {};
  },
});

