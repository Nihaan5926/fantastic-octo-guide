import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { trainingApi } from '../api';
import { StatusBadge } from '../../../components/common/Badges';
import DataTable from '../../../components/common/DataTable';
import { DetailSkeleton } from '../../../components/common/LoadingSkeleton';

const enrollmentStatusColorMap: Record<string, string> = {
  ENROLLED: 'blue', IN_PROGRESS: 'yellow', COMPLETED: 'green', FAILED: 'red', DROPPED: 'gray',
};

export default function TrainingCourseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      setLoading(true);
      Promise.all([
        trainingApi.getCourse(id).then(({ data }: any) => setCourse(data.data || data)),
        trainingApi.listEnrollments({ course_id: id, limit: 100 }).then(({ data }: any) => setEnrollments(data.data || [])),
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
        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">Enrolled Students ({enrollments.length})</h3>
        <DataTable
          columns={enrollmentColumns}
          data={enrollments}
          pagination={{ page: 1, limit: enrollments.length, total: enrollments.length, totalPages: 1 }}
          isLoading={false}
          emptyMessage="No students enrolled"
        />
      </div>
    </div>
  );
}
