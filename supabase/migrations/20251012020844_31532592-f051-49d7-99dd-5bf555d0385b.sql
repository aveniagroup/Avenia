-- Add customer_phone column to tickets table
ALTER TABLE public.tickets 
ADD COLUMN customer_phone text;