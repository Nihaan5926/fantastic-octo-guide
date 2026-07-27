import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Trash2, BookOpen } from 'lucide-react';
import { trainingApi } from '../api';
import { StatusBadge } from '../../../components/common/Badges';
import DataTable from '../../../components/common/DataTable';
import { FormInput } from '../../../components/common/FormComponents';
import { DetailSkeleton } from '../../../components/common/LoadingSkeleton';

const enrollmentStatusColorMap: Record<string, string> = {
  ENROLLED: 'blue', IN_PROGRESS: 'yellow', COMPLETED: 'green', FAILED: 'red', DROPPED: 'gray',
};

export default function TrainingCourseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [prerequisites, setPrerequisites] = useState<any[]>([]);
  const [prereqModalOpen, setPrereqModalOpen] = useState(false);
  const [prereqCourseName, setPrereqCourseName] = useState('');
  const [prereqAdding, setPrereqAdding] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      setLoading(true);
      Promise.all([
        trainingApi.getCourse(id).then(({ data }: any) => setCourse(data.data || data)),
        trainingApi.listEnrollments({ course_id: id, limit: 100 }).then(({ data }: any) => setEnrollments(data.data || [])),
        trainingApi.getPrerequisites(id).then(({ data }: any) => setPrerequisites(data.data || [])),
      ])
        .catch(() => toast.error('Failed to load course'))
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return <DetailSkeleton />;
  }
  if (!course) {
    return (
      <div className="card text-center py-16">
        <p className="text-text-muted">Course not found.</p>
        <button onClick={() => navigate('/training')} className="btn-secondary mt-4">Back to Training</button>
      </div>
    );
  }

  const handleAddPrerequisite = async () => {
    if (!prereqCourseName.trim() || !id) return;
    setPrereqAdding(true);
    try {
      await trainingApi.addPrerequisite(id, { prerequisite_course_id: prereqCourseName });
      toast.success('Prerequisite added');
      setPrereqModalOpen(false);
      setPrereqCourseName('');
      const { data } = await trainingApi.getPrerequisites(id);
      setPrerequisites(data.data || []);
    } catch {
      toast.error('Failed to add prerequisite');
    } finally {
      setPrereqAdding(false);
    }
  };

  const handleRemovePrerequisite = async (prereqId: string) => {
    if (!id) return;
    try {
      await trainingApi.removePrerequisite(id, prereqId);
      toast.success('Prerequisite removed');
      const { data } = await trainingApi.getPrerequisites(id);
      setPrerequisites(data.data || []);
    } catch {
      toast.error('Failed to remove prerequisite');
    }
  };

  const enrollmentColumns = [
    { key: 'user_id', label: 'Student ID' },
    {
      key: 'status',
      label: 'Status',
      render: (item: any) => <StatusBadge label={item.status || 'N/A'} color={enrollmentStatusColorMap[item.status] || 'gray'} />,
    },
    {
      key: 'enrolled_date',
      label: 'Enrolled',
      render: (item: any) => item.enrolled_date ? new Date(item.enrolled_date).toLocaleDateString() : '—',
    },
    {
      key: 'completed_date',
      label: 'Completed',
      render: (item: any) => item.completed_date ? new Date(item.completed_date).toLocaleDateString() : '—',
    },
    { key: 'score', label: 'Score' },
    { key: 'notes', label: 'Notes' },
  ];

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="btn-ghost flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft size={16} /> Back
      </button>
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">{course.title}</h2>
          {course.is_required && <StatusBadge label="Required" color="red" />}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Title</span>
            <p className="text-sm mt-0.5">{course.title || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Type</span>
            <p className="text-sm mt-0.5">{course.course_type || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Duration</span>
            <p className="text-sm mt-0.5">{course.duration_hours != null ? `${course.duration_hours} hours` : '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Instructor</span>
            <p className="text-sm mt-0.5">{course.instructor || '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Required</span>
            <p className="text-sm mt-0.5">{course.is_required ? 'Yes' : 'No'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Prerequisites</span>
            <p className="text-sm mt-0.5">{course.prerequisite_course_id || 'None'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Created</span>
            <p className="text-sm mt-0.5">{course.created_at ? new Date(course.created_at).toLocaleString() : '—'}</p>
          </div>
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Updated</span>
            <p className="text-sm mt-0.5">{course.updated_at ? new Date(course.updated_at).toLocaleString() : '—'}</p>
          </div>
        </div>
        {course.description && (
          <div className="mt-6 pt-6 border-t border-border">
            <span className="text-xs text-text-muted uppercase tracking-wider">Description</span>
            <p className="text-sm mt-1 whitespace-pre-wrap">{course.description}</p>
          </div>
        )}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
            <BookOpen size={16} /> Prerequisites ({prerequisites.length})
          </h3>
          <button onClick={() => setPrereqModalOpen(true)} className="btn-primary text-xs flex items-center gap-1 py-1 px-2">
            <Plus size={12} /> Add
          </button>
        </div>
        {prerequisites.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-4">No prerequisites set</p>
        ) : (
          <div className="space-y-2">
            {prerequisites.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-bg-primary rounded-lg border border-border">
                <div>
                  <p className="text-sm font-medium">{p.prerequisite_title || p.prerequisite_course_id}</p>
                  {p.prerequisite_description && <p className="text-xs text-text-muted truncate max-w-xs">{p.prerequisite_description}</p>}
                </div>
                <button onClick={() => handleRemovePrerequisite(p.id)} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-red-400">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">Enrolled Students ({enrollments.length})</h3>
        <DataTable
          columns={enrollmentColumns}
          data={enrollments}
          pagination={{ page: 1, limit: enrollments.length, total: enrollments.length, totalPages: 1 }}
          isLoading={false}
          emptyMessage="No students enrolled"
        />
      </div>

      {prereqModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPrereqModalOpen(false)}>
          <div className="bg-bg-card rounded-xl border border-border shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Add Prerequisite</h3>
            <div className="space-y-4">
              <FormInput label="Prerequisite Course ID" value={prereqCourseName} onChange={(e) => setPrereqCourseName(e.target.value)} placeholder="Enter course ID" />
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button onClick={() => setPrereqModalOpen(false)} className="btn-secondary">Cancel</button>
                <button onClick={handleAddPrerequisite} disabled={prereqAdding || !prereqCourseName.trim()} className="btn-primary">
                  {prereqAdding ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
