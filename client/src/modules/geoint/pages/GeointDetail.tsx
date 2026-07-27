import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Trash2, Plus, Copy, MapPin, Navigation } from 'lucide-react';
import { useGeointStore } from '../store';
import PageHeader from '../../../components/common/PageHeader';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { FormInput, FormTextarea } from '../../../components/common/FormComponents';
import { ClassificationBadge } from '../../../components/common/Badges';
import { DetailSkeleton } from '../../../components/common/LoadingSkeleton';
import { MapContainer, TileLayer, Marker, Polygon, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export default function GeointDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    currentFeature, currentFeatureLoading,
    annotations, annotationsLoading,
    fetchFeature, fetchAnnotations, createAnnotation, deleteAnnotation,
  } = useGeointStore();

  const [annotationModal, setAnnotationModal] = useState(false);
  const [annotationContent, setAnnotationContent] = useState('');
  const [annotationType, setAnnotationType] = useState('NOTE');
  const [annotationSaving, setAnnotationSaving] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteAnnotId, setDeleteAnnotId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const coords = currentFeature?.coordinates;

  const formattedCoords = useMemo(() => {
    if (!coords) return null;
    const ft = currentFeature?.feature_type;
    if (ft === 'POINT') {
      const lat = coords.coordinates?.[1] ?? coords.lat ?? coords[1] ?? coords[0];
      const lng = coords.coordinates?.[0] ?? coords.lng ?? coords[0] ?? coords[1];
      return { type: 'POINT', detail: `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`, lat: Number(lat), lng: Number(lng) };
    }
    if (ft === 'POLYGON') {
      const ring = coords.coordinates?.[0] ?? coords;
      const vertexCount = Array.isArray(ring) ? ring.length : 0;
      return { type: 'POLYGON', detail: `${vertexCount} vertices` };
    }
    if (ft === 'LINESTRING') {
      const pts = coords.coordinates ?? coords;
      const count = Array.isArray(pts) ? pts.length : 0;
      return { type: 'LINESTRING', detail: `${count} point${count !== 1 ? 's' : ''} — ${count > 1 ? `~${count - 1} segment${count > 2 ? 's' : ''}` : ''}` };
    }
    return { type: ft || 'COORDINATES', detail: JSON.stringify(coords).slice(0, 80) };
  }, [coords, currentFeature?.feature_type]);

  const geoData = useMemo(() => {
    if (!coords || !currentFeature?.feature_type) return null;
    const ft = currentFeature.feature_type;
    try {
      if (ft === 'POINT') {
        const lat = coords.coordinates?.[1] ?? coords.lat ?? coords[1] ?? coords[0];
        const lng = coords.coordinates?.[0] ?? coords.lng ?? coords[0] ?? coords[1];
        return { type: 'POINT', pos: [Number(lat), Number(lng)] as [number, number] };
      }
      if (ft === 'POLYGON') {
        const ring = coords.coordinates?.[0] ?? coords;
        if (Array.isArray(ring) && ring.length > 0) {
          const pos = ring.map((p: any) => {
            if (Array.isArray(p)) return [Number(p[1]), Number(p[0])] as [number, number];
            return [Number(p.lat), Number(p.lng)] as [number, number];
          });
          return { type: 'POLYGON', positions: pos };
        }
      }
      if (ft === 'LINESTRING') {
        const pts = coords.coordinates ?? coords;
        if (Array.isArray(pts) && pts.length > 0) {
          const pos = pts.map((p: any) => {
            if (Array.isArray(p)) return [Number(p[1]), Number(p[0])] as [number, number];
            return [Number(p.lat), Number(p.lng)] as [number, number];
          });
          return { type: 'LINESTRING', positions: pos };
        }
      }
    } catch {}
    return null;
  }, [coords, currentFeature?.feature_type]);

  const mapCenter: [number, number] = useMemo(() => {
    if (formattedCoords && 'lat' in formattedCoords && 'lng' in formattedCoords) {
      return [formattedCoords.lat as number, formattedCoords.lng as number];
    }
    return [0, 0];
  }, [formattedCoords]);

  const handleCopyCoords = () => {
    const text = formattedCoords ? formattedCoords.detail : JSON.stringify(coords);
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Coordinates copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy coordinates');
    });
  };

  useEffect(() => {
    if (id) {
      fetchFeature(id);
      fetchAnnotations(id);
    }
  }, [id]);

  const handleAddAnnotation = async () => {
    if (!id || !annotationContent.trim()) return;
    setAnnotationSaving(true);
    const ok = await createAnnotation(id, { content: annotationContent, annotation_type: annotationType });
    setAnnotationSaving(false);
    if (ok) {
      setAnnotationModal(false);
      setAnnotationContent('');
      setAnnotationType('NOTE');
    }
  };

  const openDeleteAnnot = (annotId: string) => {
    setDeleteAnnotId(annotId);
    setConfirmOpen(true);
  };

  const handleDeleteAnnot = async () => {
    if (!deleteAnnotId) return;
    setDeleting(true);
    const ok = await deleteAnnotation(deleteAnnotId);
    setDeleting(false);
    if (ok && id) {
      fetchAnnotations(id);
    }
    setConfirmOpen(false);
    setDeleteAnnotId(null);
  };

  const annotColumns = [
    {
      key: 'annotation_type',
      label: 'Type',
      render: (item: any) => (
        <span className="badge bg-purple-500/20 text-purple-400 border-purple-500/30">{item.annotation_type}</span>
      ),
    },
    { key: 'content', label: 'Content' },
    {
      key: 'created_at',
      label: 'Created',
      render: (item: any) => item.created_at ? new Date(item.created_at).toLocaleString() : '-',
    },
    {
      key: 'actions',
      label: '',
      className: 'w-16',
      render: (item: any) => (
        <button onClick={() => openDeleteAnnot(item.id)} className="p-1.5 rounded-lg hover:bg-bg-hover text-accent-danger" title="Delete">
          <Trash2 size={14} />
        </button>
      ),
    },
  ];

  if (currentFeatureLoading) {
    return <DetailSkeleton />;
  }

  if (!currentFeature) {
    return (
      <div className="card p-8 text-center">
        <p className="text-text-muted mb-4">Feature not found</p>
        <button onClick={() => navigate('/geoint')} className="btn-primary">Back to GEOINT</button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => navigate('/geoint')} className="flex items-center gap-2 text-text-secondary hover:text-text-primary mb-4 transition-colors">
        <ArrowLeft size={16} />
        <span className="text-sm">Back to GEOINT</span>
      </button>

      <PageHeader title={currentFeature.title || 'Feature Detail'} subtitle="Geospatial feature information and annotations" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="card space-y-3">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Details</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-text-muted">Type</span><span className="badge bg-blue-500/20 text-blue-400">{currentFeature.feature_type}</span></div>
            <div className="flex justify-between text-sm"><span className="text-text-muted">Classification</span><ClassificationBadge level={currentFeature.classification} /></div>
            <div className="flex justify-between text-sm"><span className="text-text-muted">Imagery Ref</span><span>{currentFeature.imagery_reference || '-'}</span></div>
            <div className="flex justify-between text-sm"><span className="text-text-muted">Collection Date</span><span>{currentFeature.collection_date ? new Date(currentFeature.collection_date).toLocaleDateString() : '-'}</span></div>
          </div>
          {currentFeature.description && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-text-muted mb-1">Description</p>
              <p className="text-sm">{currentFeature.description}</p>
            </div>
          )}
        </div>

        <div className="card col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Coordinates</h3>
            {coords && (
              <button onClick={handleCopyCoords} className="btn-secondary text-xs flex items-center gap-1 py-1 px-2.5">
                <Copy size={13} /> Copy Coordinates
              </button>
            )}
          </div>
          {formattedCoords ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-accent/10 text-accent">
                  <MapPin size={20} />
                </div>
                <div>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    formattedCoords.type === 'POINT' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/25' :
                    formattedCoords.type === 'POLYGON' ? 'bg-purple-500/15 text-purple-400 border border-purple-500/25' :
                    'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                  }`}>{formattedCoords.type}</span>
                </div>
              </div>
              <div className="bg-bg-tertiary rounded-lg p-4">
                <p className="text-sm font-mono text-text-primary">{formattedCoords.detail}</p>
                {formattedCoords.type === 'POINT' && (
                  <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
                    <Navigation size={12} /> Decimal Degrees (DD)
                  </p>
                )}
              </div>
            </div>
          ) : (
            <pre className="bg-bg-tertiary rounded-lg p-4 text-xs font-mono text-text-secondary overflow-auto max-h-64">
              {JSON.stringify(coords, null, 2)}
            </pre>
          )}
        </div>
      </div>

      {geoData && (
        <div className="card mb-6">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
            <MapPin size={14} /> Map View
          </h3>
          <div className="rounded-lg overflow-hidden border border-border" style={{ height: '400px' }}>
            <MapContainer
              center={mapCenter}
              zoom={13}
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%' }}
              className="geoint-map"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              {geoData.type === 'POINT' && (
                <Marker position={geoData.pos || [0, 0] as [number, number]}> 
                  <Popup>
                    <div className="text-sm text-gray-900">
                      <strong>{currentFeature.title}</strong><br />
                      {typeof formattedCoords?.detail === 'string' ? formattedCoords.detail : ''}
                    </div>
                  </Popup>
                </Marker>
              )}
              {geoData.type === 'POLYGON' && geoData.positions && (
                <Polygon
                  positions={geoData.positions}
                  pathOptions={{ color: '#8b5cf6', fillColor: '#8b5cf6', fillOpacity: 0.3 }}
                >
                  <Popup>
                    <div className="text-sm text-gray-900">
                      <strong>{currentFeature.title}</strong><br />
                      {geoData.positions.length} vertices
                    </div>
                  </Popup>
                </Polygon>
              )}
              {geoData.type === 'LINESTRING' && geoData.positions && (
                <Polyline
                  positions={geoData.positions}
                  pathOptions={{ color: '#06b6d4', weight: 3 }}
                >
                  <Popup>
                    <div className="text-sm text-gray-900">
                      <strong>{currentFeature.title}</strong><br />
                      {geoData.positions.length} points
                    </div>
                  </Popup>
                </Polyline>
              )}
            </MapContainer>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Annotations</h3>
          <button onClick={() => { setAnnotationContent(''); setAnnotationType('NOTE'); setAnnotationModal(true); }} className="btn-primary text-xs">
            <Plus size={14} /> Add Annotation
          </button>
        </div>
        <DataTable
          columns={annotColumns}
          data={annotations}
          isLoading={annotationsLoading}
          emptyMessage="No annotations yet"
        />
      </div>

      {/* Add Annotation Modal */}
      <Modal isOpen={annotationModal} onClose={() => setAnnotationModal(false)} title="Add Annotation" size="md">
        <div className="space-y-4">
          <FormInput label="Type" value={annotationType} onChange={(e) => setAnnotationType(e.target.value)} />
          <FormTextarea label="Content" required value={annotationContent} onChange={(e) => setAnnotationContent(e.target.value)} />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setAnnotationModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleAddAnnotation} disabled={annotationSaving || !annotationContent.trim()} className="btn-primary">
            {annotationSaving ? 'Adding...' : 'Add'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDeleteAnnot}
        title="Delete Annotation"
        message="Are you sure you want to delete this annotation?"
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleting}
      />
    </div>
  );
}
