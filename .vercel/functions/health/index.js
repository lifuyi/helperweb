// api/health/index.ts
var runtime = "nodejs";
async function GET() {
  return Response.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
}
export {
  GET,
  runtime
};
