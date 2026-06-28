import { Hono } from "hono";
import { collectionController } from "../controllers/collection.controller.js";
import {
  createCollectionSchema,
  addMemberSchema,
  updateCollectionStatusSchema,
} from "../schemas/collection.schema.js";
import useCatchErrors from "../lib/use-catch-errors.js";
import { validateSchema } from "../middleware/validate.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = new Hono();
const c = collectionController;

router.post(
  "/collections",
  validateSchema(createCollectionSchema),
  useCatchErrors(isAuthenticated(c.create.bind(c)))
);

router.get("/collections", useCatchErrors(isAuthenticated(c.list.bind(c))));

router.get("/collections/:id", useCatchErrors(isAuthenticated(c.get.bind(c))));

router.get("/collections/:id/members", useCatchErrors(isAuthenticated(c.listMembers.bind(c))));

router.post(
  "/collections/:id/members",
  validateSchema(addMemberSchema),
  useCatchErrors(isAuthenticated(c.addMember.bind(c)))
);

router.patch(
  "/collections/:id",
  validateSchema(updateCollectionStatusSchema),
  useCatchErrors(isAuthenticated(c.updateStatus.bind(c)))
);

export default router;
