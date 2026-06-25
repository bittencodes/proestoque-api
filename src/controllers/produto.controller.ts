import { Request, Response, NextFunction } from "express";
import { prisma } from "../prisma/client";
import { AppError } from "../middlewares/errorHandler";

export class ProdutoController {

  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const { busca, categoriaId, apenasAlerta } = req.query;
      const produtos = await prisma.produto.findMany({
        where: {
          ...(busca && { nome: { contains: String(busca), mode: "insensitive" } }),
          ...(categoriaId && { categoriaId: String(categoriaId) }),
          ...(apenasAlerta === "true" && {
            quantidade: { lt: prisma.produto.fields.quantidadeMinima }
          }),
        },
        include: { categoria: true },
        orderBy: { nome: "asc" },
      });
      res.json(produtos);
    } catch (error) { next(error); }
  }

  async buscarPorId(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const idString = String(id);
      const produto = await prisma.produto.findUnique({
        where: { id: idString },
        include: { categoria: true },
      });
      if (!produto) throw new AppError("Produto não encontrado", 404);
      res.json(produto);
    } catch (error) { next(error); }
  }

  async criar(req: Request, res: Response, next: NextFunction) {
    try {
      const { nome, categoriaId, quantidade, quantidadeMinima, preco, unidade, observacao, foto } = req.body;
      if (!nome || !categoriaId || preco === undefined) {
        throw new AppError("Campos obrigatórios: nome, categoriaId, preco");
      }
      const categoriaExiste = await prisma.categoria.findUnique({ where: { id: categoriaId } });
      if (!categoriaExiste) throw new AppError("Categoria não encontrada", 404);
      const produto = await prisma.produto.create({
        data: {
          nome: String(nome).trim(),
          categoriaId,
          quantidade: Number(quantidade ?? 0),
          quantidadeMinima: Number(quantidadeMinima ?? 0),
          preco: Number(preco),
          unidade: String(unidade ?? "un"),
          observacao: observacao ? String(observacao) : null,
          foto: foto ? String(foto) : null,
        },
        include: { categoria: true },
      });
      res.status(201).json(produto);
    } catch (error) { next(error); }
  }

  async atualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const idString = String(id);
      const { nome, categoriaId, quantidade, quantidadeMinima, preco, unidade, observacao, foto } = req.body;
      const produtoExiste = await prisma.produto.findUnique({ where: { id: idString } });
      if (!produtoExiste) throw new AppError("Produto não encontrado", 404);
      if (categoriaId) {
        const catExiste = await prisma.categoria.findUnique({ where: { id: categoriaId } });
        if (!catExiste) throw new AppError("Categoria não encontrada", 404);
      }
      const produto = await prisma.produto.update({
        where: { id: idString },
        data: {
          ...(nome !== undefined && { nome: String(nome).trim() }),
          ...(categoriaId !== undefined && { categoriaId }),
          ...(quantidade !== undefined && { quantidade: Number(quantidade) }),
          ...(quantidadeMinima !== undefined && { quantidadeMinima: Number(quantidadeMinima) }),
          ...(preco !== undefined && { preco: Number(preco) }),
          ...(unidade !== undefined && { unidade: String(unidade) }),
          ...(observacao !== undefined && { observacao: observacao || null }),
          ...(foto !== undefined && { foto: foto || null }),
          ultimaMovimentacao: new Date(),
        },
        include: { categoria: true },
      });
      res.json(produto);
    } catch (error) { next(error); }
  }

  async deletar(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const idString = String(id);
      const produtoExiste = await prisma.produto.findUnique({ where: { id: idString } });
      if (!produtoExiste) throw new AppError("Produto não encontrado", 404);
      await prisma.produto.delete({ where: { id: idString } });
      res.status(204).send();
    } catch (error) { next(error); }
  }
}