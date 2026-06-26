import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../prisma/client";
import { AppError } from "../middlewares/errorHandler";
import { config } from "../config";

export type JwtPayload = {
  sub: string;
  nome: string;
  email: string;
};

// ── GERA O ACCESS TOKEN (curta duração) ──────────────────
function gerarAccessToken(usuario: { id: string; nome: string; email: string }): string {
  const payload: JwtPayload = {
    sub: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
  };
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn, 
  } as jwt.SignOptions);
}

// ── GERA O REFRESH TOKEN (longa duração) ─────────────────
function gerarRefreshToken(): string {
  // Gera uma string aleatória de 64 bytes em hexadecimal
  return crypto.randomBytes(64).toString("hex");
}

export class AuthController {

  // ── POST /api/auth/registro ──────────────────────────────
  async registrar(req: Request, res: Response, next: NextFunction) {
    try {
      const { nome, email, senha } = req.body;

      const usuarioExistente = await prisma.usuario.findUnique({
        where: { email },
      });
      if (usuarioExistente) {
        throw new AppError("E-mail já cadastrado", 409);
      }

      const senhaHash = await bcrypt.hash(senha, 10);

      const usuario = await prisma.usuario.create({
        data: {
          nome,
          email,
          senha: senhaHash,
          refreshToken: null,
          refreshTokenExpiracao: null,
        },
        select: { id: true, nome: true, email: true, criadoEm: true },
      });

      // Gera refresh token e access token
      const refreshToken = gerarRefreshToken();
      const refreshTokenExpiracao = new Date();
      refreshTokenExpiracao.setDate(refreshTokenExpiracao.getDate() + 30); // 30 dias

      // Salva o refresh token no banco
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { refreshToken, refreshTokenExpiracao },
      });

      const accessToken = gerarAccessToken(usuario);

      res.status(201).json({
        usuario,
        token: accessToken,
        refreshToken,
      });
    } catch (error) {
      next(error);
    }
  }

  // ── POST /api/auth/login ─────────────────────────────────
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, senha } = req.body;

      const usuario = await prisma.usuario.findUnique({
        where: { email },
      });
      if (!usuario) {
        throw new AppError("E-mail ou senha inválidos", 401);
      }

      const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
      if (!senhaCorreta) {
        throw new AppError("E-mail ou senha inválidos", 401);
      }

      // Gera novo refresh token (roda sempre que faz login)
      const refreshToken = gerarRefreshToken();
      const refreshTokenExpiracao = new Date();
      refreshTokenExpiracao.setDate(refreshTokenExpiracao.getDate() + 30);

      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { refreshToken, refreshTokenExpiracao },
      });

      const accessToken = gerarAccessToken(usuario);

      const { senha: _, ...usuarioSemSenha } = usuario;

      res.json({
        usuario: usuarioSemSenha,
        token: accessToken,
        refreshToken,
      });
    } catch (error) {
      next(error);
    }
  }

  // ── POST /api/auth/refresh ──────────────────────────────
  // Recebe o refresh token e gera um novo access token
  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new AppError("Refresh token não fornecido", 401);
      }

      // Busca o usuário pelo refresh token
      const usuario = await prisma.usuario.findFirst({
        where: { refreshToken },
      });

      if (!usuario) {
        throw new AppError("Refresh token inválido", 401);
      }

      // Verifica se o refresh token expirou
      if (usuario.refreshTokenExpiracao && new Date() > usuario.refreshTokenExpiracao) {
        // Remove o refresh token expirado do banco
        await prisma.usuario.update({
          where: { id: usuario.id },
          data: { refreshToken: null, refreshTokenExpiracao: null },
        });
        throw new AppError("Refresh token expirado. Faça login novamente.", 401);
      }

      // Gera um novo access token
      const novoAccessToken = gerarAccessToken(usuario);

      res.json({ token: novoAccessToken });
    } catch (error) {
      next(error);
    }
  }

  // ── POST /api/auth/logout ────────────────────────────────
  // Remove o refresh token do banco (invalida)
  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).usuario?.sub;

      if (userId) {
        await prisma.usuario.update({
          where: { id: userId },
          data: { refreshToken: null, refreshTokenExpiracao: null },
        });
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  // ── GET /api/auth/me ─────────────────────────────────────
  async perfil(req: Request, res: Response, next: NextFunction) {
    try {
      const usuario = await prisma.usuario.findUnique({
        where: { id: (req as any).usuario.sub },
        select: { id: true, nome: true, email: true, criadoEm: true },
      });
      if (!usuario) throw new AppError("Usuário não encontrado", 404);
      res.json(usuario);
    } catch (error) {
      next(error);
    }
  }
}