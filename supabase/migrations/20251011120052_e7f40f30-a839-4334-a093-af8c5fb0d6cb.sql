-- Add sentiment analysis columns to tickets table
ALTER TABLE public.tickets 
ADD COLUMN sentiment text,
ADD COLUMN urgency_score integer CHECK (urgency_score >= 1 AND urgency_score <= 10);