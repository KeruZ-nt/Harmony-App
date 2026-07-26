import { create } from 'zustand';

interface StudentData {
  id: string;
  first_name: string;
  last_name: string;
  plan: string;
  frequency: string;
  status: string;
  grade_level?: string;
  age?: number;
  birth_date?: string;
  schedule_days?: string;
}

interface PortalState {
  portalStudents: StudentData[];
  selectedStudentId: string | null;
  setPortalStudents: (students: StudentData[]) => void;
  setSelectedStudentId: (id: string | null) => void;
}

export const usePortalStore = create<PortalState>((set) => ({
  portalStudents: [],
  selectedStudentId: null,
  setPortalStudents: (students) => set({ portalStudents: students }),
  setSelectedStudentId: (id) => set({ selectedStudentId: id }),
}));
