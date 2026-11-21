import { exportCsv } from "@/lib/game";
import { handler } from "@/lib/http";
import { idParam } from "@/lib/route-ids";

export const GET = handler({ organizer: true }, async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { filename, body } = exportCsv(await idParam(ctx.params));
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
});
