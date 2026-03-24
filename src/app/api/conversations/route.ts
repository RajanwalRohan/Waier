import { db } from "@/lib/db";
import { rateLimiters } from "@/lib/rate-limit";
import {
  successResponse,
  errorResponse,
  rateLimitResponse,
  getClientIp,
  parseBody,
  handleApiError,
  requireAuthOrRespond,
} from "@/lib/api-utils";
import { paginationSchema } from "@/lib/validations/common";
import { z } from "zod";

const createConversationSchema = z.object({
  title: z.string().max(200).trim().optional(),
}).strict();

/**
 * GET /api/conversations
 * List the authenticated user's AI coaching conversations.
 */
export async function GET(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.general.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams);
    const { page, limit } = paginationSchema.parse(params);

    const [conversations, total] = await Promise.all([
      db.aIConversation.findMany({
        where: { userId: session.user.id },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { messages: true } },
        },
      }),
      db.aIConversation.count({ where: { userId: session.user.id } }),
    ]);

    return successResponse({ conversations, total, page, limit });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * POST /api/conversations
 * Create a new AI coaching conversation.
 */
export async function POST(request: Request) {
  try {
    const session = await requireAuthOrRespond();
    if (!session) return errorResponse("Authentication required", 401);

    const ip = getClientIp(request);
    const rl = rateLimiters.mutation.check(`${session.user.id}:${ip}`);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await parseBody(request);
    const data = createConversationSchema.parse(body ?? {});

    const conversation = await db.aIConversation.create({
      data: {
        userId: session.user.id,
        title: data.title ?? "New conversation",
      },
    });

    return successResponse({ conversation }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
