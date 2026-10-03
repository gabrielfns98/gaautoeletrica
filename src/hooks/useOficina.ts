import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Veiculo {
  id: string;
  user_id: string;
  plate: string;
  brand: string;
  model: string;
  year: number | null;
  color: string | null;
  created_at: string;
}

export interface Ordem {
  id: string;
  user_id: string;
  vehicle_id: string;
  service_type: string;
  description: string | null;
  status: string;
  scheduled_date: string | null;
  completed_date: string | null;
  cost: number | null;
  created_at: string;
  vehicles: Pick<Veiculo, "id" | "plate" | "brand" | "model" | "year" | "color"> | null;
}

export interface Perfil {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
}

const SELECT_ORDEM = `
  id, user_id, vehicle_id, service_type, description, status,
  scheduled_date, completed_date, cost, created_at,
  vehicles ( id, plate, brand, model, year, color )
`;

/* ------------------------------------------------------------------ cliente */

export function useVeiculos() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["veiculos", user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<Veiculo[]> => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Veiculo[];
    },
  });
}

export function useOrdens() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["ordens", user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<Ordem[]> => {
      const { data, error } = await supabase
        .from("services")
        .select(SELECT_ORDEM)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Ordem[];
    },
  });
}

export function useOrdem(id: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["ordem", id],
    enabled: Boolean(user && id),
    queryFn: async (): Promise<Ordem | null> => {
      const { data, error } = await supabase
        .from("services")
        .select(SELECT_ORDEM)
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as Ordem) ?? null;
    },
  });
}

export function useCriarVeiculo() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entrada: {
      plate: string;
      brand: string;
      model: string;
      year?: number | null;
    }): Promise<Veiculo> => {
      const { data, error } = await supabase
        .from("vehicles")
        .insert({ ...entrada, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as Veiculo;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["veiculos"] });
    },
  });
}

export function useCriarOrdem() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entrada: {
      vehicle_id: string;
      service_type: string;
      description?: string | null;
      scheduled_date?: string | null;
    }): Promise<Ordem> => {
      const { data, error } = await supabase
        .from("services")
        .insert({ ...entrada, user_id: user!.id, status: "pending" })
        .select(SELECT_ORDEM)
        .single();
      if (error) throw error;
      return data as unknown as Ordem;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ordens"] });
    },
  });
}

export function usePerfil() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["perfil", user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<Perfil | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, phone")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as Perfil) ?? null;
    },
  });
}

export function useSalvarPerfil() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entrada: { full_name: string; phone: string }) => {
      // O gatilho handle_new_user cria o perfil no cadastro, mas contas antigas
      // podem não ter linha — por isso upsert em vez de update.
      const { error } = await supabase
        .from("profiles")
        .upsert({ ...entrada, user_id: user!.id }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["perfil"] });
    },
  });
}

/* ------------------------------------------------------------------- oficina */

export interface OrdemDaFila extends Ordem {
  cliente: string | null;
}

export function useFilaDaOficina(ativo: boolean) {
  return useQuery({
    queryKey: ["fila-oficina"],
    enabled: ativo,
    queryFn: async (): Promise<OrdemDaFila[]> => {
      const { data, error } = await supabase
        .from("services")
        .select(SELECT_ORDEM)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const ordens = (data ?? []) as unknown as Ordem[];
      if (ordens.length === 0) return [];

      // Os perfis vêm em consulta separada: services.user_id aponta para auth.users,
      // não para profiles, então o PostgREST não consegue embutir o join.
      const ids = [...new Set(ordens.map((o) => o.user_id))];
      const { data: perfis } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ids);

      const nomePorUsuario = new Map(
        (perfis ?? []).map((p) => [p.user_id, p.full_name]),
      );

      return ordens.map((o) => ({ ...o, cliente: nomePorUsuario.get(o.user_id) ?? null }));
    },
  });
}

export function useAtualizarStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const atualizacao: Record<string, unknown> = { status };
      if (status === "completed") atualizacao.completed_date = new Date().toISOString();
      const { error } = await supabase.from("services").update(atualizacao).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fila-oficina"] });
      qc.invalidateQueries({ queryKey: ["ordens"] });
      qc.invalidateQueries({ queryKey: ["ordem"] });
    },
  });
}
