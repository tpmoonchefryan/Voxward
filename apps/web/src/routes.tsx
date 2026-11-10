import { createBrowserRouter, type RouteObject } from "react-router";

interface PageModule {
  readonly route: RouteObject;
}

const pageModules = import.meta.glob<PageModule>("./pages/*/route.tsx", { eager: true });

export const router = createBrowserRouter(Object.values(pageModules).map((page) => page.route));
