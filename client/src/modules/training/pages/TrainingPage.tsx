import React, { useEffect, useState, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Pencil, Trash2, Plus, GraduationCap, ClipboardList, FileText, User, TrendingUp, Users, BookOpen } from 'lucide-react';
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
      <PageHeader title="Training" subtitle="Manage training courses, enrollments, and after-action reports" />

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
