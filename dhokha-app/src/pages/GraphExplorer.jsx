import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { graphData } from '../data/mockData';
import './GraphExplorer.css';

const NODE_COLORS = {
  account: { fill: '#e5484d', stroke: '#ff6b6f' },
  device: { fill: '#f5a623', stroke: '#ffc55a' },
  ip: { fill: '#8b5cf6', stroke: '#a78bfa' },
};

const EDGE_COLORS = {
  sent_to: '#e5484d',
  forwarded: '#e5484d',
  cashout: '#ff4444',
  uses_device: '#f5a623',
  connects_via: '#8b5cf6',
  same_subnet: 'rgba(139, 92, 246, 0.4)',
};

function getNodeRadius(node) {
  if (node.risk_score >= 80) return 18;
  if (node.risk_score >= 50) return 14;
  return 10;
}

export default function GraphExplorer() {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [filter, setFilter] = useState('all');
  const simulationRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 600;

    // Clear previous
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Defs for glow filter and arrow markers
    const defs = svg.append('defs');

    // Glow filter
    const glowFilter = defs.append('filter').attr('id', 'glow');
    glowFilter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Arrow marker
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', 'rgba(229, 72, 77, 0.5)');

    // Filter nodes
    let filteredNodes = [...graphData.nodes];
    if (filter !== 'all') {
      filteredNodes = graphData.nodes.filter(n => n.type === filter);
    }
    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
    let filteredEdges = graphData.edges.filter(e =>
      filteredNodeIds.has(e.source?.id || e.source) && filteredNodeIds.has(e.target?.id || e.target)
    );

    // If filtering, also include connected nodes
    if (filter !== 'all') {
      const connectedIds = new Set();
      graphData.edges.forEach(e => {
        const sourceId = e.source?.id || e.source;
        const targetId = e.target?.id || e.target;
        if (filteredNodeIds.has(sourceId)) connectedIds.add(targetId);
        if (filteredNodeIds.has(targetId)) connectedIds.add(sourceId);
      });
      connectedIds.forEach(id => filteredNodeIds.add(id));
      filteredNodes = graphData.nodes.filter(n => filteredNodeIds.has(n.id));
      filteredEdges = graphData.edges.filter(e =>
        filteredNodeIds.has(e.source?.id || e.source) && filteredNodeIds.has(e.target?.id || e.target)
      );
    }

    const nodes = filteredNodes.map(d => ({ ...d }));
    const edges = filteredEdges.map(d => ({ ...d }));

    // Create zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.3, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);

    const g = svg.append('g');

    // Simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(edges).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => getNodeRadius(d) + 10));

    simulationRef.current = simulation;

    // Links
    const link = g.append('g')
      .selectAll('line')
      .data(edges)
      .join('line')
      .attr('stroke', d => EDGE_COLORS[d.relation] || 'rgba(255,255,255,0.1)')
      .attr('stroke-width', d => d.relation === 'cashout' ? 2.5 : d.relation === 'forwarded' ? 2 : 1.2)
      .attr('stroke-dasharray', d => d.relation === 'same_subnet' ? '4,4' : 'none')
      .attr('opacity', 0.6)
      .attr('marker-end', d => ['sent_to', 'forwarded', 'cashout'].includes(d.relation) ? 'url(#arrowhead)' : '');

    // Link labels
    const linkLabel = g.append('g')
      .selectAll('text')
      .data(edges.filter(e => e.amount))
      .join('text')
      .text(d => `₹${(d.amount / 1000).toFixed(0)}K`)
      .attr('fill', 'rgba(238, 234, 225, 0.4)')
      .attr('font-size', '8px')
      .attr('font-family', 'JetBrains Mono')
      .attr('text-anchor', 'middle');

    // Node groups
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    // Node glow (for high risk)
    node.filter(d => d.risk_score >= 70)
      .append('circle')
      .attr('r', d => getNodeRadius(d) + 6)
      .attr('fill', d => NODE_COLORS[d.type]?.fill || '#555')
      .attr('opacity', 0.15)
      .attr('filter', 'url(#glow)');

    // Node circles
    node.append('circle')
      .attr('r', d => getNodeRadius(d))
      .attr('fill', d => {
        const c = NODE_COLORS[d.type]?.fill || '#555';
        return d.risk_score >= 70 ? c : c + '88';
      })
      .attr('stroke', d => NODE_COLORS[d.type]?.stroke || '#777')
      .attr('stroke-width', d => d.risk_score >= 80 ? 2.5 : 1.5)
      .attr('opacity', d => d.risk_score >= 50 ? 1 : 0.7);

    // Node type icon
    node.append('text')
      .text(d => d.type === 'account' ? '👤' : d.type === 'device' ? '📱' : '🌐')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', d => getNodeRadius(d) * 0.8)
      .style('pointer-events', 'none');

    // Node label
    node.append('text')
      .text(d => d.label)
      .attr('dy', d => getNodeRadius(d) + 14)
      .attr('text-anchor', 'middle')
      .attr('fill', 'rgba(238, 234, 225, 0.7)')
      .attr('font-size', '9px')
      .attr('font-family', 'JetBrains Mono')
      .style('pointer-events', 'none');

    // Click handler
    node.on('click', (event, d) => {
      setSelectedNode(d);
      event.stopPropagation();
    });

    svg.on('click', () => setSelectedNode(null));

    // Tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      linkLabel
        .attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2 - 6);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => simulation.stop();
  }, [filter]);

  // Count connections for selected node
  const getConnections = (nodeId) => {
    return graphData.edges.filter(e => {
      const src = e.source?.id || e.source;
      const tgt = e.target?.id || e.target;
      return src === nodeId || tgt === nodeId;
    });
  };

  return (
    <div className="page animate-in">
      <div className="topbar">
        <div className="topbar-left">
          <h1>Graph Explorer</h1>
          <span className="tag red">RING-0092</span>
        </div>
        <div className="topbar-right">
          <div className="graph-filters">
            {['all', 'account', 'device', 'ip'].map(f => (
              <button
                key={f}
                className={`filter-btn ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? '◉ All' : f === 'account' ? '👤 Accounts' : f === 'device' ? '📱 Devices' : '🌐 IPs'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="graph-layout">
        <div className="graph-canvas-wrap" ref={containerRef}>
          <svg ref={svgRef} className="graph-svg" />
          <div className="graph-legend">
            <div className="legend-item"><span className="legend-circle" style={{ background: '#e5484d' }} /> Account</div>
            <div className="legend-item"><span className="legend-circle" style={{ background: '#f5a623' }} /> Device</div>
            <div className="legend-item"><span className="legend-circle" style={{ background: '#8b5cf6' }} /> IP Address</div>
            <div className="legend-line">
              <span className="legend-dash solid red" /> Transaction
            </div>
            <div className="legend-line">
              <span className="legend-dash solid orange" /> Device Link
            </div>
            <div className="legend-line">
              <span className="legend-dash dashed purple" /> Same Subnet
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div className={`graph-side-panel ${selectedNode ? 'open' : ''}`}>
          {selectedNode && (
            <>
              <div className="panel-header">
                <span className="panel-type-icon">
                  {selectedNode.type === 'account' ? '👤' : selectedNode.type === 'device' ? '📱' : '🌐'}
                </span>
                <div>
                  <div className="panel-title">{selectedNode.label}</div>
                  <div className="panel-subtitle">{selectedNode.id}</div>
                </div>
              </div>

              <div className="panel-section">
                <div className="panel-label">Risk Score</div>
                <div className="panel-score">
                  <span className={`risk-badge ${selectedNode.risk_score >= 80 ? 'critical' : selectedNode.risk_score >= 60 ? 'high' : selectedNode.risk_score >= 35 ? 'medium' : 'low'}`} style={{ fontSize: 12, padding: '5px 14px' }}>
                    <span className="dot" />
                    {selectedNode.risk_score}
                  </span>
                </div>
              </div>

              <div className="panel-section">
                <div className="panel-label">Type</div>
                <div className="tag" style={{ textTransform: 'uppercase' }}>{selectedNode.type}</div>
              </div>

              {selectedNode.bank && (
                <div className="panel-section">
                  <div className="panel-label">Bank</div>
                  <div className="panel-value">{selectedNode.bank}</div>
                </div>
              )}

              {selectedNode.city && (
                <div className="panel-section">
                  <div className="panel-label">City</div>
                  <div className="panel-value">{selectedNode.city}</div>
                </div>
              )}

              <div className="panel-section">
                <div className="panel-label">Connections ({getConnections(selectedNode.id).length})</div>
                <div className="panel-connections">
                  {getConnections(selectedNode.id).map((edge, i) => {
                    const otherId = (edge.source?.id || edge.source) === selectedNode.id
                      ? (edge.target?.id || edge.target)
                      : (edge.source?.id || edge.source);
                    const otherNode = graphData.nodes.find(n => n.id === otherId);
                    return (
                      <div className="connection-row" key={i}>
                        <span className="connection-icon">
                          {otherNode?.type === 'account' ? '👤' : otherNode?.type === 'device' ? '📱' : '🌐'}
                        </span>
                        <span className="connection-label">{otherNode?.label || otherId}</span>
                        <span className="connection-relation">{edge.relation.replace(/_/g, ' ')}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
