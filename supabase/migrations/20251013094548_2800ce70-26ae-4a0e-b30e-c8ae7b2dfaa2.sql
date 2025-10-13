-- Increase BMI column precision to handle edge cases
-- This prevents numeric overflow when users enter unusual height/weight values
ALTER TABLE public.patients 
ALTER COLUMN bmi TYPE NUMERIC(10,2);