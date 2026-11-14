import type { RouteObject } from "react-router";
import { ModerationPage } from "./ModerationPage";

export const route: RouteObject = {
  path: "/moderation/:channelId",
  Component: ModerationPage,
};
