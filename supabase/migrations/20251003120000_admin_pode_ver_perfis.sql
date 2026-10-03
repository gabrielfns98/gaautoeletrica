-- O painel da oficina precisa do nome do cliente para identificar a ordem na fila.
-- Sem esta política, o SELECT em profiles só devolve a própria linha do admin e a
-- fila aparece com "Cliente não informado" em todas as ordens.
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));
