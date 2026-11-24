import type { RouteObject } from "react-router";
import { UsersPage } from "./UsersPage";

export const route: RouteObject = {
  path: "/users/:channelId?",
  Component: UsersPage,
};
