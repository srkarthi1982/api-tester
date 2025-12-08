import { defineAction, ActionError, type ActionAPIContext } from "astro:actions";
import { z } from "astro:schema";
import {
  ApiCollections,
  ApiRequestRuns,
  ApiRequests,
  and,
  db,
  eq,
} from "astro:db";

function requireUser(context: ActionAPIContext) {
  const locals = context.locals as App.Locals | undefined;
  const user = locals?.user;

  if (!user) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to perform this action.",
    });
  }

  return user;
}

async function getOwnedCollection(collectionId: string, userId: string) {
  const [collection] = await db
    .select()
    .from(ApiCollections)
    .where(and(eq(ApiCollections.id, collectionId), eq(ApiCollections.userId, userId)));

  if (!collection) {
    throw new ActionError({
      code: "NOT_FOUND",
      message: "API collection not found.",
    });
  }

  return collection;
}

async function getOwnedRequest(requestId: string, userId: string) {
  const [request] = await db
    .select()
    .from(ApiRequests)
    .where(and(eq(ApiRequests.id, requestId), eq(ApiRequests.userId, userId)));

  if (!request) {
    throw new ActionError({
      code: "NOT_FOUND",
      message: "API request not found.",
    });
  }

  return request;
}

export const server = {
  createCollection: defineAction({
    input: z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      icon: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const now = new Date();

      const [collection] = await db
        .insert(ApiCollections)
        .values({
          id: crypto.randomUUID(),
          userId: user.id,
          name: input.name,
          description: input.description,
          icon: input.icon,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return { success: true, data: { collection } };
    },
  }),

  updateCollection: defineAction({
    input: z
      .object({
        id: z.string().min(1),
        name: z.string().optional(),
        description: z.string().optional(),
        icon: z.string().optional(),
      })
      .refine(
        (input) =>
          input.name !== undefined ||
          input.description !== undefined ||
          input.icon !== undefined,
        { message: "At least one field must be provided to update." }
      ),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedCollection(input.id, user.id);

      const [collection] = await db
        .update(ApiCollections)
        .set({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.icon !== undefined ? { icon: input.icon } : {}),
          updatedAt: new Date(),
        })
        .where(eq(ApiCollections.id, input.id))
        .returning();

      return { success: true, data: { collection } };
    },
  }),

  listCollections: defineAction({
    input: z.object({}).optional(),
    handler: async (_input, context) => {
      const user = requireUser(context);

      const collections = await db
        .select()
        .from(ApiCollections)
        .where(eq(ApiCollections.userId, user.id));

      return { success: true, data: { items: collections, total: collections.length } };
    },
  }),

  createRequest: defineAction({
    input: z.object({
      collectionId: z.string().optional(),
      name: z.string().min(1),
      method: z.string().min(1),
      url: z.string().min(1),
      queryParamsJson: z.string().optional(),
      headersJson: z.string().optional(),
      bodyMode: z.string().optional(),
      bodyContent: z.string().optional(),
      authMode: z.string().optional(),
      authConfigJson: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      if (input.collectionId) {
        await getOwnedCollection(input.collectionId, user.id);
      }

      const now = new Date();
      const [request] = await db
        .insert(ApiRequests)
        .values({
          id: crypto.randomUUID(),
          collectionId: input.collectionId ?? null,
          userId: user.id,
          name: input.name,
          method: input.method,
          url: input.url,
          queryParamsJson: input.queryParamsJson,
          headersJson: input.headersJson,
          bodyMode: input.bodyMode,
          bodyContent: input.bodyContent,
          authMode: input.authMode,
          authConfigJson: input.authConfigJson,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return { success: true, data: { request } };
    },
  }),

  updateRequest: defineAction({
    input: z
      .object({
        id: z.string().min(1),
        collectionId: z.string().optional(),
        name: z.string().optional(),
        method: z.string().optional(),
        url: z.string().optional(),
        queryParamsJson: z.string().optional(),
        headersJson: z.string().optional(),
        bodyMode: z.string().optional(),
        bodyContent: z.string().optional(),
        authMode: z.string().optional(),
        authConfigJson: z.string().optional(),
      })
      .refine(
        (input) =>
          input.collectionId !== undefined ||
          input.name !== undefined ||
          input.method !== undefined ||
          input.url !== undefined ||
          input.queryParamsJson !== undefined ||
          input.headersJson !== undefined ||
          input.bodyMode !== undefined ||
          input.bodyContent !== undefined ||
          input.authMode !== undefined ||
          input.authConfigJson !== undefined,
        { message: "At least one field must be provided to update." }
      ),
    handler: async (input, context) => {
      const user = requireUser(context);
      const request = await getOwnedRequest(input.id, user.id);

      if (input.collectionId !== undefined && input.collectionId !== null) {
        await getOwnedCollection(input.collectionId, user.id);
      }

      const [updated] = await db
        .update(ApiRequests)
        .set({
          ...(input.collectionId !== undefined ? { collectionId: input.collectionId } : {}),
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.method !== undefined ? { method: input.method } : {}),
          ...(input.url !== undefined ? { url: input.url } : {}),
          ...(input.queryParamsJson !== undefined ? { queryParamsJson: input.queryParamsJson } : {}),
          ...(input.headersJson !== undefined ? { headersJson: input.headersJson } : {}),
          ...(input.bodyMode !== undefined ? { bodyMode: input.bodyMode } : {}),
          ...(input.bodyContent !== undefined ? { bodyContent: input.bodyContent } : {}),
          ...(input.authMode !== undefined ? { authMode: input.authMode } : {}),
          ...(input.authConfigJson !== undefined ? { authConfigJson: input.authConfigJson } : {}),
          updatedAt: new Date(),
        })
        .where(eq(ApiRequests.id, input.id))
        .returning();

      return { success: true, data: { request: updated } };
    },
  }),

  deleteRequest: defineAction({
    input: z.object({
      id: z.string().min(1),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedRequest(input.id, user.id);

      const result = await db.delete(ApiRequests).where(eq(ApiRequests.id, input.id));

      if (result.rowsAffected === 0) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "API request not found.",
        });
      }

      return { success: true };
    },
  }),

  listRequests: defineAction({
    input: z.object({
      collectionId: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      if (input.collectionId) {
        await getOwnedCollection(input.collectionId, user.id);
      }

      const filters = [eq(ApiRequests.userId, user.id)];
      if (input.collectionId) {
        filters.push(eq(ApiRequests.collectionId, input.collectionId));
      }

      const requests = await db.select().from(ApiRequests).where(and(...filters));

      return { success: true, data: { items: requests, total: requests.length } };
    },
  }),

  logRequestRun: defineAction({
    input: z.object({
      requestId: z.string().min(1),
      startedAt: z.date().optional(),
      completedAt: z.date().optional(),
      statusCode: z.number().optional(),
      statusText: z.string().optional(),
      durationMs: z.number().optional(),
      requestHeadersJson: z.string().optional(),
      responseHeadersJson: z.string().optional(),
      responseBody: z.string().optional(),
      errorMessage: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const request = await getOwnedRequest(input.requestId, user.id);

      const [run] = await db
        .insert(ApiRequestRuns)
        .values({
          id: crypto.randomUUID(),
          requestId: input.requestId,
          userId: user.id,
          startedAt: input.startedAt ?? new Date(),
          completedAt: input.completedAt,
          statusCode: input.statusCode,
          statusText: input.statusText,
          durationMs: input.durationMs,
          requestHeadersJson: input.requestHeadersJson,
          responseHeadersJson: input.responseHeadersJson,
          responseBody: input.responseBody,
          errorMessage: input.errorMessage,
          createdAt: new Date(),
        })
        .returning();

      return { success: true, data: { run } };
    },
  }),

  listRequestRuns: defineAction({
    input: z.object({
      requestId: z.string().min(1),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      await getOwnedRequest(input.requestId, user.id);

      const runs = await db
        .select()
        .from(ApiRequestRuns)
        .where(eq(ApiRequestRuns.requestId, input.requestId));

      return { success: true, data: { items: runs, total: runs.length } };
    },
  }),
};
