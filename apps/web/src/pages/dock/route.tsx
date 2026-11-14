import type { RouteObject } from "react-router";
import { DockPage } from "./DockPage";

export const route: RouteObject = {
  path: "/dock/:roomId",
  Component: DockPage,
};
