import { auth } from "../../../../lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth.handler);
//export const GET = auth.api.handlers.GET;
//export const POST = auth.api.handlers.POST;
