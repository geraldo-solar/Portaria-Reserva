/**
 * Sistema de Autenticação Standalone (sem dependências Manus)
 * Usa PIN armazenado em variável de ambiente
 */

import { Request, Response } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const ADMIN_PIN = process.env.ADMIN_PIN || "1234";
const SESSION_COOKIE_NAME = "portaria_session";

export interface SessionUser {
  id: number;
  openId: string;
  email: string | null;
  name: string | null;
  loginMethod: string | null;
  role: "admin" | "user";
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
}

/**
 * Verifica se o PIN está correto
 */
export function verifyPin(pin: string): boolean {
  return pin === ADMIN_PIN;
}

/**
 * Cria um token JWT para o usuário
 */
export function createToken(user: SessionUser): string {
  return jwt.sign(
    {
      id: user.id,
      openId: user.openId,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
}

/**
 * Verifica e decodifica um token JWT
 */
export function verifyToken(token: string): SessionUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return {
      id: decoded.id,
      openId: decoded.openId,
      email: decoded.email,
      name: decoded.name,
      loginMethod: "pin",
      role: decoded.role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
  } catch (error) {
    return null;
  }
}

/**
 * Extrai o usuário do cookie de sessão
 */
export function getUserFromRequest(req: Request): SessionUser | null {
  const token = req.cookies[SESSION_COOKIE_NAME];
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Define o cookie de sessão
 */
export function setSessionCookie(res: Response, user: SessionUser): void {
  const token = createToken(user);
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 60 * 60 * 1000, // 1 hora
    path: "/",
  });
}

/**
 * Remove o cookie de sessão
 */
export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });
}
