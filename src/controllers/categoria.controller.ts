import { Request, Response, NextFunction } from "express";
import { prisma } from "../prisma/client";
import { AppError } from "../middlewares/errorHandler";

export class CategoriaController {

  async listar(_req: Request, res: Response, next: NextFunction) {
    try {
      const categorias = await prisma.categoria.findMany({
        orderBy: { nome: "asc" },
        include: { _count: { select: { produtos: true } } },
      });
      res.json(categorias);
    } catch (error) { next(error); }
  }

  async buscarPorId(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const idString = String(id);
      const categoria = await prisma.categoria.findUnique({
        where: { id: idString },
        include: { produtos: { orderBy: { nome: "asc" } } },
      });
      if (!categoria) throw new AppError("Categoria não encontrada", 404);
      res.json(categoria);
    } catch (error) { next(error); }
  }
}