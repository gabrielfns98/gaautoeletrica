import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { CURSO } from "@/config/curso";
import { Download, GraduationCap, MessageCircle, RefreshCw } from "lucide-react";

type Inscricao = Tables<"course_registrations">;

const STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  pendente: { label: "Aguardando pagamento", variant: "secondary" },
  pago: { label: "Pago", variant: "default" },
  cancelado: { label: "Cancelado", variant: "destructive" },
};

const EXPERIENCIA: Record<string, string> = {
  nenhuma: "Nunca mexeu",
  basica: "Sabe o básico",
  trabalho_na_area: "Trabalha na área",
};

const CourseRegistrationsAdmin = () => {
  const { toast } = useToast();
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("course_registrations")
      .select("*")
      .eq("turma", CURSO.turma)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Erro ao carregar inscrições:", error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar as inscrições do curso." });
    } else {
      setInscricoes(data ?? []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const alterarStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("course_registrations").update({ status }).eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível atualizar o status." });
      return;
    }
    setInscricoes((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    toast({ title: "Status atualizado" });
  };

  const exportarCsv = () => {
    const cab = ["codigo", "nome", "whatsapp", "email", "cpf", "cidade", "experiencia", "forma_pagamento", "valor", "status", "criado_em"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const linhas = inscricoes.map((i) =>
      [i.codigo, i.nome, i.whatsapp, i.email, i.cpf, i.cidade, i.experiencia, i.forma_pagamento, i.valor, i.status, new Date(i.created_at).toLocaleString("pt-BR")]
        .map(esc)
        .join(";"),
    );
    const blob = new Blob(["﻿" + [cab.join(";"), ...linhas].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inscricoes-${CURSO.turma}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pagos = inscricoes.filter((i) => i.status === "pago").length;
  const pendentes = inscricoes.filter((i) => i.status === "pendente").length;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Inscrições do Treinamento de Natal
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
            <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={exportarCsv} disabled={!inscricoes.length}>
            <Download className="mr-1.5 h-4 w-4" />
            CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant="outline">{inscricoes.length} inscritos</Badge>
          <Badge>{pagos} pagos</Badge>
          <Badge variant="secondary">{pendentes} aguardando pagamento</Badge>
        </div>

        {loading ? (
          <div className="flex justify-center p-6">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        ) : inscricoes.length === 0 ? (
          <p className="text-muted-foreground">Nenhuma inscrição ainda.</p>
        ) : (
          inscricoes.map((i) => {
            const st = STATUS[i.status] ?? STATUS.pendente;
            const zap = "55" + i.whatsapp.replace(/\D/g, "");
            return (
              <Card key={i.id} className="p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={st.variant}>{st.label}</Badge>
                      <span className="font-mono text-xs text-muted-foreground">{i.codigo}</span>
                      <span className="text-xs text-muted-foreground">· {i.forma_pagamento === "pix" ? "Pix" : "Cartão"}</span>
                    </div>
                    <h3 className="font-semibold">{i.nome}</h3>
                    <p className="text-sm text-muted-foreground">
                      {i.whatsapp}
                      {i.email ? ` · ${i.email}` : ""}
                      {i.cidade ? ` · ${i.cidade}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {i.experiencia ? `${EXPERIENCIA[i.experiencia] ?? i.experiencia} · ` : ""}
                      {i.cpf ? `CPF ${i.cpf} · ` : ""}
                      Inscrito em {new Date(i.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" asChild>
                      <a href={`https://wa.me/${zap}`} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp de ${i.nome}`}>
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    </Button>
                    <Select value={i.status} onValueChange={(v) => alterarStatus(i.id, v)}>
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Aguardando pagamento</SelectItem>
                        <SelectItem value="pago">Pago</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};

export default CourseRegistrationsAdmin;
