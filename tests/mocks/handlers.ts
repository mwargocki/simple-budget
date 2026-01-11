import { http, HttpResponse } from "msw";

export const handlers = [
  // Example handler - replace with actual API endpoints
  http.get("/api/health", () => {
    return HttpResponse.json({ status: "ok" });
  }),
];
