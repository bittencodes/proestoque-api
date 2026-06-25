import { Request, Response, NextFunction } from "express";
import { prisma } from "../prisma/client";
import { AppError } from "../middlewares/errorHandler";

export class MovimentacaoController {

  // ── POST /api/produtos/:id/movimentacao ──────────────────
  async criar(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      // GARANTE QUE ID SEJA STRING (Express pode retornar string | string[])
      const produtoId = Array.isArray(id) ? id[0] : id;
      const { tipo, quantidade, observacao } = req.body;

      // Validações
      if (!tipo || !quantidade) {
        throw new AppError("Campos obrigatórios: tipo, quantidade");
      }
      if (!["entrada", "saida"].includes(tipo)) {
        throw new AppError("Tipo deve ser 'entrada' ou 'saida'", 400);
      }
      if (quantidade <= 0) {
        throw new AppError("Quantidade deve ser maior que zero", 400);
      }

      // Verifica se o produto existe
      const produto = await prisma.produto.findUnique({
        where: { id: produtoId }
      });
      if (!produto) {
        throw new AppError("Produto não encontrado", 404);
      }

      // ── TRANSAÇÃO ──
      const result = await prisma.$transaction(async (tx) => {
        const novaQuantidade = tipo === "entrada"
          ? produto.quantidade + Number(quantidade)
          : produto.quantidade - Number(quantidade);

        if (novaQuantidade < 0) {
          throw new AppError("Quantidade insuficiente em estoque", 400);
        }

        // 1. Cria movimentação
        const movimentacao = await tx.movimentacao.create({
          data: {
            tipo,
            quantidade: Number(quantidade),
            observacao: observacao || null,
            produtoId: produtoId,
          },
        });

        // 2. Atualiza quantidade do produto
        const produtoAtualizado = await tx.produto.update({
          where: { id: produtoId },
          data: {
            quantidade: novaQuantidade,
            ultimaMovimentacao: new Date(),
          },
          include: { categoria: true },
        });

        return { movimentacao, produto: produtoAtualizado };
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  // ── GET /api/produtos/:id/movimentacoes ──────────────────
  async listarPorProduto(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const produtoId = Array.isArray(id) ? id[0] : id;

      const produto = await prisma.produto.findUnique({
        where: { id: produtoId }
      });
      if (!produto) {
        throw new AppError("Produto não encontrado", 404);
      }

      const movimentacoes = await prisma.movimentacao.findMany({
        where: { produtoId: produtoId },
        orderBy: { data: "desc" },
      });

      res.json(movimentacoes);
    } catch (error) {
      next(error);
    }
  }
}