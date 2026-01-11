import { defineMiddleware } from "astro:middleware";

import { supabaseClient } from "../db/supabase.client.ts";

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.supabase = supabaseClient;

  const pathname = context.url.pathname;

  if (pathname === "/") {
    const {
      data: { session },
    } = await context.locals.supabase.auth.getSession();

    if (session) {
      return context.redirect("/app");
    }
    return context.redirect("/login");
  }

  return next();
});
