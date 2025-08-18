-- Allow admins to update services (status, etc.)
CREATE POLICY "Admins can update all services" 
ON public.services 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete services if needed
CREATE POLICY "Admins can delete all services" 
ON public.services 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));