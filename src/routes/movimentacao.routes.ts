import { Router } from "express";
import { MovimentacaoController } from "../controllers/movimentacao.controller";

const router = Router();
const controller = new MovimentacaoController();

router.post("/:id/movimentacao", controller.criar.bind(controller));
router.get("/:id/movimentacoes", controller.listarPorProduto.bind(controller));

export default router;