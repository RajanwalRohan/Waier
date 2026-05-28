import { PrismaClient } from "@prisma/client";

/**
 * Singleton Prisma client — prevents exhausting database connections
 * during Next.js hot-reloading in development.
 *
 * SECURITY: A $use middleware enforces that every HealthMetric and
 * WearableConnection query includes a userId filter. This is defense-in-depth
 * against accidental cross-user data leakage — the application code should
 * already include userId, but this middleware catches any that slip through.
 */

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/** Models that MUST always be filtered by userId. */
const USER_SCOPED_MODELS = new Set(["HealthMetric", "WearableConnection", "Workout", "Meal"]);

function hasUserIdFilter(where: Record<string, unknown> | undefined): boolean {
  if (!where) return false;
  if ("userId" in where) return true;
  // Also allow filtering by user relation
  if ("user" in where) return true;
  // findUnique by id is safe (already scoped by primary key lookup — ownership
  // is checked in the route handler)
  if ("id" in where) return true;
  return false;
}

function createClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  client.$use(async (params, next) => {
    // Enforce userId filter on bulk operations that could leak cross-user data.
    // Single-record lookups (findUnique, update by id, delete by id) are safe
    // because ownership is verified in the route handler after fetch.
    if (params.model && USER_SCOPED_MODELS.has(params.model)) {
      const isBulk = ["findMany", "count", "aggregate", "groupBy", "updateMany", "deleteMany"].includes(params.action);

      if (isBulk) {
        const where = params.args?.where as Record<string, unknown> | undefined;
        if (!hasUserIdFilter(where)) {
          const msg = `[DATA ISOLATION] ${params.model}.${params.action} called without userId filter`;
          if (process.env.NODE_ENV === "production") {
            throw new Error(msg);
          } else {
            console.warn(msg);
          }
        }
      }
    }
    return next(params);
  });

  return client;
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
