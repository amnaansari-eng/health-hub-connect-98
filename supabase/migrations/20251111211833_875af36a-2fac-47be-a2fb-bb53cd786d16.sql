-- Drop trigger if it exists (in case it was partially created)
DROP TRIGGER IF EXISTS calculate_bmi_trigger ON public.patients;

-- Create trigger to automatically calculate BMI on insert and update
CREATE TRIGGER calculate_bmi_trigger
  BEFORE INSERT OR UPDATE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_bmi();

-- Update existing records to recalculate BMI
UPDATE public.patients
SET bmi = ROUND((weight_kg / ((height_cm / 100) * (height_cm / 100)))::numeric, 2)
WHERE height_cm IS NOT NULL 
  AND weight_kg IS NOT NULL 
  AND height_cm > 0;