import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { validate } from "../middlewares/validate";
import { registroSchema, loginSchema } from "../schemas/auth.schema";
import { autenticar } from "../middlewares/auth";

const router = Router();
const controller = new AuthController();

router.post("/registro", validate(registroSchema), controller.registrar.bind(controller));
router.post("/login", validate(loginSchema), controller.login.bind(controller));
router.get("/me", autenticar, controller.perfil.bind(controller));

export { router as authRouter };