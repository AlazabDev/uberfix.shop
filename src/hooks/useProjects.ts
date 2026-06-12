import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface Project {
  id: string;
  name: string;
  code?: string;
  description?: string;
  client_name: string;
  client_id?: string;
  location: string;
  status: 'planning' | 'design' | 'licensing' | 'construction' | 'finishing' | 'completed' | 'maintenance' | 'on_hold' | 'cancelled';
  project_type?: string;
  budget?: number;
  actual_cost?: number;
  progress: number;
  start_date?: string;
  end_date?: string;
  actual_end_date?: string;
  manager_id?: string;
  magicplan_iframe_url?: string;
  gallery_url?: string;
  sketch_url?: string;
  cover_image_url?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectPhase {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
  sort_order: number;
  start_date?: string;
  end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  progress: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectTask {
  id: string;
  phase_id: string;
  project_id: string;
  name: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  assigned_to?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  start_date?: string;
  due_date?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectUpdate {
  id: string;
  project_id: string;
  phase_id?: string;
  title: string;
  description?: string;
  update_type: 'general' | 'milestone' | 'issue' | 'progress';
  images?: string[];
  progress_percentage?: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const isPermissionIssue = (value: unknown) => {
    const message = value instanceof Error ? value.message : String(value ?? '');
    const normalized = message.toLowerCase();
    return normalized.includes('permission denied') || normalized.includes('row-level security') || normalized.includes('rls');
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setProjects((data || []) as Project[]);
    } catch (error: any) {
      setProjects([]);
      if (!isPermissionIssue(error)) {
        toast({
          title: 'خطأ في تحميل المشروعات',
          description: error.message,
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();

    const channel = supabase
      .channel('projects-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        fetchProjects();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { projects, loading, refetch: fetchProjects };
};

export const useProjectDetails = (projectId: string) => {
  const [project, setProject] = useState<Project | null>(null);
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjectData = async () => {
    try {
      setLoading(true);

      // Fetch project
      const { data: projectData, error: projectError } = await (supabase as any)
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .maybeSingle();

      if (projectError) throw projectError;
      setProject(projectData as Project);

      // Fetch phases
      const { data: phasesData, error: phasesError } = await (supabase as any)
        .from('project_phases')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order');

      if (phasesError) throw phasesError;
      setPhases((phasesData || []) as ProjectPhase[]);

      // Fetch updates
      const { data: updatesData, error: updatesError } = await (supabase as any)
        .from('project_updates')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (updatesError) throw updatesError;
      setUpdates((updatesData || []) as ProjectUpdate[]);
    } catch (error: any) {
      toast({
        title: 'خطأ في تحميل بيانات المشروع',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
    }
  }, [projectId]);

  return { project, phases, updates, loading, refetch: fetchProjectData };
};
