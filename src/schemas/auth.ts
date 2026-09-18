import { z } from "zod";

const email = z.string().trim().email("Informe um e-mail válido.").max(254);
const senha = z.string().min(6, "A senha deve ter ao menos 6 caracteres.").max(128);

export const loginSchema = z.object({ email, senha });

export const cadastroSchema = z
  .object({
    nome: z.string().trim().min(1, "Informe seu nome.").max(80),
    email,
    senha,
    confirmar: z.string(),
  })
  .refine((dados) => dados.senha === dados.confirmar, {
    message: "As senhas não conferem.",
    path: ["confirmar"],
  });

export const recuperarSchema = z.object({ email });

export const redefinirSchema = z
  .object({ senha, confirmar: z.string() })
  .refine((dados) => dados.senha === dados.confirmar, {
    message: "As senhas não conferem.",
    path: ["confirmar"],
  });
