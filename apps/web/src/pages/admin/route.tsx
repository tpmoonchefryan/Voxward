import type { RouteObject } from "react-router";
import { AdminPage } from "./AdminPage";

export const route: RouteObject = {
  path: "/admin/:channelId?",
  Component: AdminPage,
};
