import type { RouteObject } from "react-router";
import { IntegrationsPage } from "./IntegrationsPage";

export const route: RouteObject = {
  path: "/integrations/:channelId?",
  Component: IntegrationsPage,
};
