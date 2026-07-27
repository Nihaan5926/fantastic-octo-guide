import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { Pencil, Trash2, Plus, GraduationCap, ClipboardList, FileText, User, TrendingUp, Users, BookOpen, Download, ChevronDown, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { exportToCSV, exportToJSON } from '../../../utils/export';
import { trainingApi } from '../api';
import PageHeader from '../../../components/common/PageHeader';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { FormInput, FormTextarea, FormSelect } from '../../../components/common/FormComponents';
import { StatusBadge } from '../../../components/common/Badges';
import { useTrainingStore, TrainingCourse, TrainingEnrollment, AfterActionReport } from '../store';

type Tab = 'courses' | 'enrollments' | 'aars' | 'my-training';

const COURSE_TYPE_OPTIONS = [
  { value: 'CLASSROOM', label: 'Classroom' },
  { value: 'ONLINE', label: 'Online' },
  { value: 'FIELD', label: 'Field Exercise' },
  { value: 'WORKSHOP', label: 'Workshop' },
  { value: 'SEMINAR', label: 'Seminar' },
];

const ENROLLMENT_STATUS_OPTIONS = [
  { value: 'ENROLLED', label: 'Enrolled' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
];

const emptyCourse: Partial<TrainingCourse> = {
  title: '',
  description: '',
  course_type: 'CLASSROOM',
  duration_hours: 0,
  instructor: '',
  is_required: false,
  course_date: '',
};

const emptyEnrollment: Partial<TrainingEnrollment> = {
  course_id: '',
  user_id: '',
  status: 'ENROLLED',
  enrolled_date: '',
  completed_date: '',
  score: null,
  notes: '',
};

const emptyAAR: Partial<AfterActionReport> = {
  course_id: '',
  report_date: '',
  summary: '',
  recommendations: '',
  created_by: '',
};

export default function TrainingPage() {
  const {
    courses, enrollments, aars,
    coursesPagination, enrollmentsPagination, aarsPagination, isLoading,
    fetchCourses, fetchEnrollments, fetchAARs,
    createCourse, updateCourse, deleteCourse,
    createEnrollment, updateEnrollment, deleteEnrollment,
    createAAR, updateAAR, deleteAAR,
  } = useTrainingStore();

  const [tab, setTab] = useState<Tab>('courses');

  const toggleTab = (t: Tab) => {
    setTab(t);
    if (t === 'courses') fetchCourses({ page: coursePage, limit: 20 });
    if (t === 'enrollments') fetchEnrollments({ page: enrollmentPage, limit: 20 });
    if (t === 'aars') fetchAARs({ page: aarPage, limit: 20 });
    if (t === 'my-training') fetchEnrollments({ page: 1, limit: 100 });
  };

  const [coursePage, setCoursePage] = useState(1);
  const [enrollmentPage, setEnrollmentPage] = useState(1);
  const [aarPage, setAarPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [courseForm, setCourseForm] = useState<Partial<TrainingCourse>>(emptyCourse);
  const [enrollmentForm, setEnrollmentForm] = useState<Partial<TrainingEnrollment>>(emptyEnrollment);
  const [aarForm, setAarForm] = useState<Partial<AfterActionReport>>(emptyAAR);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    fetchCourses({ page: coursePage, limit: 20 });
  }, [fetchCourses, coursePage]);

  const myTrainings = enrollments;

  const completionRate = useMemo(() => {
    if (myTrainings.length === 0) return 0;
    const done = myTrainings.filter((e: any) => e.status === 'COMPLETED').length;
    return Math.round((done / myTrainings.length) * 100);
  }, [myTrainings]);

  const inProgressCount = myTrainings.filter((e: any) => e.status === 'IN_PROGRESS' || e.status === 'ENROLLED').length;
  const completedCount = myTrainings.filter((e: any) => e.status === 'COMPLETED').length;
  const failedCount = myTrainings.filter((e: any) => e.status === 'FAILED').length;

  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const days: { day: number; dateStr: string; isToday: boolean; courses: TrainingCourse[] }[] = [];
    for (let d = 0; d < firstDay; d++) days.push({ day: 0, dateStr: '', isToday: false, courses: [] });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayCourses = courses.filter((c: any) => {
        if (!c.course_date) return false;
        return c.course_date.slice(0, 10) === dateStr;
      });
      days.push({
        day: d,
        dateStr,
        isToday: today.getFullYear() === year && today.getMonth() === month && today.getDate() === d,
        courses: dayCourses,
      });
    }
    return days;
  }, [calendarDate, courses]);

  const selectedDayCourses = useMemo(() => {
    if (!selectedDateStr) return [];
    return courses.filter((c: any) => c.course_date && c.course_date.slice(0, 10) === selectedDateStr);
  }, [selectedDateStr, courses]);

  const prevMonth = () => setCalendarDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCalendarDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      let result;
      let label: string;
      if (tab === 'courses') {
        result = await trainingApi.listCourses({ limit: 1000 });
        label = 'courses';
      } else if (tab === 'aars') {
        result = await trainingApi.listAARs({ limit: 1000 });
        label = 'aars';
      } else {
        result = await trainingApi.listEnrollments({ limit: 1000 });
        label = tab === 'my-training' ? 'my-training' : 'enrollments';
      }
      const { data } = result;
      const allItems = data.data || data.items || [];
      exportToCSV(allItems, `training-${label}-export`);
      toast.success(`Exported ${allItems.length} ${label} as CSV`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
      setExportOpen(false);
    }
  };

  const handleExportJSON = async () => {
    setExporting(true);
    try {
      let result;
      let label: string;
      if (tab === 'courses') {
        result = await trainingApi.listCourses({ limit: 1000 });
        label = 'courses';
      } else if (tab === 'aars') {
        result = await trainingApi.listAARs({ limit: 1000 });
        label = 'aars';
      } else {
        result = await trainingApi.listEnrollments({ limit: 1000 });
        label = tab === 'my-training' ? 'my-training' : 'enrollments';
      }
      const { data } = result;
      const allItems = data.data || data.items || [];
      exportToJSON(allItems, `training-${label}-export`);
      toast.success(`Exported ${allItems.length} ${label} as JSON`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
      setExportOpen(false);
    }
  };

  const handleCreate = () => {
    setEditingId(null);
    if (tab === 'courses') setCourseForm(emptyCourse);
    else if (tab === 'enrollments' || tab === 'my-training') setEnrollmentForm(emptyEnrollment);
    else setAarForm(emptyAAR);
    setModalOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    if (tab === 'courses') {
      setCourseForm({
        title: item.title || '',
        description: item.description || '',
        course_type: item.course_type || 'CLASSROOM',
        duration_hours: item.duration_hours || 0,
        instructor: item.instructor || '',
        is_required: item.is_required || false,
        prerequisite_course_id: item.prerequisite_course_id || '',
        course_date: item.course_date ? item.course_date.slice(0, 10) : '',
      });
    } else if (tab === 'enrollments' || tab === 'my-training') {
      setEnrollmentForm({
        course_id: item.course_id || '',
        user_id: item.user_id || '',
        status: item.status || 'ENROLLED',
        enrolled_date: item.enrolled_date || '',
        completed_date: item.completed_date || '',
        score: item.score,
        notes: item.notes || '',
      });
    } else {
      setAarForm({
        course_id: item.course_id || '',
        report_date: item.report_date || '',
        summary: item.summary || '',
        recommendations: item.recommendations || '',
        created_by: item.created_by || '',
      });
    }
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (tab === 'courses') {
        if (editingId) { await updateCourse(editingId, courseForm); toast.success('Course updated'); }
        else { await createCourse(courseForm); toast.success('Course created'); }
      } else if (tab === 'enrollments' || tab === 'my-training') {
        if (editingId) { await updateEnrollment(editingId, enrollmentForm); toast.success('Enrollment updated'); }
        else { await createEnrollment(enrollmentForm); toast.success('Enrollment created'); }
      } else {
        if (editingId) { await updateAAR(editingId, aarForm); toast.success('AAR updated'); }
        else { await createAAR(aarForm); toast.success('AAR created'); }
      }
      setModalOpen(false);
    } catch {
      toast.error('Operation failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (tab === 'courses') await deleteCourse(deleteTarget.id);
      else if (tab === 'enrollments' || tab === 'my-training') await deleteEnrollment(deleteTarget.id);
      else await deleteAAR(deleteTarget.id);
      toast.success('Deleted');
      setDeleteTarget(null);
    } catch {
      toast.error('Delete failed');
    }
  };

  const courseColumns = [
    { key: 'title', label: 'Title' },
    { key: 'course_type', label: 'Type' },
    { key: 'instructor', label: 'Instructor' },
    { key: 'duration_hours', label: 'Hours' },
    {
      key: 'enrollment_count',
      label: 'Enrolled',
      render: (item: TrainingCourse & { _count?: { enrollments?: number }; enrollment_count?: number }) => {
        const count = item.enrollment_count ?? item._count?.enrollments ?? 0;
        return (
          <span className="inline-flex items-center gap-1 text-sm">
            <Users size={13} className="text-text-muted" />
            <span className={count > 0 ? 'text-text-primary font-medium' : 'text-text-muted'}>{count}</span>
          </span>
        );
      },
    },
    {
      key: 'prerequisite', label: 'Prerequisite',
      render: (item: TrainingCourse & { prerequisite_course_id?: string }) => (
        item.prerequisite_course_id
          ? <StatusBadge label={item.prerequisite_course_id.slice(0, 12)} color="purple" />
          : <span className="text-text-muted text-xs">None</span>
      ),
    },
    {
      key: 'is_required', label: 'Required',
      render: (item: TrainingCourse) => (
        item.is_required
          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/25"><BookOpen size={10} /> REQUIRED</span>
          : <StatusBadge label="Optional" color="gray" />
      ),
    },
    {
      key: 'actions', label: 'Actions',
      render: (item: TrainingCourse) => (
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); handleEdit(item); }} className="btn-ghost p-1.5"><Pencil size={14} /></button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); }} className="btn-ghost p-1.5 text-accent-danger"><Trash2 size={14} /></button>
        </div>
      ),
    },
  ];

  const enrollmentColumns = [
    { key: 'course_id', label: 'Course ID' },
    { key: 'user_id', label: 'User ID' },
    {
      key: 'status', label: 'Status',
      render: (item: TrainingEnrollment) => {
        const colors: Record<string, string> = { ENROLLED: 'blue', IN_PROGRESS: 'yellow', COMPLETED: 'green', FAILED: 'red', WITHDRAWN: 'gray' };
        return <StatusBadge label={item.status} color={colors[item.status] || 'gray'} />;
      },
    },
    { key: 'enrolled_date', label: 'Enrolled' },
    { key: 'completed_date', label: 'Completed' },
    { key: 'score', label: 'Score' },
    {
      key: 'progress',
      label: 'Completion',
      render: (item: TrainingEnrollment) => {
        const pct = item.status === 'COMPLETED' ? 100 : item.status === 'IN_PROGRESS' ? 50 : item.status === 'ENROLLED' ? 10 : 0;
        const color = pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : pct > 0 ? 'bg-blue-500' : 'bg-bg-tertiary';
        return (
          <div className="flex items-center gap-2 min-w-[80px]">
            <div className="flex-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
              <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-text-muted w-8">{pct}%</span>
          </div>
        );
      },
    },
    {
      key: 'actions', label: 'Actions',
      render: (item: TrainingEnrollment) => (
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); handleEdit(item); }} className="btn-ghost p-1.5"><Pencil size={14} /></button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); }} className="btn-ghost p-1.5 text-accent-danger"><Trash2 size={14} /></button>
        </div>
      ),
    },
  ];

  const aarColumns = [
    { key: 'course_id', label: 'Course ID' },
    { key: 'report_date', label: 'Report Date' },
    { key: 'summary', label: 'Summary', className: 'max-w-xs truncate' },
    { key: 'created_by', label: 'Author' },
    {
      key: 'actions', label: 'Actions',
      render: (item: AfterActionReport) => (
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); handleEdit(item); }} className="btn-ghost p-1.5"><Pencil size={14} /></button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); }} className="btn-ghost p-1.5 text-accent-danger"><Trash2 size={14} /></button>
        </div>
      ),
    },
  ];

  const currentData = tab === 'courses' ? courses : tab === 'aars' ? aars : enrollments;
  const currentColumns = tab === 'courses' ? courseColumns : tab === 'aars' ? aarColumns : enrollmentColumns;
  const currentPagination = tab === 'courses' ? coursesPagination : tab === 'aars' ? aarsPagination : tab === 'my-training' ? { page: 1, limit: 100, total: myTrainings.length, totalPages: 1 } : enrollmentsPagination;
  const currentPageSetter = tab === 'courses' ? setCoursePage : tab === 'aars' ? setAarPage : setEnrollmentPage;
  const currentCreateLabel = tab === 'courses' ? 'Add Course' : tab === 'aars' ? 'Add AAR' : 'Add Enrollment';
  const deleteLabel = tab === 'courses' ? (deleteTarget as TrainingCourse)?.title : tab === 'aars' ? (deleteTarget as AfterActionReport)?.summary?.slice(0, 40) : `${(deleteTarget as TrainingEnrollment)?.course_id} / ${(deleteTarget as TrainingEnrollment)?.user_id}`;

  return (
    <div className="space-y-6">
      <PageHeader title="Training" subtitle="Manage training courses, enrollments, and after-action reports">
        <div className="relative" ref={exportRef}>
          <button
            onClick={() => setExportOpen(!exportOpen)}
            disabled={exporting}
            className="btn-secondary"
          >
            {exporting ? (
              <span className="flex items-center gap-1">
                <span className="animate-pulse">Exporting...</span>
              </span>
            ) : (
              <>
                <Download size={16} />
                Export
                <ChevronDown size={14} />
              </>
            )}
          </button>
          {exportOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-bg-card border border-border rounded-xl shadow-xl z-50 py-1">
              <button
                onClick={handleExportCSV}
                className="w-full text-left px-4 py-2.5 text-sm text-text-primary hover:bg-bg-hover transition-colors flex items-center gap-2"
              >
                <Download size={14} /> Export CSV
              </button>
              <button
                onClick={handleExportJSON}
                className="w-full text-left px-4 py-2.5 text-sm text-text-primary hover:bg-bg-hover transition-colors flex items-center gap-2"
              >
                <Download size={14} /> Export JSON
              </button>
            </div>
          )}
        </div>
      </PageHeader>

      <div className="flex items-center gap-1 bg-bg-card border border-border rounded-xl p-1 w-fit">
        {([
          ['courses', 'Courses', GraduationCap],
          ['enrollments', 'Enrollments', ClipboardList],
          ['aars', 'AARs', FileText],
          ['my-training', 'My Training', User],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => toggleTab(key as Tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'my-training' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card border-l-4 border-l-green-500">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={16} className="text-green-400" />
              <span className="text-xs text-text-muted uppercase tracking-wide">Completion Rate</span>
            </div>
            <span className="text-2xl font-bold">{completionRate}%</span>
            <div className="w-full bg-bg-tertiary rounded-full h-2 mt-2">
              <div className="bg-green-500 rounded-full h-2 transition-all" style={{ width: `${completionRate}%` }} />
            </div>
          </div>
          <div className="card border-l-4 border-l-blue-500">
            <span className="text-xs text-text-muted uppercase tracking-wide">In Progress</span>
            <span className="text-2xl font-bold block">{inProgressCount}</span>
            <span className="text-xs text-text-secondary">enrolled / in progress</span>
          </div>
          <div className="card border-l-4 border-l-green-500">
            <span className="text-xs text-text-muted uppercase tracking-wide">Completed</span>
            <span className="text-2xl font-bold block">{completedCount}</span>
            <span className="text-xs text-text-secondary">courses passed</span>
          </div>
          <div className="card border-l-4 border-l-red-500">
            <span className="text-xs text-text-muted uppercase tracking-wide">Failed</span>
            <span className="text-2xl font-bold block">{failedCount}</span>
            <span className="text-xs text-text-secondary">needs retake</span>
          </div>
        </div>
      )}

      {tab === 'courses' && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide flex items-center gap-2">
              <CalendarIcon size={16} /> Course Calendar
            </h3>
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="p-1 rounded hover:bg-bg-hover text-text-secondary"><ChevronLeft size={16} /></button>
              <span className="text-sm font-medium min-w-[120px] text-center">
                {calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={nextMonth} className="p-1 rounded hover:bg-bg-hover text-text-secondary"><ChevronRight size={16} /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-xs font-semibold text-text-muted py-1">{d}</div>
            ))}
            {calendarDays.map((d, i) => (
              <div
                key={i}
                onClick={() => d.dateStr && setSelectedDateStr(d.dateStr)}
                className={`relative p-1.5 rounded-lg text-sm min-h-[40px] cursor-pointer transition-colors ${
                  !d.day ? '' :
                  d.isToday ? 'bg-accent/15 border border-accent/40' :
                  d.courses.length > 0 ? 'bg-bg-tertiary hover:bg-bg-hover' :
                  'hover:bg-bg-hover'
                }`}
              >
                {d.day > 0 && (
                  <>
                    <span className={d.isToday ? 'text-accent font-bold' : 'text-text-secondary'}>{d.day}</span>
                    {d.courses.length > 0 && (
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {d.courses.slice(0, 3).map((_, j) => (
                          <div key={j} className="w-1 h-1 rounded-full bg-accent" />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
          {selectedDateStr && selectedDayCourses.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <h4 className="text-sm font-medium mb-2">
                Courses on {new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}:
              </h4>
              <div className="space-y-2">
                {selectedDayCourses.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg bg-bg-tertiary">
                    <GraduationCap size={16} className="text-accent shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{c.title}</div>
                      <div className="text-xs text-text-muted">{c.course_type} · {c.instructor || 'No instructor'} · {c.duration_hours}h</div>
                    </div>
                    {c.is_required && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/25 shrink-0">
                        <BookOpen size={10} /> REQUIRED
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {selectedDateStr && selectedDayCourses.length === 0 && (
            <div className="mt-4 pt-4 border-t border-border text-center text-xs text-text-muted">
              No courses scheduled on this date
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={handleCreate} className="btn-primary">
          <Plus size={16} /> {currentCreateLabel}
        </button>
      </div>

      <DataTable
        columns={currentColumns}
        data={currentData}
        pagination={currentPagination}
        isLoading={isLoading}
        emptyMessage={`No ${tab === 'my-training' ? 'training history' : tab} found`}
        onPageChange={currentPageSetter}
        onRowClick={(item) => handleEdit(item)}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? `Edit ${tab === 'my-training' ? 'enrollment' : tab.slice(0, -1)}` : `Create ${tab === 'my-training' ? 'enrollment' : tab.slice(0, -1)}` } size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          {tab === 'courses' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput label="Title" value={courseForm.title || ''} onChange={(e) => setCourseForm((f: any) => ({ ...f, title: e.target.value }))} required />
                <FormSelect label="Type" value={courseForm.course_type || 'CLASSROOM'} options={COURSE_TYPE_OPTIONS} onChange={(e) => setCourseForm((f: any) => ({ ...f, course_type: e.target.value }))} />
                <FormInput label="Instructor" value={courseForm.instructor || ''} onChange={(e) => setCourseForm((f: any) => ({ ...f, instructor: e.target.value }))} />
                <FormInput label="Duration (hours)" type="number" value={courseForm.duration_hours?.toString() || '0'} onChange={(e) => setCourseForm((f: any) => ({ ...f, duration_hours: parseInt(e.target.value) || 0 }))} />
                <FormInput label="Prerequisite Course ID" value={(courseForm as any).prerequisite_course_id || ''} onChange={(e) => setCourseForm((f: any) => ({ ...f, prerequisite_course_id: e.target.value }))} placeholder="Optional" />
                <FormInput label="Course Date" type="date" value={(courseForm as any).course_date || ''} onChange={(e) => setCourseForm((f: any) => ({ ...f, course_date: e.target.value }))} />
              </div>
              <FormTextarea label="Description" value={courseForm.description || ''} onChange={(e) => setCourseForm((f: any) => ({ ...f, description: e.target.value }))} />
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_required" checked={courseForm.is_required || false} onChange={(e) => setCourseForm((f: any) => ({ ...f, is_required: e.target.checked }))} className="rounded" />
                <label htmlFor="is_required" className="text-sm text-text-secondary">Required Course</label>
              </div>
            </>
          )}
          {(tab === 'enrollments' || tab === 'my-training') && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput label="Course ID" value={enrollmentForm.course_id || ''} onChange={(e) => setEnrollmentForm((f: any) => ({ ...f, course_id: e.target.value }))} required />
                <FormInput label="User ID" value={enrollmentForm.user_id || ''} onChange={(e) => setEnrollmentForm((f: any) => ({ ...f, user_id: e.target.value }))} required />
                <FormSelect label="Status" value={enrollmentForm.status || 'ENROLLED'} options={ENROLLMENT_STATUS_OPTIONS} onChange={(e) => setEnrollmentForm((f: any) => ({ ...f, status: e.target.value }))} />
                <FormInput label="Score" type="number" value={enrollmentForm.score?.toString() || ''} onChange={(e) => setEnrollmentForm((f: any) => ({ ...f, score: e.target.value ? parseFloat(e.target.value) : null }))} />
                <FormInput label="Enrolled Date" type="date" value={enrollmentForm.enrolled_date || ''} onChange={(e) => setEnrollmentForm((f: any) => ({ ...f, enrolled_date: e.target.value }))} />
                <FormInput label="Completed Date" type="date" value={enrollmentForm.completed_date || ''} onChange={(e) => setEnrollmentForm((f: any) => ({ ...f, completed_date: e.target.value }))} />
              </div>
              <FormTextarea label="Notes" value={enrollmentForm.notes || ''} onChange={(e) => setEnrollmentForm((f: any) => ({ ...f, notes: e.target.value }))} />
            </>
          )}
          {tab === 'aars' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput label="Course ID" value={aarForm.course_id || ''} onChange={(e) => setAarForm((f: any) => ({ ...f, course_id: e.target.value }))} required />
                <FormInput label="Report Date" type="date" value={aarForm.report_date || ''} onChange={(e) => setAarForm((f: any) => ({ ...f, report_date: e.target.value }))} />
                <FormInput label="Created By" value={aarForm.created_by || ''} onChange={(e) => setAarForm((f: any) => ({ ...f, created_by: e.target.value }))} />
              </div>
              <FormTextarea label="Summary" value={aarForm.summary || ''} onChange={(e) => setAarForm((f: any) => ({ ...f, summary: e.target.value }))} />
              <FormTextarea label="Recommendations" value={aarForm.recommendations || ''} onChange={(e) => setAarForm((f: any) => ({ ...f, recommendations: e.target.value }))} />
            </>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSaving} className="btn-primary">
              {isSaving ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Delete ${tab === 'my-training' ? 'enrollment' : tab.slice(0, -1)}`}
        message={`Are you sure you want to delete ${deleteLabel}? This action cannot be undone.`}
        variant="danger"
      />
    </div>
  );
}
