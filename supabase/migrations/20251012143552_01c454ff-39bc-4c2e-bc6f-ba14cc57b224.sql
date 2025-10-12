-- Increase precision for height_cm and weight_kg to accept realistic values
-- height_cm: NUMERIC(5,2) allows up to 999.99 cm
-- weight_kg: NUMERIC(6,2) allows up to 9999.99 kg
-- bmi: NUMERIC(5,2) allows up to 999.99

ALTER TABLE public.patients 
ALTER COLUMN height_cm TYPE NUMERIC(5,2),
ALTER COLUMN weight_kg TYPE NUMERIC(6,2),
ALTER COLUMN bmi TYPE NUMERIC(5,2);