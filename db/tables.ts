/**
 * API Tester - send HTTP requests and inspect responses.
 *
 * Design goals:
 * - Allow users to save "request collections" like Postman/Insomnia.
 * - Keep execution history with status, duration, and size.
 * - Safe for future features like environment variables later.
 */

import { defineTable, column, NOW } from "astro:db";

export const ApiCollections = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text(),

    name: column.text(),                                // "My Backend APIs", "Stripe sandbox"
    description: column.text({ optional: true }),
    icon: column.text({ optional: true }),

    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

export const ApiRequests = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    collectionId: column.text({
      references: () => ApiCollections.columns.id,
      optional: true,
    }),
    userId: column.text(),

    name: column.text(),                                // "GET /users", "POST /login"
    method: column.text(),                              // "GET", "POST", "PUT", "DELETE"
    url: column.text(),
    queryParamsJson: column.text({ optional: true }),   // JSON of query params
    headersJson: column.text({ optional: true }),       // JSON of headers
    bodyMode: column.text({ optional: true }),          // "json", "form", "raw", etc.
    bodyContent: column.text({ optional: true }),       // raw body as string
    authMode: column.text({ optional: true }),          // "none", "bearer", etc.
    authConfigJson: column.text({ optional: true }),    // auth config (tokens, etc., ideally obfuscated at app layer)

    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

export const ApiRequestRuns = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    requestId: column.text({
      references: () => ApiRequests.columns.id,
    }),
    userId: column.text(),

    startedAt: column.date({ default: NOW }),
    completedAt: column.date({ optional: true }),

    statusCode: column.number({ optional: true }),
    statusText: column.text({ optional: true }),
    durationMs: column.number({ optional: true }),

    requestHeadersJson: column.text({ optional: true }), // snapshot at run time
    responseHeadersJson: column.text({ optional: true }),
    responseBody: column.text({ optional: true }),       // truncated/limited at app level if huge

    errorMessage: column.text({ optional: true }),

    createdAt: column.date({ default: NOW }),
  },
});

export const tables = {
  ApiCollections,
  ApiRequests,
  ApiRequestRuns,
} as const;
