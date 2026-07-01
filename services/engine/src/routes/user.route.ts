import { Hono } from "hono";
import { userController } from "../controllers/user.controller.js";
import useCatchErrors from "../lib/use-catch-errors.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = new Hono();

router.get(
  "/users",
  useCatchErrors(isAuthenticated(userController.list.bind(userController)))
);

router.get(
  "/users/:id",
  useCatchErrors(isAuthenticated(userController.byId.bind(userController)))
);

export default router;
