import type { RouteObject } from "react-router";
import { LoginPage } from "./LoginPage";

export const route: RouteObject = {
  path: "/login",
  element: <LoginPage />,
};
