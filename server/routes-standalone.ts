/**
 * Rotas de autenticação standalone (sem OAuth Manus)
 */

import { Router } from "express";
import { verifyPin, setSessionCookie, clearSessionCookie } from "./auth-standalone";
import { upsertUser, getUserByOpenId } from "./db";

const router = Router();

/**
 * POST /api/auth/login
 * Autentica usuário com PIN
 */
router.post("/api/auth/login", async (req, res) => {
  try {
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({ error: "PIN é obrigatório" });
    }

    if (!verifyPin(pin)) {
      return res.status(401).json({ error: "PIN inválido" });
    }

    // Criar ou atualizar usuário admin
    const openId = "admin-local";
    await upsertUser({
      openId,
      name: "Administrador",
      email: "admin@portaria.local",
      loginMethod: "pin",
      role: "admin",
      lastSignedIn: new Date(),
    });

    const user = await getUserByOpenId(openId);
    if (!user) {
      return res.status(500).json({ error: "Erro ao criar usuário" });
    }

    // Definir cookie de sessão
    setSessionCookie(res, user);

    res.json({ success: true, user: { name: user.name, role: user.role } });
  } catch (error) {
    console.error("[Auth] Login error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

/**
 * POST /api/auth/logout
 * Remove sessão do usuário
 */
router.post("/api/auth/logout", (req, res) => {
  clearSessionCookie(res);
  res.json({ success: true });
});

/**
 * GET /api/auth/me
 * Retorna usuário atual
 */
router.get("/api/auth/me", async (req, res) => {
  try {
    const { getUserFromRequest } = await import("./auth-standalone");
    const user = getUserFromRequest(req);
    
    if (!user) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    res.json(user);
  } catch (error) {
    console.error("[Auth] Me error:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
