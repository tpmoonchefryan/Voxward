import type { RouteObject } from "react-router";
import { Stage } from "./Stage";

export const route: RouteObject = {
  path: "/overlay/:roomId",
  Component: Stage,
};
