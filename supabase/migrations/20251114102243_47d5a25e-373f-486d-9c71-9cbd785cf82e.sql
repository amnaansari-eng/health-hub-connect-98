-- Create storage bucket for medical documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'medical-documents',
  'medical-documents',
  false,
  5242880, -- 5MB limit per file
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
);

-- Create table to store medical document references
CREATE TABLE public.medical_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.medical_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for medical_documents table
CREATE POLICY "Users can view their own medical documents"
ON public.medical_documents
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own medical documents"
ON public.medical_documents
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own medical documents"
ON public.medical_documents
FOR DELETE
USING (auth.uid() = user_id);

-- Storage policies for medical-documents bucket
CREATE POLICY "Users can view their own medical documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'medical-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own medical documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'medical-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own medical documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'medical-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create index for faster queries
CREATE INDEX idx_medical_documents_patient_id ON public.medical_documents(patient_id);
CREATE INDEX idx_medical_documents_user_id ON public.medical_documents(user_id);