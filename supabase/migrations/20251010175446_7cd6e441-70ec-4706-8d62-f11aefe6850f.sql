-- Fix security warnings by setting search_path on existing functions
ALTER FUNCTION public.set_ticket_number() SET search_path = public;
ALTER FUNCTION public.generate_ticket_number(uuid) SET search_path = public;
ALTER FUNCTION public.update_updated_at() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;