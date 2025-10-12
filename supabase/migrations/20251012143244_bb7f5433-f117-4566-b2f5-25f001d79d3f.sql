-- Add trigger to calculate BMI automatically when height or weight is inserted/updated
CREATE TRIGGER calculate_bmi_trigger
BEFORE INSERT OR UPDATE ON public.patients
FOR EACH ROW
EXECUTE FUNCTION public.calculate_bmi();