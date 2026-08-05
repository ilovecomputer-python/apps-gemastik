import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { signAuthToken } from "../../lib/jwt.js";
import { HttpError } from "../../lib/http-error.js";
import { toPublicUser } from "../users/user.serializer.js";
import { loginSchema, registerSchema } from "./auth.schema.js";

export async function register(req: Request, res: Response) {
  const input = registerSchema.parse(req.body);

  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existing) {
    throw HttpError.conflict("Email sudah terdaftar", "EMAIL_TAKEN");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash,
    },
  });

  const token = signAuthToken({ sub: user.id });
  res.status(201).json({ token, user: toPublicUser(user) });
}

export async function login(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw HttpError.unauthorized("Email atau password salah", "INVALID_CREDENTIALS");
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw HttpError.unauthorized("Email atau password salah", "INVALID_CREDENTIALS");
  }

  const token = signAuthToken({ sub: user.id });
  res.json({ token, user: toPublicUser(user) });
}

export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) {
    throw HttpError.notFound("User tidak ditemukan");
  }
  res.json({ user: toPublicUser(user) });
}
