
'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import type { ClassInstance, DanceClass } from '@/lib/types';
import { format, eachDayOfInterval, getDay, isSameDay, parseISO } from 'date-fns';

type StudentAttendanceStatus = {
  studentId: number;
  present: boolean;
};

type ClassAttendanceRecord = {
  classId: string;
  date: string; // YYYY-MM-DD
  status: 'completed' | 'scheduled';
  studentStatus: StudentAttendanceStatus[];
};

export interface AttendanceContextType {
  classInstances: ClassInstance[];
  generateInstancesForTeacher: (teacherId: number, start: Date, end: Date, allClasses: DanceClass[]) => void;
  confirmClass: (classId: string, date: string) => void;
  recordAttendance: (classId: string, date: string, studentStatus: StudentAttendanceStatus[]) => void;
  getAttendanceForClass: (classId: string, date: string) => ClassAttendanceRecord | undefined;
  resetAttendance: () => void;
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

const daysOfWeekMap = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export const AttendanceProvider = ({ children }: { children: ReactNode }) => {
  const [classInstances, setClassInstances] = useState<ClassInstance[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, ClassAttendanceRecord>>({});

  const pendingFetches = React.useRef<Set<string>>(new Set());

  // Sync attendance with server
  const fetchAttendance = useCallback(async (classId: string, date: string) => {
    const instanceId = `${classId}-${date}`;
    if (pendingFetches.current.has(instanceId)) return;
    pendingFetches.current.add(instanceId);

    try {
      const response = await fetch(`/api/attendance?classId=${classId}&date=${date}`);
      if (response.ok) {
        const records = await response.json();
        const studentStatus = records.map((r: any) => ({
          studentId: r.studentId,
          present: r.status === 'presente'
        }));
        setAttendanceRecords(prev => ({
          ...prev,
          [instanceId]: {
            classId,
            date,
            status: studentStatus.length > 0 ? 'completed' : 'scheduled',
            studentStatus,
          }
        }));
      }
    } catch (error) {
      console.error("Failed to fetch attendance:", error);
    } finally {
      pendingFetches.current.delete(instanceId);
    }
  }, []);

  const generateInstancesForTeacher = useCallback((teacherId: number, start: Date, end: Date, allClasses: DanceClass[]) => {
    if (!allClasses || allClasses.length === 0) return;

    const teacherClasses = allClasses.filter(c => c.teacherIds?.includes(teacherId));
    const interval = eachDayOfInterval({ start, end });
    const instanceIdsFound = new Set<string>();

    setClassInstances(prev => {
      const newInstancesToAdd: ClassInstance[] = [];
      
      interval.forEach(day => {
        const dayOfWeekName = daysOfWeekMap[getDay(day)];
        const dateStr = format(day, 'yyyy-MM-dd');

        teacherClasses.forEach(c => {
          let shouldAdd = false;
          if (c.type === 'recurring' && c.day === dayOfWeekName) {
            shouldAdd = true;
          } else if (c.date && isSameDay(parseISO(c.date), day)) {
            shouldAdd = true;
          }

          if (shouldAdd) {
            const instanceId = `${c.id}-${dateStr}`;
            instanceIdsFound.add(instanceId);

            if (!prev.some(inst => inst.instanceId === instanceId)) {
                newInstancesToAdd.push({
                  ...c,
                  instanceId,
                  date: dateStr,
                  status: 'scheduled', // Default, updated by attendanceRecords later
                });
            }
          }
        });
      });

      if (newInstancesToAdd.length === 0) return prev;
      return [...prev, ...newInstancesToAdd].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    });

    // Trigger fetches for any instances we found but don't have records for
    instanceIdsFound.forEach(instanceId => {
        if (!attendanceRecords[instanceId]) {
            const [classId, date] = instanceId.split(/-(.+)/); // Split only on first hyphen
            fetchAttendance(classId, date);
        }
    });

  }, [attendanceRecords, fetchAttendance]);

  // Sync statuses of instances with records
  React.useEffect(() => {
    setClassInstances(prev => {
        let changed = false;
        const next = prev.map(inst => {
            const rec = attendanceRecords[inst.instanceId];
            if (rec && rec.status !== inst.status) {
                changed = true;
                return { ...inst, status: rec.status };
            }
            return inst;
        });
        return changed ? next : prev;
    });
  }, [attendanceRecords]);

  const confirmClass = useCallback(async (classId: string, date: string) => {
    const instanceId = `${classId}-${date}`;
    const currentRecord = attendanceRecords[instanceId];

    // Optimistic update
    setClassInstances(prev => prev.map(inst => inst.instanceId === instanceId ? { ...inst, status: 'completed' } : inst));
    setAttendanceRecords(prev => ({
      ...prev,
      [instanceId]: {
        ...(prev[instanceId] || { studentStatus: [] }),
        classId,
        date,
        status: 'completed',
      }
    }));

    // Persist empty or existing studentStatus to mark as completed in DB?
    // In our simplified API, POST implies some status.
    // If no students yet, we just mark it locally.
  }, [attendanceRecords]);

  const recordAttendance = useCallback(async (classId: string, date: string, studentStatus: StudentAttendanceStatus[]) => {
    const instanceId = `${classId}-${date}`;

    // Save to database
    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId, date, studentStatus }),
      });

      if (response.ok) {
        setAttendanceRecords(prev => ({
          ...prev,
          [instanceId]: {
            classId,
            date,
            status: 'completed',
            studentStatus,
          }
        }));
        setClassInstances(prev => prev.map(inst => inst.instanceId === instanceId ? { ...inst, status: 'completed' } : inst));
      }
    } catch (error) {
      console.error("Failed to save attendance:", error);
    }
  }, []);

  const getAttendanceForClass = useCallback((classId: string, date: string) => {
    const instanceId = `${classId}-${date}`;
    return attendanceRecords[instanceId];
  }, [attendanceRecords]);

  const resetAttendance = useCallback(() => {
    setClassInstances([]);
    setAttendanceRecords({});
  }, []);

  const value = {
    classInstances,
    generateInstancesForTeacher,
    confirmClass,
    recordAttendance,
    getAttendanceForClass,
    resetAttendance,
  };

  return (
    <AttendanceContext.Provider value={value}>
      {children}
    </AttendanceContext.Provider>
  );
};

export const useAttendance = (): AttendanceContextType => {
  const context = useContext(AttendanceContext);
  if (context === undefined) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }
  return context;
};
