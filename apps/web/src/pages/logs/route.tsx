import type { RouteObject } from "react-router";
import { LogViewerPage } from "./LogViewer";

export const route: RouteObject = {
  path: "/logs/:channelId",
  Component: LogViewerPage,
};
