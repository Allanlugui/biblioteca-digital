import { config } from "@/lib/config";
import { backendDrive, driveDisponivel } from "./drive";
import { backendSupabase } from "./supabase";
import type { BackendArmazenamento } from "./tipos";

export function selecionarBackend(forcar?: "drive" | "supabase"): BackendArmazenamento {
  const driver = forcar ?? config.storageDriver;
  if (driver === "drive" && driveDisponivel()) return backendDrive();
  return backendSupabase();
}

export function nomeBackendAtivo(): "drive" | "supabase" {
  return selecionarBackend().nome;
}
