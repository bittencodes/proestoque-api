import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma/client";
import { AppError } from "../middlewares/errorHandler";
import { config } from "../config";

export type JwtPayload = {
  sub: string;
  nome: string;
  email: string;
};

function gerarToken(usuario: { id: string; nome: string; email: string }): string {
  const payload: JwtPayload = {
    sub: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
  };
  return jwt.sign(payload, config.jwtSecret as string, {
    expiresIn: config.jwtExpiresIn,
  } as jwt.SignOptions);
}

export class AuthController {

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
        data: { nome, email, senha: senhaHash },
        select: { id: true, nome: true, email: true, criadoEm: true },
      });

      const token = gerarToken(usuario);

      res.status(201).json({ usuario, token });
    } catch (error) {
      next(error);
    }
  }

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

      const token = gerarToken(usuario);

      const { senha: _, ...usuarioSemSenha } = usuario;

      res.json({ usuario: usuarioSemSenha, token });
    } catch (error) {
      next(error);
    }
  }

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