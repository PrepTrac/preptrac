import { createNextApiHandler } from "@trpc/server/adapters/next";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

export default createNextApiHandler({
  router: appRouter,
  createContext: createTRPCContext,
  onError: ({ path, error }) => {
    console.error(`❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`);
    // Safely log the error object to prevent "Cannot read properties of undefined"
    try {
      if (error) {
        console.error(error);
      }
    } catch (loggingError) {
      console.error("Failed to log error details:", loggingError);
    }
  },
  responseMeta({ type, errors }) {
    // Handle CORS if needed
    return {};
  },
});

