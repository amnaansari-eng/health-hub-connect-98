import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCog, Calendar, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Stats {
  patients: number;
  doctors: number;
  appointments: number;
  todayAppointments: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<Stats>({
    patients: 0,
    doctors: 0,
    appointments: 0,
    todayAppointments: 0,
  });
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [
        { count: patientsCount },
        { count: doctorsCount },
        { count: appointmentsCount },
        { count: todayCount },
      ] = await Promise.all([
        supabase.from('patients').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.from('doctors').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('user_id', user!.id).eq('appointment_date', today),
      ]);

      setStats({
        patients: patientsCount || 0,
        doctors: doctorsCount || 0,
        appointments: appointmentsCount || 0,
        todayAppointments: todayCount || 0,
      });
    } catch (error: any) {
      toast.error('Failed to fetch statistics');
      console.error('Error fetching stats:', error);
    }
  };

  const statCards = [
    { title: 'Total Patients', value: stats.patients, icon: Users, color: 'text-primary', bgColor: 'bg-primary/10' },
    { title: 'Total Doctors', value: stats.doctors, icon: UserCog, color: 'text-secondary', bgColor: 'bg-secondary/10' },
    { title: 'Total Appointments', value: stats.appointments, icon: Calendar, color: 'text-info', bgColor: 'bg-info/10' },
    { title: "Today's Appointments", value: stats.todayAppointments, icon: Activity, color: 'text-warning', bgColor: 'bg-warning/10' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your healthcare management system</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Welcome to HealthCare Manager</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Your comprehensive solution for managing patients, doctors, and appointments.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-border rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Patient Management
              </h3>
              <p className="text-sm text-muted-foreground">
                Add, edit, and track patient records with automatic BMI calculation
              </p>
            </div>
            <div className="p-4 border border-border rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <UserCog className="h-5 w-5 text-secondary" />
                Doctor Database
              </h3>
              <p className="text-sm text-muted-foreground">
                Manage doctor profiles with specializations and contact details
              </p>
            </div>
            <div className="p-4 border border-border rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-info" />
                Appointment Scheduling
              </h3>
              <p className="text-sm text-muted-foreground">
                Schedule and track appointments between patients and doctors
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
