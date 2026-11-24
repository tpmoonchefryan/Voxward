import type { RouteObject } from "react-router";
import { BlockedPage } from "./BlockedPage";

export const route: RouteObject = {
  path: "/channels/:channelId/blocked",
  Component: BlockedPage,
};
