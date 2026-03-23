import { Router } from "express";
import { authController } from "../controllers/auth.controller.js";
import { asyncHandler } from "../middlewares/async-handler.js";
import { authenticate } from "../middlewares/authenticate.js";

export const authRouter = Router();

authRouter.post("/register", asyncHandler(authController.register));
authRouter.post("/login", asyncHandler(authController.login));
authRouter.get("/provider/:provider", asyncHandler(authController.provider));
authRouter.get("/callback/:provider", asyncHandler(authController.callback));
authRouter.post("/refresh", asyncHandler(authController.refresh));
authRouter.get("/verify", authenticate, asyncHandler(authController.verify));
authRouter.post("/logout", asyncHandler(authController.logout));
