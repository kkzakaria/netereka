import type { Env } from "./types";

export default {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async fetch(request: Request, _env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/webhook") {
      return new Response("Webhook endpoint ready", { status: 200 });
    }

    return new Response("Not Found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
