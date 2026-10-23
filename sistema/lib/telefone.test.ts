import { describe, expect, it } from "vitest";
import { formatarTelefone, paraWhatsApp } from "@/lib/telefone";

describe("paraWhatsApp", () => {
  it("põe o 55 em celular com DDD", () => {
    expect(paraWhatsApp("34996995786")).toBe("5534996995786");
  });

  it("põe o 55 em fixo com DDD", () => {
    expect(paraWhatsApp("1138887777")).toBe("551138887777");
  });

  it("ignora a pontuação do cadastro", () => {
    expect(paraWhatsApp("(34) 99699-5786")).toBe("5534996995786");
  });

  it("não duplica o país quando já veio com 55", () => {
    expect(paraWhatsApp("5534996995786")).toBe("5534996995786");
  });

  it("devolve o que tem quando o número está incompleto", () => {
    expect(paraWhatsApp("99699")).toBe("99699");
    expect(paraWhatsApp("")).toBe("");
  });
});

describe("formatarTelefone", () => {
  it("formata celular", () => {
    expect(formatarTelefone("34996995786")).toBe("(34) 99699-5786");
  });

  it("formata fixo", () => {
    expect(formatarTelefone("1138887777")).toBe("(11) 3888-7777");
  });

  it("tira o país antes de formatar", () => {
    expect(formatarTelefone("5534996995786")).toBe("(34) 99699-5786");
  });

  it("deixa como está o que não reconhece", () => {
    expect(formatarTelefone("99699")).toBe("99699");
  });
});
