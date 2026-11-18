-- Inscrições do Treinamento de Natal (Autoelétrica básica para iniciantes)
CREATE TABLE public.course_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE CHECK (codigo ~ '^[A-Z0-9]{4,25}$'),
  turma TEXT NOT NULL DEFAULT 'natal-2026' CHECK (char_length(turma) <= 40),
  nome TEXT NOT NULL CHECK (char_length(nome) BETWEEN 3 AND 120),
  whatsapp TEXT NOT NULL CHECK (char_length(whatsapp) BETWEEN 10 AND 20),
  email TEXT CHECK (email IS NULL OR char_length(email) <= 160),
  cpf TEXT CHECK (cpf IS NULL OR char_length(cpf) <= 14),
  cidade TEXT CHECK (cidade IS NULL OR char_length(cidade) <= 80),
  experiencia TEXT CHECK (experiencia IS NULL OR experiencia IN ('nenhuma', 'basica', 'trabalho_na_area')),
  forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('pix', 'link')),
  valor NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado')),
  observacoes TEXT CHECK (observacoes IS NULL OR char_length(observacoes) <= 500),
  notificado_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.course_registrations ENABLE ROW LEVEL SECURITY;

-- Qualquer visitante (logado ou não) pode se inscrever, sempre como "pendente"
CREATE POLICY "Anyone can register for a course"
ON public.course_registrations
FOR INSERT
TO anon, authenticated
WITH CHECK (status = 'pendente');

-- Somente administradores veem e gerenciam as inscrições
CREATE POLICY "Admins can view course registrations"
ON public.course_registrations
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update course registrations"
ON public.course_registrations
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete course registrations"
ON public.course_registrations
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_course_registrations_updated_at
  BEFORE UPDATE ON public.course_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
