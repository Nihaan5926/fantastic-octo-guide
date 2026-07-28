import React, { useEffect, useState, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAnalysisStore } from '../store';
import { analysisApi } from '../api';
import SearchBar from '../../../components/common/SearchBar';
import { FormSelect, FormInput } from '../../../components/common/FormComponents';
import Modal from '../../../components/common/Modal';
import { ZoomIn, ZoomOut, RotateCcw, Network, Globe, Grid3X3, Download, Plus } from 'lucide-react';

const nodeColorMap: Record<string, string> = {
  threat_actor: '#ef4444',
  case: '#f59e0b',
  report: '#3b82f6',
  source: '#a855f7',
  evidence: '#22c55e',
  indicator: '#eab308',
};

const relTypeColorMap: Record<string, string> = {
  RELATED_TO: '#3b82f6', PART_OF: '#a855f7', LEADS_TO: '#eab308',
  SUPPORTS: '#22c55e', CONTRADICTS: '#ef4444', REFERENCES: '#94a3b8',
  ATTRIBUTED_TO: '#eab308', LOCATED_IN: '#22c55e',
};

const entityTypeOptions = [
  { value: '', label: 'All Types' },
  { value: 'threat_actor', label: 'Threat Actor' },
  { value: 'case', label: 'Case' },
  { value: 'report', label: 'Report' },
  { value: 'source', label: 'Source' },
  { value: 'evidence', label: 'Evidence' },
];

const relationshipTypeOptions = [
  { value: '', label: 'All Relations' },
  { value: 'RELATED_TO', label: 'Related To' },
  { value: 'PART_OF', label: 'Part Of' },
  { value: 'LEADS_TO', label: 'Leads To' },
  { value: 'SUPPORTS', label: 'Supports' },
  { value: 'CONTRADICTS', label: 'Contradicts' },
  { value: 'REFERENCES', label: 'References' },
  { value: 'ATTRIBUTED_TO', label: 'Attributed To' },
  { value: 'LOCATED_IN', label: 'Located In' },
];

const sourceTypeOptions = relationshipTypeOptions.filter(o => o.value !== '');

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

function GraphCanvas({
  rawNodes,
  rawEdges,
  entityTypeFilter,
  relTypeFilter,
  selectedNodeId,
  onSelectNode,
  canvasRef,
  onNodesEdges,
}: {
  rawNodes: any[];
  rawEdges: any[];
  entityTypeFilter: string;
  relTypeFilter: string;
  selectedNodeId: string | null;
  onSelectNode: (node: any | null) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onNodesEdges: (nodes: GraphNode[], edges: GraphEdge[]) => void;
}) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [stableEdges, setStableEdges] = useState<GraphEdge[]>([]);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(0.7);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [draggingNode, setDraggingNode] = useState<GraphNode | null>(null);
  const [panning, setPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [layout, setLayout] = useState<'force' | 'circular' | 'grid'>(() => {
    return (localStorage.getItem('graph-layout-2') as any) || 'force';
  });
  const animRef = useRef<number>(0);
  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const layoutRef = useRef(layout);

  useEffect(() => {
    localStorage.setItem('graph-layout-2', layout);
    layoutRef.current = layout;
  }, [layout]);

  const applyLayout = useCallback((ns: GraphNode[], lyt: string) => {
    const w = 900;
    const h = 600;
    const updated = [...ns];
    if (lyt === 'circular') {
      updated.forEach((n, i) => {
        n.x = w / 2 + Math.cos((2 * Math.PI * i) / ns.length) * 220;
        n.y = h / 2 + Math.sin((2 * Math.PI * i) / ns.length) * 220;
        n.vx = 0; n.vy = 0;
      });
    } else if (lyt === 'grid') {
      const cols = Math.ceil(Math.sqrt(ns.length));
      updated.forEach((n, i) => {
        n.x = 120 + (i % cols) * (w - 240) / Math.max(cols - 1, 1);
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
    const filteredNodeIds = new Set(rawNodes.map((n: any) => n.id));
    const filteredEdges = rawEdges.filter((e: any) => {
      if (!filteredNodeIds.has(e.source) || !filteredNodeIds.has(e.target)) return false;
      if (relTypeFilter && e.type !== relTypeFilter) return false;
      return true;
    });

    if (!rawNodes.length) {
      setNodes([]);
      setStableEdges([]);
      nodesRef.current = [];
      edgesRef.current = [];
      onNodesEdges([], []);
      return;
    }

    const w = 900;
    const h = 600;
    const initialNodes: GraphNode[] = applyLayout(
      rawNodes.map((n: any, i: number) => ({
        id: n.id,
        type: n.type,
        entityId: n.entityId,
        x: w / 2 + Math.cos((2 * Math.PI * i) / rawNodes.length) * 180 + (Math.random() - 0.5) * 60,
        y: h / 2 + Math.sin((2 * Math.PI * i) / rawNodes.length) * 180 + (Math.random() - 0.5) * 60,
        vx: 0, vy: 0,
      })),
      layout
    );
    const initialEdges: GraphEdge[] = filteredEdges.map((e: any) => ({
      id: e.id, source: e.source, target: e.target, type: e.type,
    }));
    nodesRef.current = initialNodes;
    edgesRef.current = initialEdges;
    setNodes([...initialNodes]);
    setStableEdges([...initialEdges]);
    onNodesEdges(initialNodes, initialEdges);

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
            ns[i].vx -= fx; ns[i].vy -= fy;
            ns[j].vx += fx; ns[j].vy += fy;
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
          src.vx += fx; src.vy += fy;
          tgt.vx -= fx; tgt.vy -= fy;
        }
        for (const n of ns) {
          n.vx += (900 / 2 - n.x) * centerForce;
          n.vy += (600 / 2 - n.y) * centerForce;
          n.vx = Math.max(-maxVel, Math.min(maxVel, n.vx));
          n.vy = Math.max(-maxVel, Math.min(maxVel, n.vy));
          n.x += n.vx; n.y += n.vy;
          n.vx *= damping; n.vy *= damping;
        }
        iter++;
        setNodes([...ns]);
        animRef.current = requestAnimationFrame(simulate);
      };
      animRef.current = requestAnimationFrame(simulate);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [rawNodes, rawEdges, layout, applyLayout, entityTypeFilter, relTypeFilter]);

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
      const isHovered = hoveredNode?.id === node.id;
      const isSelected = selectedNodeId === node.id;
      const edgeCount = stableEdges.filter((e) => e.source === node.id || e.target === node.id).length;
      const r = isHovered ? 14 : isSelected ? 13 : Math.min(10 + edgeCount * 1.5, 16);
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
  }, [nodes, stableEdges, hoveredNode, selectedNodeId, offset, scale]);

  useEffect(() => { draw(); }, [draw]);

  const screenToWorld = (sx: number, sy: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const w = canvas.width;
    const h = canvas.height;
    return { x: (sx - offset.x - w / 2) / scale + w / 2, y: (sy - offset.y - h / 2) / scale + h / 2 };
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
      setNodes((prev) => prev.map((n) => (n.id === draggingNode.id ? { ...n, x: world.x, y: world.y } : n)));
      nodesRef.current = nodesRef.current.map((n) => (n.id === draggingNode.id ? { ...n, x: world.x, y: world.y } : n));
      return;
    }
    if (panning) {
      setOffset({ x: dragOffset.x + (sx - dragStart.x), y: dragOffset.y + (sy - dragStart.y) });
      return;
    }
    setHoveredNode(findNodeAt(sx, sy));
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const node = findNodeAt(sx, sy);
    if (node) {
      setDraggingNode(node);
      onSelectNode(node);
    } else {
      onSelectNode(null);
      setPanning(true);
      setDragStart({ x: sx, y: sy });
      setDragOffset({ ...offset });
    }
  };

  const handleMouseUp = () => { setDraggingNode(null); setPanning(false); };
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setScale((s) => Math.max(0.1, Math.min(3, s * (e.deltaY > 0 ? 0.9 : 1.1))));
  };

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
          <button onClick={() => setLayout('force')} className={`p-1.5 rounded-lg ${layout === 'force' ? 'bg-accent/20 text-accent' : 'text-text-secondary hover:bg-bg-hover'}`} title="Force layout"><Network size={16} /></button>
          <button onClick={() => setLayout('circular')} className={`p-1.5 rounded-lg ${layout === 'circular' ? 'bg-accent/20 text-accent' : 'text-text-secondary hover:bg-bg-hover'}`} title="Circular layout"><Globe size={16} /></button>
          <button onClick={() => setLayout('grid')} className={`p-1.5 rounded-lg ${layout === 'grid' ? 'bg-accent/20 text-accent' : 'text-text-secondary hover:bg-bg-hover'}`} title="Grid layout"><Grid3X3 size={16} /></button>
          <div className="w-px h-5 bg-border mx-1" />
          <button onClick={() => setScale((s) => Math.min(3, s * 1.2))} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary" title="Zoom in"><ZoomIn size={16} /></button>
          <button onClick={() => setScale((s) => Math.max(0.1, s / 1.2))} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary" title="Zoom out"><ZoomOut size={16} /></button>
          <button onClick={() => { setOffset({ x: 0, y: 0 }); setScale(0.7); onSelectNode(null); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary" title="Reset view"><RotateCcw size={16} /></button>
        </div>
      </div>
      <canvas
        ref={canvasRef as any}
        width={900}
        height={600}
        className="w-full rounded-lg border border-border bg-bg-tertiary/30 cursor-crosshair"
        style={{ height: '600px', width: '100%' }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />
      <p className="text-xs text-text-muted mt-2 text-center">
        Drag nodes to reposition | Scroll to zoom | Drag canvas to pan | Click node to select
      </p>
    </div>
  );
}

export default function LinkAnalysis() {
  const { graph, graphStats, fetchGraph, fetchGraphStats, isSubmitting, create } = useAnalysisStore();
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [relTypeFilter, setRelTypeFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ source_type: 'report', source_id: '', target_type: 'report', target_id: '', relationship_type: 'RELATED_TO' });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentNodes, setCurrentNodes] = useState<GraphNode[]>([]);
  const [currentEdges, setCurrentEdges] = useState<GraphEdge[]>([]);

  useEffect(() => { fetchGraph(); fetchGraphStats(); }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.trim()) {
        analysisApi.list({ search, limit: 20 }).then(({ data }: any) => {
          setSearchResults(data.data || data.items || []);
        }).catch(() => setSearchResults([]));
      } else {
        setSearchResults([]);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const graphNodes = entityTypeFilter
    ? (graph?.nodes || []).filter((n: any) => n.type === entityTypeFilter)
    : (graph?.nodes || []);
  const graphEdges = graph?.edges || [];

  const handleExportPng = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'link-analysis.png';
    link.href = dataUrl;
    link.click();
    toast.success('Graph exported as PNG');
  };

  const handleSubmitRel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await create(form);
      toast.success('Relationship created');
      setFormOpen(false);
      setForm({ source_type: 'report', source_id: '', target_type: 'report', target_id: '', relationship_type: 'RELATED_TO' });
      fetchGraph();
      fetchGraphStats();
    } catch {
      toast.error('Failed to create relationship');
    }
  };

  const totalNodes = graphNodes.length;
  const totalEdges = graphEdges.length;
  const nodeDegrees: Record<string, number> = {};
  graphEdges.forEach((e: any) => {
    nodeDegrees[e.source] = (nodeDegrees[e.source] || 0) + 1;
    nodeDegrees[e.target] = (nodeDegrees[e.target] || 0) + 1;
  });
  let mostConnected = '';
  let maxDegree = 0;
  Object.entries(nodeDegrees).forEach(([nodeId, degree]) => {
    if (degree > maxDegree) { maxDegree = degree; mostConnected = nodeId; }
  });

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Link Analysis</h2>
        <div className="flex items-center gap-2">
          <button onClick={handleExportPng} className="btn-secondary flex items-center gap-1.5 text-sm" disabled={graphNodes.length === 0}>
            <Download size={15} /> Export PNG
          </button>
          <button onClick={() => {
            if (selectedNode) {
              setForm({ ...form, source_id: selectedNode.entityId || '', source_type: selectedNode.type });
            }
            setFormOpen(true);
          }} className="btn-primary flex items-center gap-1.5 text-sm">
            <Plus size={15} /> Add Relationship
          </button>
        </div>
      </div>

      <div className="card p-3 mb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <FormSelect label="" options={entityTypeOptions} value={entityTypeFilter} onChange={(e) => { setEntityTypeFilter(e.target.value); setSelectedNode(null); }} placeholder="Entity Type" className="w-36" />
          <FormSelect label="" options={relationshipTypeOptions} value={relTypeFilter} onChange={(e) => setRelTypeFilter(e.target.value)} placeholder="Relationship Type" className="w-36" />
        </div>
      </div>

      <div className="flex flex-1 gap-3 overflow-hidden">
        <div className="w-60 shrink-0 flex flex-col">
          <div className="mb-3">
            <SearchBar value={search} onChange={setSearch} placeholder="Search entities..." />
          </div>
          <div className="card flex-1 overflow-y-auto p-3">
            <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Results</div>
            {searchResults.length === 0 ? (
              <p className="text-xs text-text-muted py-4">Type to search entities in relationships</p>
            ) : (
              <div className="space-y-1">
                {searchResults.map((item: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => {
                      const nodeId = `${item.source_type}:${item.source_id}`;
                      setSelectedNode({ id: nodeId, type: item.source_type, entityId: item.source_id });
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-bg-hover text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: nodeColorMap[item.source_type] || '#94a3b8' }} />
                      <div>
                        <span className="text-text-primary font-medium">{item.source_type}</span>
                        <span className="text-text-muted ml-1">{item.source_id}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 card p-3 overflow-hidden flex flex-col">
          {graphNodes.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
              No graph data available. Create relationships to visualize.
            </div>
          ) : (
            <GraphCanvas
              rawNodes={graphNodes}
              rawEdges={graphEdges}
              entityTypeFilter={entityTypeFilter}
              relTypeFilter={relTypeFilter}
              selectedNodeId={selectedNode?.id || null}
              onSelectNode={(node) => setSelectedNode(node)}
              canvasRef={canvasRef}
              onNodesEdges={(nodes, edges) => { setCurrentNodes(nodes); setCurrentEdges(edges); }}
            />
          )}
        </div>

        <div className="w-60 shrink-0">
          <div className="card p-4">
            <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Node Detail</div>
            {selectedNode ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: nodeColorMap[selectedNode.type] || '#94a3b8' }} />
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-bg-tertiary text-text-primary">{selectedNode.type}</span>
                </div>
                <div>
                  <div className="text-[10px] text-text-muted uppercase">Name</div>
                  <div className="text-sm font-medium text-text-primary">{selectedNode.entityId || 'Unknown'}</div>
                </div>
                <div>
                  <div className="text-[10px] text-text-muted uppercase">ID</div>
                  <div className="text-xs text-text-secondary font-mono break-all">{selectedNode.id}</div>
                </div>
                <div>
                  <div className="text-[10px] text-text-muted uppercase">Connections</div>
                  <div className="text-sm font-medium">{nodeDegrees[selectedNode.id] || 0}</div>
                </div>
                <div className="pt-2 border-t border-border space-y-2">
                  <button
                    onClick={() => {
                      setForm({
                        ...form,
                        source_id: selectedNode.entityId || '',
                        source_type: selectedNode.type,
                        target_id: '',
                        target_type: 'report',
                      });
                      setFormOpen(true);
                    }}
                    className="w-full btn-secondary text-xs py-1.5"
                  >
                    Link from this node
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-text-muted">Click a node to view details</p>
            )}
          </div>
        </div>
      </div>

      <div className="card p-3 mt-3">
        <div className="flex items-center gap-6 text-xs text-text-muted">
          <div>Total Nodes: <span className="font-semibold text-text-primary">{totalNodes}</span></div>
          <div>Total Edges: <span className="font-semibold text-text-primary">{totalEdges}</span></div>
          {mostConnected && <div>Most Connected: <span className="font-semibold text-accent">{mostConnected}</span> ({maxDegree} links)</div>}
        </div>
      </div>

      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title="Add Relationship" size="md">
        <form onSubmit={handleSubmitRel} className="space-y-4">
          <h4 className="text-sm font-medium text-text-secondary">Source</h4>
          <div className="grid grid-cols-2 gap-4">
            <FormSelect label="Source Type" options={sourceTypeOptions} value={form.source_type} onChange={(e) => setForm({ ...form, source_type: e.target.value })} />
            <FormInput label="Source ID" value={form.source_id} onChange={(e) => setForm({ ...form, source_id: e.target.value })} />
          </div>
          <FormSelect label="Relationship Type" options={sourceTypeOptions} value={form.relationship_type} onChange={(e) => setForm({ ...form, relationship_type: e.target.value })} />
          <h4 className="text-sm font-medium text-text-secondary">Target</h4>
          <div className="grid grid-cols-2 gap-4">
            <FormSelect label="Target Type" options={sourceTypeOptions} value={form.target_type} onChange={(e) => setForm({ ...form, target_type: e.target.value })} />
            <FormInput label="Target ID" value={form.target_id} onChange={(e) => setForm({ ...form, target_id: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={() => setFormOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
