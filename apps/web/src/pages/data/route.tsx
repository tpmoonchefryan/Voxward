import type { RouteObject } from "react-router";
import { DataPanelPage } from "./DataPanel";

export const route: RouteObject = {
  path: "/data/:channelId",
  Component: DataPanelPage,
};
