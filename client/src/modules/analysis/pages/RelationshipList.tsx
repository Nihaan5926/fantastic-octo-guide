import React, { useEffect, useState, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAnalysisStore } from '../store';
import { useDynamicTable } from '../../../hooks/useDynamicTable';
import { analysisApi } from '../api';
import DataTable from '../../../components/common/DataTable';
import Modal from '../../../components/common/Modal';
import PageHeader from '../../../components/common/PageHeader';
import SearchBar from '../../../components/common/SearchBar';
import { FormInput, FormSelect } from '../../../components/common/FormComponents';
import { StatusBadge } from '../../../components/common/Badges';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import { Trash2, GitGraph, Plus, ZoomIn, ZoomOut, RotateCcw, Clock, Network, Globe, Grid3X3, Upload } from 'lucide-react';

const relationshipTypeOptions = [
  { value: 'RELATED_TO', label: 'Related To' },
  { value: 'PART_OF', label: 'Part Of' },
  { value: 'LEADS_TO', label: 'Leads To' },
  { value: 'SUPPORTS', label: 'Supports' },
  { value: 'CONTRADICTS', label: 'Contradicts' },
  { value: 'REFERENCES', label: 'References' },
  { value: 'ATTRIBUTED_TO', label: 'Attributed To' },
  { value: 'LOCATED_IN', label: 'Located In' },
];

const sourceTypeOptions = [
  { value: 'report', label: 'Report' },
  { value: 'source', label: 'Source' },
  { value: 'case', label: 'Case' },
  { value: 'evidence', label: 'Evidence' },
  { value: 'threat_actor', label: 'Threat Actor' },
  { value: 'indicator', label: 'Indicator' },
  { value: 'osint_result', label: 'OSINT Result' },
];

const relTypeColorMap: Record<string, string> = {
  RELATED_TO: 'blue', PART_OF: 'purple', LEADS_TO: 'yellow',
  SUPPORTS: 'green', CONTRADICTS: 'red', REFERENCES: 'gray',
  ATTRIBUTED_TO: 'yellow', LOCATED_IN: 'green',
};

const nodeColorMap: Record<string, string> = {
  threat_actor: '#ef4444',
  case: '#f59e0b',
  report: '#3b82f6',
  source: '#a855f7',
  evidence: '#22c55e',
  indicator: '#eab308',
};

interface RelationshipForm {
  source_type: string;
  source_id: string;
  target_type: string;
  target_id: string;
  relationship_type: string;
}

const emptyForm: RelationshipForm = {
  source_type: 'report', source_id: '', target_type: 'report', target_id: '', relationship_type: 'RELATED_TO',
};

interface GraphNode {
  id: string;
  type: string;
  entityId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
}

function GraphCanvas({ nodes: rawNodes, edges: rawEdges, onFilter }: {
  nodes: any[];
  edges: any[];
  onFilter: (nodeId: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [stableEdges, setStableEdges] = useState<GraphEdge[]>([]);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(0.7);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [draggingNode, setDraggingNode] = useState<GraphNode | null>(null);
  const [panning, setPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [layout, setLayout] = useState<'force' | 'circular' | 'grid'>(() => {
    return (localStorage.getItem('graph-layout') as any) || 'force';
  });
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const animRef = useRef<number>(0);
  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const layoutRef = useRef(layout);

  useEffect(() => {
    localStorage.setItem('graph-layout', layout);
    layoutRef.current = layout;
  }, [layout]);

  const applyLayout = useCallback((ns: GraphNode[], es: GraphEdge[], lyt: string) => {
    const w = 800;
    const h = 550;
    const updated = [...ns];

    if (lyt === 'circular') {
      updated.forEach((n, i) => {
        n.x = w / 2 + Math.cos((2 * Math.PI * i) / ns.length) * 200;
        n.y = h / 2 + Math.sin((2 * Math.PI * i) / ns.length) * 200;
        n.vx = 0; n.vy = 0;
      });
    } else if (lyt === 'grid') {
      const cols = Math.ceil(Math.sqrt(ns.length));
      updated.forEach((n, i) => {
        n.x = 100 + (i % cols) * (w - 200) / Math.max(cols - 1, 1);
        n.y = 80 + Math.floor(i / cols) * (h - 160) / Math.max(Math.ceil(ns.length / cols) - 1, 1);
        n.vx = 0; n.vy = 0;
      });
    } else {
      updated.forEach((n, i) => {
        n.x = w / 2 + Math.cos((2 * Math.PI * i) / ns.length) * 180 + (Math.random() - 0.5) * 60;
        n.y = h / 2 + Math.sin((2 * Math.PI * i) / ns.length) * 180 + (Math.random() - 0.5) * 60;
      });
    }

    return updated;
  }, []);

  useEffect(() => {
    if (!rawNodes.length) return;
    const w = 800;
    const h = 550;
    const initialNodes: GraphNode[] = applyLayout(
      rawNodes.map((n, i) => ({
        id: n.id,
        type: n.type,
        entityId: n.entityId,
        x: w / 2 + Math.cos((2 * Math.PI * i) / rawNodes.length) * 180 + (Math.random() - 0.5) * 60,
        y: h / 2 + Math.sin((2 * Math.PI * i) / rawNodes.length) * 180 + (Math.random() - 0.5) * 60,
        vx: 0,
        vy: 0,
      })),
      [],
      layout
    );
    const initialEdges: GraphEdge[] = rawEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: e.type,
    }));
    nodesRef.current = initialNodes;
    edgesRef.current = initialEdges;
    setNodes([...initialNodes]);
    setStableEdges([...initialEdges]);

    if (layout === 'force') {
      let iter = 0;
      const maxIter = 200;
      const simulate = () => {
        const ns = nodesRef.current;
        const es = edgesRef.current;
        if (iter >= maxIter || ns.length === 0 || layoutRef.current !== 'force') return;
        const damping = 0.85;
        const repulsion = 3000;
        const attraction = 0.005;
        const centerForce = 0.003;
        const maxVel = 8;

        for (let i = 0; i < ns.length; i++) {
          for (let j = i + 1; j < ns.length; j++) {
            const dx = ns[j].x - ns[i].x;
            const dy = ns[j].y - ns[i].y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = repulsion / (dist * dist);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            ns[i].vx -= fx;
            ns[i].vy -= fy;
            ns[j].vx += fx;
            ns[j].vy += fy;
          }
        }

        for (const edge of es) {
          const src = ns.find((n) => n.id === edge.source);
          const tgt = ns.find((n) => n.id === edge.target);
          if (!src || !tgt) continue;
          const dx = tgt.x - src.x;
          const dy = tgt.y - src.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = dist * attraction;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          src.vx += fx;
          src.vy += fy;
          tgt.vx -= fx;
          tgt.vy -= fy;
        }

        for (const n of ns) {
          n.vx += (800 / 2 - n.x) * centerForce;
          n.vy += (550 / 2 - n.y) * centerForce;
          n.vx = Math.max(-maxVel, Math.min(maxVel, n.vx));
          n.vy = Math.max(-maxVel, Math.min(maxVel, n.vy));
          n.x += n.vx;
          n.y += n.vy;
          n.vx *= damping;
          n.vy *= damping;
        }

        iter++;
        setNodes([...ns]);
        animRef.current = requestAnimationFrame(simulate);
      };
      animRef.current = requestAnimationFrame(simulate);
    }

    return () => cancelAnimationFrame(animRef.current);
  }, [rawNodes, rawEdges, layout, applyLayout]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.translate(offset.x + w / 2, offset.y + h / 2);
    ctx.scale(scale, scale);
    ctx.translate(-w / 2, -h / 2);

    for (const edge of stableEdges) {
      const src = nodes.find((n) => n.id === edge.source);
      const tgt = nodes.find((n) => n.id === edge.target);
      if (!src || !tgt) continue;
      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);
      const edgeColor = relTypeColorMap[edge.type] || '#94a3b8';
      ctx.strokeStyle = `${edgeColor}55`;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      const mx = (src.x + tgt.x) / 2;
      const my = (src.y + tgt.y) / 2;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(edge.type, mx, my - 4);
      ctx.textAlign = 'start';
    }

    for (const node of nodes) {
      if (collapsedNodes.has(node.id)) continue;
      const isHovered = hoveredNode?.id === node.id;
      const isSelected = selectedNode?.id === node.id;
      const edgeCount = stableEdges.filter((e) => e.source === node.id || e.target === node.id).length;
      const r = isHovered ? 13 : isSelected ? 12 : Math.min(10 + edgeCount * 1.5, 16);
      const color = nodeColorMap[node.type] || '#94a3b8';

      if (edgeCount >= 5) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 4, 0, Math.PI * 2);
        ctx.strokeStyle = `${color}30`;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      if (isHovered || isSelected) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (edgeCount >= 3 && !(isHovered || isSelected)) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(edgeCount), node.x, node.y + 3);
        ctx.textAlign = 'start';
      }

      if (isHovered || isSelected) {
        const label = node.entityId || node.id.split(':').slice(1).join(':') || node.id;
        const shortLabel = label.length > 20 ? label.slice(0, 20) + '...' : label;
        const typeLabel = node.type;
        ctx.font = '11px sans-serif';
        const textWidth = Math.max(ctx.measureText(shortLabel).width, ctx.measureText(typeLabel).width) + 16;
        const boxH = 32;

        const bx = node.x - textWidth / 2;
        const by = node.y - r - boxH - 6;

        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        const rv = 4;
        ctx.beginPath();
        ctx.moveTo(bx + rv, by);
        ctx.lineTo(bx + textWidth - rv, by);
        ctx.quadraticCurveTo(bx + textWidth, by, bx + textWidth, by + rv);
        ctx.lineTo(bx + textWidth, by + boxH - rv);
        ctx.quadraticCurveTo(bx + textWidth, by + boxH, bx + textWidth - rv, by + boxH);
        ctx.lineTo(bx + rv, by + boxH);
        ctx.quadraticCurveTo(bx, by + boxH, bx, by + boxH - rv);
        ctx.lineTo(bx, by + rv);
        ctx.quadraticCurveTo(bx, by, bx + rv, by);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#e2e8f0';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(typeLabel, node.x, by + 14);
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = '#fff';
        ctx.fillText(shortLabel, node.x, by + 27);
        ctx.textAlign = 'start';
      }
    }

    ctx.restore();
  }, [nodes, stableEdges, hoveredNode, selectedNode, offset, scale, collapsedNodes]);

  useEffect(() => {
    draw();
  }, [draw]);

  const screenToWorld = (sx: number, sy: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const w = canvas.width;
    const h = canvas.height;
    const worldX = (sx - offset.x - w / 2) / scale + w / 2;
    const worldY = (sy - offset.y - h / 2) / scale + h / 2;
    return { x: worldX, y: worldY };
  };

  const findNodeAt = (sx: number, sy: number): GraphNode | null => {
    const world = screenToWorld(sx, sy);
    for (const node of nodes) {
      const dx = node.x - world.x;
      const dy = node.y - world.y;
      if (Math.sqrt(dx * dx + dy * dy) <= 16) return node;
    }
    return null;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (draggingNode) {
      const world = screenToWorld(sx, sy);
      setNodes((prev) =>
        prev.map((n) => (n.id === draggingNode.id ? { ...n, x: world.x, y: world.y } : n))
      );
      nodesRef.current = nodesRef.current.map((n) =>
        n.id === draggingNode.id ? { ...n, x: world.x, y: world.y } : n
      );
      return;
    }

    if (panning) {
      const dx = sx - dragStart.x;
      const dy = sy - dragStart.y;
      setOffset({ x: dragOffset.x + dx, y: dragOffset.y + dy });
      return;
    }

    const node = findNodeAt(sx, sy);
    setHoveredNode(node);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const node = findNodeAt(sx, sy);
    if (node && e.shiftKey) {
      e.preventDefault();
      setCollapsedNodes((prev) => {
        const next = new Set(prev);
        if (next.has(node.id)) next.delete(node.id);
        else next.add(node.id);
        return next;
      });
      return;
    }
    if (node) {
      setDraggingNode(node);
      setSelectedNode(node);
      onFilter(node.id);
    } else {
      setSelectedNode(null);
      onFilter(null);
      setPanning(true);
      setDragStart({ x: sx, y: sy });
      setDragOffset({ ...offset });
    }
  };

  const handleMouseUp = () => {
    setDraggingNode(null);
    setPanning(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((s) => Math.max(0.1, Math.min(3, s * delta)));
  };

  const handleZoomIn = () => setScale((s) => Math.min(3, s * 1.2));
  const handleZoomOut = () => setScale((s) => Math.max(0.1, s / 1.2));
  const handleReset = () => { setOffset({ x: 0, y: 0 }); setScale(0.7); setSelectedNode(null); onFilter(null); setCollapsedNodes(new Set()); };

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {Object.entries(nodeColorMap).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs text-text-muted">{type}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setLayout('force')}
            className={`p-1.5 rounded-lg ${layout === 'force' ? 'bg-accent/20 text-accent' : 'text-text-secondary hover:bg-bg-hover'}`}
            title="Force-directed layout"
          ><Network size={16} /></button>
          <button
            onClick={() => setLayout('circular')}
            className={`p-1.5 rounded-lg ${layout === 'circular' ? 'bg-accent/20 text-accent' : 'text-text-secondary hover:bg-bg-hover'}`}
            title="Circular layout"
          ><Globe size={16} /></button>
          <button
            onClick={() => setLayout('grid')}
            className={`p-1.5 rounded-lg ${layout === 'grid' ? 'bg-accent/20 text-accent' : 'text-text-secondary hover:bg-bg-hover'}`}
            title="Grid layout"
          ><Grid3X3 size={16} /></button>
          <div className="w-px h-5 bg-border mx-1" />
          <button onClick={handleZoomIn} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary" title="Zoom in"><ZoomIn size={16} /></button>
          <button onClick={handleZoomOut} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary" title="Zoom out"><ZoomOut size={16} /></button>
          <button onClick={handleReset} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary" title="Reset view"><RotateCcw size={16} /></button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={800}
        height={550}
        className="w-full rounded-lg border border-border bg-bg-tertiary/30 cursor-crosshair"
        style={{ height: '550px', width: '100%' }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />
      <p className="text-xs text-text-muted mt-2 text-center">
        Drag nodes to reposition | Shift+click to expand/collapse | Scroll to zoom | Drag canvas to pan
        {selectedNode && <span className="ml-2 text-accent">Filtering: {selectedNode.id}</span>}
        {collapsedNodes.size > 0 && <span className="ml-2 text-amber-400">Collapsed: {collapsedNodes.size}</span>}
      </p>
    </div>
  );
}

export default function RelationshipList() {
  const { items, pagination, graph, graphStats, isLoading, isSubmitting, fetchList, create, remove, fetchGraph, fetchGraphStats } = useAnalysisStore();
  const { tableColumns } = useDynamicTable('entity_relationships');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<RelationshipForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [filterNodeId, setFilterNodeId] = useState<string | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [timelineEntityFilter, setTimelineEntityFilter] = useState('');
  const [allRelationships, setAllRelationships] = useState<any[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [importCsv, setImportCsv] = useState('');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetchList({ page, search, type: typeFilter });
  }, [page, typeFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchList({ page: 1, search, type: typeFilter });
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchGraph();
    fetchGraphStats();
  }, []);

  useEffect(() => {
    analysisApi.list({ limit: 1000 }).then(({ data }: any) => {
      setAllRelationships(data.data || data.items || []);
    }).catch(() => {});
  }, []);

  const openCreate = () => {
    setForm(emptyForm);
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await create(form);
      toast.success('Relationship created');
      setFormOpen(false);
      fetchList({ page, search, type: typeFilter });
      fetchGraph();
      fetchGraphStats();
    } catch {
      toast.error('Operation failed');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await remove(deleteTarget.id);
      toast.success('Relationship deleted');
      setDeleteTarget(null);
      fetchGraph();
      fetchGraphStats();
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleImport = async () => {
    if (!importCsv.trim()) return;
    setImporting(true);
    try {
      const result = await analysisApi.importCsv(importCsv);
      toast.success(`${result.data.created} relationship(s) imported`);
      setImportOpen(false);
      setImportCsv('');
      fetchList({ page, search, type: typeFilter });
      fetchGraph();
      fetchGraphStats();
    } catch {
      toast.error('Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleNodeFilter = (nodeId: string | null) => {
    setFilterNodeId(nodeId);
    if (nodeId) {
      fetchList({ page: 1, search: nodeId, type: typeFilter });
    } else {
      fetchList({ page, search, type: typeFilter });
    }
  };

  const graphNodes = graph?.nodes || [];
  const graphEdges = graph?.edges || [];

  const filteredItems = filterNodeId
    ? items.filter((item: any) =>
        `${item.source_type}:${item.source_id}` === filterNodeId ||
        `${item.target_type}:${item.target_id}` === filterNodeId
      )
    : items;

  const columns = [
    { key: 'source_type', label: 'Source Type' },
    { key: 'source_id', label: 'Source ID' },
    {
      key: 'relationship_type',
      label: 'Relationship',
      render: (item: any) => (
        <div className="flex items-center gap-2">
          <StatusBadge label={item.relationship_type} color={relTypeColorMap[item.relationship_type] || 'gray'} />
        </div>
      ),
    },
    { key: 'target_type', label: 'Target Type' },
    { key: 'target_id', label: 'Target ID' },
    {
      key: 'actions',
      label: '',
      className: 'w-24',
      render: (item: any) => (
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-red-400">
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Analysis" subtitle="Manage entity relationships" onCreate={openCreate} createLabel="New Relationship">
        <button onClick={() => setImportOpen(true)} className="btn-secondary flex items-center gap-2">
          <Upload size={16} /> Import CSV
        </button>
      </PageHeader>

      {graphStats && (
        <div className="card mb-6">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-text-muted">Nodes:</span>
              <span className="font-semibold">{graphStats.totalNodes}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-text-muted">Edges:</span>
              <span className="font-semibold">{graphStats.totalEdges}</span>
            </div>
            {graphStats.nodesByType && Object.entries(graphStats.nodesByType).map(([type, count]) => (
              <div key={type} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: nodeColorMap[type] || '#94a3b8' }} />
                <span className="text-text-muted text-xs">{type}:</span>
                <span className="text-xs font-medium">{count as number}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <div>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search relationships..." className="flex-1" />
            <FormSelect label="" options={relationshipTypeOptions} value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} placeholder="All Types" className="w-44" />
          </div>
          <DataTable
            columns={[...tableColumns, ...columns.filter(c => c.key === 'actions')]}
            data={filteredItems}
            pagination={pagination}
            isLoading={isLoading}
            emptyMessage="No relationships found"
            onPageChange={setPage}
          />
        </div>

        <div>
          <div className="card">
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                {showTimeline ? <Clock size={16} /> : <GitGraph size={16} />}
                {showTimeline ? 'Relationship Timeline' : 'Relationship Graph'}
              </span>
              <button
                onClick={() => setShowTimeline(!showTimeline)}
                className="text-xs px-3 py-1 rounded-lg bg-bg-tertiary hover:bg-bg-hover text-text-secondary transition-colors"
              >
                {showTimeline ? 'Show Graph' : 'Show Timeline'}
              </button>
            </h3>
            {showTimeline ? (
              <div className="max-h-[550px] overflow-y-auto">
                {allRelationships.length === 0 ? (
                  <div className="text-center py-12 text-text-muted">
                    <Clock size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No relationship data available.</p>
                  </div>
                ) : (
                  <div>
                    <div className="mb-3">
                      <FormSelect
                        label=""
                        options={sourceTypeOptions}
                        value={timelineEntityFilter}
                        onChange={(e) => setTimelineEntityFilter(e.target.value)}
                        placeholder="Filter by entity type"
                        className="w-full"
                      />
                    </div>
                    <div className="relative pl-6 border-l-2 border-border space-y-4">
                      {(() => {
                        let filtered = allRelationships.filter((r: any) => {
                          if (!timelineEntityFilter) return true;
                          return r.source_type === timelineEntityFilter || r.target_type === timelineEntityFilter;
                        });
                        filtered.sort((a: any, b: any) =>
                          new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
                        );
                        return filtered.length === 0 ? (
                          <p className="text-xs text-text-muted py-4">No matching relationships</p>
                        ) : filtered.map((item: any, i: number) => {
                          const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'short', day: 'numeric',
                          }) : 'Unknown date';
                          const timeStr = item.created_at ? new Date(item.created_at).toLocaleTimeString('en-US', {
                            hour: '2-digit', minute: '2-digit',
                          }) : '';
                          const typeColor = relTypeColorMap[item.relationship_type] || 'gray';
                          const badgeColors: Record<string, string> = {
                            green: 'bg-green-500/15 text-green-400 border-green-500/25',
                            red: 'bg-red-500/15 text-red-400 border-red-500/25',
                            blue: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
                            purple: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
                            yellow: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
                            gray: 'bg-gray-500/15 text-gray-400 border-gray-500/25',
                          };
                          const typeBadge = badgeColors[typeColor] || badgeColors.gray;
                          return (
                            <div key={item.id || i} className="relative">
                              <div className="absolute -left-[25px] top-1.5 w-2.5 h-2.5 rounded-full bg-accent border-2 border-bg-card" />
                              <div className={`inline-block px-2 py-0.5 rounded text-xs font-medium border mb-1 ${typeBadge}`}>
                                {item.relationship_type.replace(/_/g, ' ')}
                              </div>
                              <div className="text-xs text-text-secondary flex items-center gap-1 flex-wrap">
                                <span className="font-medium text-text-primary">{item.source_type}:{item.source_id}</span>
                                <span className="text-text-muted">→</span>
                                <span className="font-medium text-text-primary">{item.target_type}:{item.target_id}</span>
                              </div>
                              <div className="text-[11px] text-text-muted mt-0.5">
                                {dateStr} {timeStr && `· ${timeStr}`}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>
            ) : graphNodes.length === 0 ? (
              <div className="text-center py-12 text-text-muted">
                <GitGraph size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No graph data available. Create relationships to visualize connections.</p>
              </div>
            ) : (
              <GraphCanvas nodes={graphNodes} edges={graphEdges} onFilter={handleNodeFilter} />
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title="Create Relationship" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <h4 className="text-sm font-medium text-text-secondary">Source</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect label="Source Type" options={sourceTypeOptions} value={form.source_type} onChange={(e) => setForm({ ...form, source_type: e.target.value })} />
            <FormInput label="Source ID" value={form.source_id} onChange={(e) => setForm({ ...form, source_id: e.target.value })} />
          </div>
          <FormSelect label="Relationship Type" options={relationshipTypeOptions} value={form.relationship_type} onChange={(e) => setForm({ ...form, relationship_type: e.target.value })} />
          <h4 className="text-sm font-medium text-text-secondary">Target</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect label="Target Type" options={sourceTypeOptions} value={form.target_type} onChange={(e) => setForm({ ...form, target_type: e.target.value })} />
            <FormInput label="Target ID" value={form.target_id} onChange={(e) => setForm({ ...form, target_id: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={() => setFormOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Relationship"
        message={`Are you sure you want to delete this relationship? This action cannot be undone.`}
        variant="danger"
        isLoading={isSubmitting}
      />

      <Modal isOpen={importOpen} onClose={() => setImportOpen(false)} title="Import Relationships from CSV" size="md">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Paste CSV data with headers: <code className="text-accent bg-bg-tertiary px-1 rounded">source_type,source_id,target_type,target_id,relationship_type</code>
          </p>
          <textarea
            className="w-full h-48 bg-bg-tertiary border border-border rounded-lg p-3 text-sm text-text-primary resize-y font-mono"
            value={importCsv}
            onChange={(e) => setImportCsv(e.target.value)}
            placeholder={`source_type,source_id,target_type,target_id,relationship_type\nreport,abc-123,case,def-456,RELATED_TO\nsource,ghi-789,threat_actor,jkl-012,ATTRIBUTED_TO`}
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button onClick={() => setImportOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleImport} disabled={importing || !importCsv.trim()} className="btn-primary">
              {importing ? 'Importing...' : 'Import'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}