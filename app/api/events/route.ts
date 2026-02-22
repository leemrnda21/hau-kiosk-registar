import { addSubscriber, removeSubscriber } from "@/lib/sse-broker";

export const runtime = "nodejs";

export async function GET() {
  const encoder = new TextEncoder();
  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const id = crypto.randomUUID();

      const write = (data: string) => {
        controller.enqueue(encoder.encode(data));
      };

      addSubscriber({ id, write });
      write(`event: ping\ndata: {}\n\n`);

      const pingInterval = setInterval(() => {
        write(`event: ping\ndata: {}\n\n`);
      }, 25000);

      cleanup = () => {
        clearInterval(pingInterval);
        removeSubscriber(id);
      };
    },
    cancel() {
      cleanup?.();
      cleanup = null;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
