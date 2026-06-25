import { Router } from "express";
import { produtoRouter } from "./produto.routes";
import { categoriaRouter } from "./categoria.routes";
import  movimentacaoRouter from "./movimentacao.routes";

const router = Router();

router.use("/produtos", produtoRouter);
router.use("/categorias", categoriaRouter);
router.use("/produtos", movimentacaoRouter); 

export { router };