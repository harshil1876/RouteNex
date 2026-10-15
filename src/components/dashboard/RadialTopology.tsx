import React, { useState } from 'react';

interface RadialNode {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'recent' | 'error';
  angle: number; // in degrees
  distance: number;
}

export default function RadialTopology({ onSelectNode }: { onSelectNode?: (id: string) => void }) {
  const [zoom, setZoom] = useState(1);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const nodes: RadialNode[] = [
    { id: 'opencode', name: 'OpenCode Free', type: 'Zero-Key', status: 'active', angle: 0, distance: 160 },
    { id: 'openrouter', name: 'OpenRouter', type: ':free & BYOK', status: 'active', angle: 45, distance: 165 },
    { id: 'antigravity-cli', name: 'Antigravity CLI', type: 'OAuth 2.0', status: 'active', angle: 90, distance: 160 },
    { id: 'nvidia', name: 'NVIDIA NIM', type: '1K Credits', status: 'recent', angle: 135, distance: 170 },
    { id: 'antigravity', name: 'Antigravity', type: 'Cloud Agent', status: 'active', angle: 180, distance: 160 },
    { id: 'groq', name: 'Groq LPU', type: '30 RPM Free', status: 'active', angle: 225, distance: 165 },
    { id: 'mistral', name: 'Mistral AI', type: '1B Tokens/mo', status: 'recent', angle: 270, distance: 160 },
    { id: 'cerebras', name: 'Cerebras', type: '1M Tokens/day', status: 'active', angle: 315, distance: 165 },
  ];

  const centerX = 240;
  const centerY = 200;

  const handleZoomIn = () => setZoom((z) => Math.min(1.5, z + 0.15));
  const handleZoomOut = () => setZoom((z) => Math.max(0.6, z - 0.15));
  const handleZoomReset = () => setZoom(1);

  return (
    <div className="relative w-full h-[410px] bg-[#0c0f18] rounded-xl border border-[#222738] overflow-hidden select-none">
      {/* Background Engineering Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1b203018_1px,transparent_1px),linear-gradient(to_bottom,#1b203018_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

      {/* Top Header / Legend */}
      <div className="absolute top-3 left-4 right-4 flex items-center justify-between z-10 text-[11px] font-mono pointer-events-auto">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-white tracking-tight flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            Radial Provider Topology
          </span>
          <div className="hidden sm:flex items-center gap-2.5 text-[#7d8597]">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Active
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Recent
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Error
            </span>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-[#141824] border border-[#222738] rounded-lg p-0.5 shadow-sm">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-6 h-6 flex items-center justify-center text-xs text-[#8f96a3] hover:text-white hover:bg-[#1f2638] rounded transition-colors"
            title="Zoom In"
          >
            +
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-6 h-6 flex items-center justify-center text-xs text-[#8f96a3] hover:text-white hover:bg-[#1f2638] rounded transition-colors"
            title="Zoom Out"
          >
            -
          </button>
          <button
            type="button"
            onClick={handleZoomReset}
            className="px-1.5 h-6 flex items-center justify-center text-[10px] text-[#8f96a3] hover:text-white hover:bg-[#1f2638] rounded transition-colors"
            title="Fit / Reset Zoom"
          >
            [ ]
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div
        className="w-full h-full flex items-center justify-center transition-transform duration-200 ease-out"
        style={{ transform: `scale(${zoom})` }}
      >
        <svg
          viewBox="0 0 480 400"
          className="w-full h-full max-w-[480px] max-h-[400px] overflow-visible"
        >
          <defs>
            <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="curveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Central Pulse Halo */}
          <circle cx={centerX} cy={centerY} r="54" fill="url(#hubGlow)" className="animate-pulse" />

          {/* Concentric Guide Rings */}
          <circle cx={centerX} cy={centerY} r="90" fill="none" stroke="#222738" strokeDasharray="3 3" />
          <circle cx={centerX} cy={centerY} r="160" fill="none" stroke="#222738" strokeDasharray="4 4" />

          {/* Cubic Bezier Curved Lines to Nodes */}
          {nodes.map((node) => {
            const rad = (node.angle * Math.PI) / 180;
            const targetX = centerX + Math.cos(rad) * node.distance;
            const targetY = centerY + Math.sin(rad) * node.distance;

            // Control points for organic cubic bezier curve
            const midDistance = node.distance * 0.55;
            const cp1X = centerX + Math.cos(rad - 0.25) * midDistance;
            const cp1Y = centerY + Math.sin(rad - 0.25) * midDistance;
            const cp2X = centerX + Math.cos(rad + 0.15) * (midDistance * 1.1);
            const cp2Y = centerY + Math.sin(rad + 0.15) * (midDistance * 1.1);

            const isHovered = hoveredNode === node.id;

            return (
              <g key={`edge-${node.id}`}>
                <path
                  d={`M ${centerX} ${centerY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${targetX} ${targetY}`}
                  fill="none"
                  stroke={isHovered ? '#c084fc' : '#493774'}
                  strokeWidth={isHovered ? 2.5 : 1.25}
                  strokeOpacity={isHovered ? 0.9 : 0.6}
                  className="transition-all duration-300"
                />
                {/* Moving Particle Dot on Active Lines */}
                {node.status === 'active' && (
                  <circle r="2.5" fill="#c084fc">
                    <animateMotion
                      path={`M ${centerX} ${centerY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${targetX} ${targetY}`}
                      dur={`${3 + (node.angle % 3)}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
              </g>
            );
          })}

          {/* Outer Provider Nodes */}
          {nodes.map((node) => {
            const rad = (node.angle * Math.PI) / 180;
            const targetX = centerX + Math.cos(rad) * node.distance;
            const targetY = centerY + Math.sin(rad) * node.distance;
            const isHovered = hoveredNode === node.id;

            const statusDotColor =
              node.status === 'active' ? '#34d399' : node.status === 'recent' ? '#fbbf24' : '#f87171';

            return (
              <g
                key={`node-${node.id}`}
                transform={`translate(${targetX}, ${targetY})`}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => onSelectNode?.(node.id)}
              >
                {/* Node Pill Background */}
                <rect
                  x="-52"
                  y="-16"
                  width="104"
                  height="32"
                  rx="16"
                  fill="#141825"
                  stroke={isHovered ? '#a855f7' : '#2b344a'}
                  strokeWidth={isHovered ? 1.5 : 1}
                  className="transition-all duration-200"
                />

                {/* Status Dot */}
                <circle cx="-38" cy="0" r="3.5" fill={statusDotColor} />

                {/* Text Label */}
                <text
                  x="-28"
                  y="-1"
                  fill="#ffffff"
                  fontSize="9.5"
                  fontWeight="600"
                  fontFamily="monospace"
                >
                  {node.name.length > 11 ? node.name.slice(0, 11) + '..' : node.name}
                </text>
                <text
                  x="-28"
                  y="9"
                  fill="#7d8597"
                  fontSize="7.5"
                  fontFamily="monospace"
                >
                  {node.type}
                </text>
              </g>
            );
          })}

          {/* Central RouteNex Hub Node */}
          <g transform={`translate(${centerX}, ${centerY})`}>
            <circle
              r="28"
              fill="url(#curveGrad)"
              stroke="#c084fc"
              strokeWidth="2"
              className="shadow-xl"
            />
            <circle r="34" fill="none" stroke="#9333ea" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
            <text
              textAnchor="middle"
              y="-2"
              fill="#ffffff"
              fontSize="10"
              fontWeight="bold"
              fontFamily="monospace"
            >
              RouteNex
            </text>
            <text
              textAnchor="middle"
              y="10"
              fill="#e9d5ff"
              fontSize="7"
              fontWeight="medium"
              fontFamily="monospace"
            >
              CORE HUB
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}
