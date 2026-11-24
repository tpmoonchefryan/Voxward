import type { RouteObject } from "react-router";
import { AdminPage } from "./AdminPage";

export const routes: readonly RouteObject[] = [
  {
    path: "/admin/:channelId?",
    Component: AdminPage,
  },
  {
    path: "/settings/:channelId?",
    Component: AdminPage,
  },
];
