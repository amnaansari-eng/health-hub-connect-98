import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Upload, X, FileText, Camera } from 'lucide-react';

interface Patient {
  id?: string;
  full_name: string;
  age: number;
  gender: string;
  phone: string;
  email: string;
  address?: string;
  city: string;
  height_cm?: number | null;
  weight_kg?: number | null;
  blood_group?: string | null;
  medical_history?: string | null;
}

interface PatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient | null;
  onSuccess: () => void;
}

export const PatientDialog = ({ open, onOpenChange, patient, onSuccess }: PatientDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [formData, setFormData] = useState<Patient>({
    full_name: '',
    age: 0,
    gender: 'Male',
    phone: '',
    email: '',
    address: '',
    city: '',
    height_cm: null,
    weight_kg: null,
    blood_group: '',
    medical_history: '',
  });

  useEffect(() => {
    if (patient) {
      setFormData(patient);
      if (patient.id) {
        fetchMedicalDocuments(patient.id);
      }
    } else {
      setFormData({
        full_name: '',
        age: 0,
        gender: 'Male',
        phone: '',
        email: '',
        address: '',
        city: '',
        height_cm: null,
        weight_kg: null,
        blood_group: '',
        medical_history: '',
      });
      setUploadedFiles([]);
    }
  }, [patient, open]);

  const fetchMedicalDocuments = async (patientId: string) => {
    try {
      const { data, error } = await supabase
        .from('medical_documents')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUploadedFiles(data || []);
    } catch (error: any) {
      console.error('Error fetching medical documents:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !user) return;

    setUploadingFiles(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('medical-documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // If editing existing patient, save to database immediately
        if (patient?.id) {
          const { error: dbError } = await supabase
            .from('medical_documents')
            .insert({
              patient_id: patient.id,
              user_id: user.id,
              file_name: file.name,
              file_path: filePath,
              file_size: file.size,
              mime_type: file.type,
            });

          if (dbError) throw dbError;
          await fetchMedicalDocuments(patient.id);
        } else {
          // For new patients, add to temporary state
          setUploadedFiles((prev) => [
            ...prev,
            {
              file_name: file.name,
              file_path: filePath,
              file_size: file.size,
              mime_type: file.type,
              isTemp: true,
            },
          ]);
        }
      });

      await Promise.all(uploadPromises);
      toast.success('Files uploaded successfully');
    } catch (error: any) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleDeleteFile = async (file: any) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('medical-documents')
        .remove([file.file_path]);

      if (storageError) throw storageError;

      // Delete from database if not temporary
      if (!file.isTemp && file.id) {
        const { error: dbError } = await supabase
          .from('medical_documents')
          .delete()
          .eq('id', file.id);

        if (dbError) throw dbError;
      }

      setUploadedFiles((prev) => prev.filter((f) => f.file_path !== file.file_path));
      toast.success('File deleted successfully');
    } catch (error: any) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const patientData = {
        ...formData,
        user_id: user!.id,
      };

      let patientId = patient?.id;

      if (patient?.id) {
        const { error } = await supabase
          .from('patients')
          .update(patientData)
          .eq('id', patient.id);
        if (error) throw error;
        toast.success('Patient updated successfully');
      } else {
        const { data, error } = await supabase
          .from('patients')
          .insert(patientData)
          .select()
          .single();
        if (error) throw error;
        patientId = data.id;

        // Save temporary files to database for new patient
        if (uploadedFiles.length > 0) {
          const documentsToInsert = uploadedFiles.map((file) => ({
            patient_id: patientId,
            user_id: user!.id,
            file_name: file.file_name,
            file_path: file.file_path,
            file_size: file.file_size,
            mime_type: file.mime_type,
          }));

          const { error: docsError } = await supabase
            .from('medical_documents')
            .insert(documentsToInsert);

          if (docsError) throw docsError;
        }
        toast.success('Patient added successfully');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save patient');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{patient ? 'Edit Patient' : 'Add New Patient'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="age">Age *</Label>
              <Input
                id="age"
                type="number"
                min="1"
                value={formData.age || ''}
                onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Gender *</Label>
              <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="blood_group">Blood Group</Label>
              <Select value={formData.blood_group || ''} onValueChange={(value) => setFormData({ ...formData, blood_group: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select blood group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A+">A+</SelectItem>
                  <SelectItem value="A-">A-</SelectItem>
                  <SelectItem value="B+">B+</SelectItem>
                  <SelectItem value="B-">B-</SelectItem>
                  <SelectItem value="AB+">AB+</SelectItem>
                  <SelectItem value="AB-">AB-</SelectItem>
                  <SelectItem value="O+">O+</SelectItem>
                  <SelectItem value="O-">O-</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="height_cm">Height (cm)</Label>
              <Input
                id="height_cm"
                type="number"
                step="0.01"
                min="100"
                max="250"
                placeholder="e.g., 170"
                value={formData.height_cm || ''}
                onChange={(e) => setFormData({ ...formData, height_cm: e.target.value ? parseFloat(e.target.value) : null })}
              />
              <p className="text-xs text-muted-foreground">Enter height in centimeters (100-250 cm)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight_kg">Weight (kg)</Label>
              <Input
                id="weight_kg"
                type="number"
                step="0.01"
                min="0"
                value={formData.weight_kg || ''}
                onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value ? parseFloat(e.target.value) : null })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="medical_history">Medical History</Label>
            <Textarea
              id="medical_history"
              value={formData.medical_history || ''}
              onChange={(e) => setFormData({ ...formData, medical_history: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Medical Documents</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('file-upload')?.click()}
                disabled={uploadingFiles}
                className="flex-1"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploadingFiles ? 'Uploading...' : 'Upload Files'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('camera-upload')?.click()}
                disabled={uploadingFiles}
                className="flex-1"
              >
                <Camera className="w-4 h-4 mr-2" />
                Take Photo
              </Button>
            </div>
            <input
              id="file-upload"
              type="file"
              multiple
              accept="image/*,.pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            <input
              id="camera-upload"
              type="file"
              multiple
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />
            <p className="text-xs text-muted-foreground">
              Upload medical reports, prescriptions, or test results (images or PDFs, max 5MB each)
            </p>

            {uploadedFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 border rounded-md bg-muted/50"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm truncate">{file.file_name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(file.file_size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteFile(file)}
                      className="flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : patient ? 'Update' : 'Add'} Patient
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
