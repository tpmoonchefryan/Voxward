import { createBrowserRouter, type RouteObject } from "react-router";

interface PageModule {
  readonly route?: RouteObject;
  readonly routes?: readonly RouteObject[];
}

const pageModules = import.meta.glob<PageModule>("./pages/*/route.tsx", { eager: true });

export const router = createBrowserRouter(
  Object.values(pageModules).flatMap((page) =>
    page.routes !== undefined ? [...page.routes] : page.route !== undefined ? [page.route] : [],
  ),
);
