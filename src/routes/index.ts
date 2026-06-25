import { Router } from "express";
import { produtoRouter } from "./produto.routes";
import { categoriaRouter } from "./categoria.routes";

const router = Router();

router.use("/produtos", produtoRouter);
router.use("/categorias", categoriaRouter);

export { router };