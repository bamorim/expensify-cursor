import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { organizationRouter } from "./routers/organization";
import { invitationRouter } from "./routers/invitation";
import { memberRouter } from "./routers/member";
import { categoryRouter } from "./routers/category";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  organizations: organizationRouter,
  invitations: invitationRouter,
  members: memberRouter,
  categories: categoryRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.organizations.all();
 *       ^? Organization[]
 */
export const createCaller = createCallerFactory(appRouter);
