import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { zoom, zoomIdentity, ZoomBehavior } from "d3-zoom";
import { select, Selection } from "d3-selection";
import "d3-transition";
import {
  aiService,
  type TaskRoadmap,
  type StepExecutionDetail,
  type RoadmapStep,
} from "../services/ai.service";
import type { Task } from "../types";

interface TaskRoadmapViewProps {
  task: Task;
  onClose: () => void;
}

interface Node {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  data: RoadmapStep;
}

export const TaskRoadmapView: React.FC<TaskRoadmapViewProps> = ({
  task,
  onClose,
}) => {
  const [roadmap, setRoadmap] = useState<TaskRoadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [selectedStep, setSelectedStep] = useState<{
    stepTitle: string;
    stepDescription: string;
  } | null>(null);
  const [stepDetail, setStepDetail] = useState<StepExecutionDetail | null>(
    null,
  );
  const [loadingDetail, setLoadingDetail] = useState(false);

  // D3 Zoom State
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<HTMLDivElement, unknown> | null>(
    null,
  );
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });

  const loadRoadmap = useCallback(async () => {
    setLoading(true);
    try {
      // Try to get cached roadmap first
      let roadmapData = await aiService.getCachedRoadmap(task.id);

      if (!roadmapData) {
        // Generate new roadmap
        roadmapData = await aiService.generateTaskRoadmap(
          task.id,
          task.title,
          task.description || "",
          task.taskType,
        );
        // Cache it
        aiService.cacheRoadmap(roadmapData);
      }

      setRoadmap(roadmapData);
    } catch {
      // MOCK DATA FALLBACK
      setRoadmap({
        taskId: task.id,
        generatedAt: new Date().toISOString(),
        steps: [
          {
            id: "1",
            title: "Project Initialization",
            description:
              "Set up the project structure and initial configuration.",
            status: "pending",
            type: "backend",
            order: 1,
            estimatedTime: "2h",
            dependencies: [],
          },
          {
            id: "2",
            title: "Database Schema Design",
            description:
              "Design and implement the database schema for the project.",
            status: "pending",
            type: "database",
            order: 2,
            estimatedTime: "4h",
            dependencies: ["1"],
          },
          {
            id: "3",
            title: "API Development",
            description: "Develop the core API endpoints for the application.",
            status: "pending",
            type: "backend",
            order: 3,
            estimatedTime: "8h",
            dependencies: ["2"],
          },
          {
            id: "4",
            title: "Frontend Integration",
            description:
              "Integrate the backend APIs with the frontend user interface.",
            status: "pending",
            type: "frontend",
            order: 4,
            estimatedTime: "6h",
            dependencies: ["3"],
          },
          {
            id: "5",
            title: "Testing & Deployment",
            description:
              "Run unit tests and deploy the application to the staging server.",
            status: "pending",
            type: "devops",
            order: 5,
            estimatedTime: "3h",
            dependencies: ["4"],
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  }, [task.id, task.title, task.description, task.taskType]);

  const loadCompletedSteps = useCallback(() => {
    const saved = localStorage.getItem(`completed_steps_${task.id}`);
    if (saved) {
      setCompletedSteps(new Set(JSON.parse(saved)));
    }
  }, [task.id]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    loadRoadmap();
    loadCompletedSteps();
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [loadRoadmap, loadCompletedSteps]);

  // Setup D3 Zoom
  useEffect(() => {
    if (!containerRef.current) return;

    const zoomBehavior: ZoomBehavior<HTMLDivElement, unknown> = zoom<
      HTMLDivElement,
      unknown
    >()
      .scaleExtent([0.5, 1.5]) // Stricter limits to prevent infinite zooming sensation
      .on("zoom", (event) => {
        setTransform({
          x: event.transform.x,
          y: event.transform.y,
          k: event.transform.k,
        });
      })
      .filter((event) => {
        // Standard filter but block dblclick
        return (
          (!event.ctrlKey || event.type === "wheel") &&
          !event.button &&
          event.type !== "dblclick"
        );
      });

    zoomBehaviorRef.current = zoomBehavior;

    const selection: Selection<HTMLDivElement, unknown, null, undefined> =
      select(containerRef.current);
    selection.call(zoomBehavior).on("dblclick.zoom", null); // Explicitly disable double click zoom

    // Initial center position (rough estimation)
    const initialX = window.innerWidth / 2 - 200;
    const initialY = window.innerHeight / 2 - 100;
    selection.call(
      zoomBehavior.transform,
      zoomIdentity.translate(initialX, initialY).scale(1),
    );

    return () => {
      selection.on(".zoom", null);
      zoomBehaviorRef.current = null;
    };
  }, [loading]);

  const toggleStepComplete = (stepId: string) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(stepId)) {
      newCompleted.delete(stepId);
    } else {
      newCompleted.add(stepId);
    }
    setCompletedSteps(newCompleted);
    localStorage.setItem(
      `completed_steps_${task.id}`,
      JSON.stringify(Array.from(newCompleted)),
    );
  };

  const calculateProgress = () => {
    if (!roadmap) return 0;
    return Math.round((completedSteps.size / roadmap.steps.length) * 100);
  };

  const handleStepClick = async (
    stepTitle: string,
    stepDescription: string,
  ) => {
    setSelectedStep({ stepTitle, stepDescription });
    setStepDetail(null);
    setLoadingDetail(true);

    try {
      const detail = await aiService.expandRoadmapStep(
        task.id,
        task.title,
        task.description || "",
        task.taskType,
        stepTitle,
        stepDescription,
      );
      setStepDetail(detail);
    } catch {
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeStepDetail = () => {
    setSelectedStep(null);
    setStepDetail(null);
  };

  const getIconForType = (type?: string) => {
    switch (type) {
      case "frontend":
        return "🎨";
      case "backend":
        return "⚡";
      case "database":
        return "🗄️";
      case "devops":
        return "🚀";
      default:
        return "📋";
    }
  };

  const getTypeColor = (type?: string) => {
    switch (type) {
      case "frontend":
        return "bg-purple-500";
      case "backend":
        return "bg-blue-500";
      case "database":
        return "bg-green-500";
      case "devops":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };

  // Layout Calculation - Simple Horizontal for now
  const nodes: Node[] = useMemo(() => {
    if (!roadmap) return [];

    // Basic Layout Strategy: Horizontal Flow
    const spacingX = 320;
    const startX = 50;
    const startY = 50;

    return roadmap.steps.map((step, index) => ({
      id: step.id,
      x: startX + index * spacingX,
      y: startY,
      width: 280,
      height: 160,
      data: step,
    }));
  }, [roadmap]);

  return (
    <div className="fixed inset-0 bg-slate-50 z-50 overflow-hidden flex flex-col font-sans">
      {/* Background - Dot Pattern */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          // N8N-style: Fixed dot size (1.5px), dynamic gap (via backgroundSize)
          // Using a slightly darker dot (#94a3b8) but small radius for crispness
          backgroundImage:
            "radial-gradient(circle, #94a3b8 1px, transparent 1px)",
          backgroundSize: `${20 * transform.k}px ${20 * transform.k}px`,
          backgroundPosition: `${transform.x}px ${transform.y}px`,
          opacity: 0.4, // Subtle visibility
        }}
      />

      {/* Header - Floating Professional Bar */}
      <div className="absolute top-0 left-0 right-0 z-40 p-4 pointer-events-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto">
          <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-4 py-3 flex items-center gap-4 text-slate-800">
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 rounded-md transition text-slate-400 hover:text-slate-600"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </button>
            <div className="h-6 w-px bg-slate-200"></div>
            <div>
              <h1 className="font-bold text-sm tracking-wide">{task.title}</h1>
              <p className="text-xs text-slate-400">Workflow View</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-4 py-3 flex items-center gap-6 text-slate-800 min-w-[300px]">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-400">Progress</span>
                <span className="font-bold text-blue-500">
                  {calculateProgress()}%
                </span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${calculateProgress()}%` }}
                ></div>
              </div>
            </div>
            <button
              onClick={() => {
                aiService.clearCache(task.id);
                loadRoadmap();
              }}
              className="text-slate-400 hover:text-blue-500 transition"
              title="Refresh Roadmap"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing relative z-10"
      >
        <div
          className="absolute top-0 left-0 w-full h-full origin-top-left"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`,
            width: "100%",
            height: "100%",
          }}
        >
          {loading ? (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span className="text-gray-400 font-mono text-sm">
                Initializing Workflow...
              </span>
            </div>
          ) : (
            <>
              {/* SVG Layer for Edges */}
              <svg
                className="absolute top-0 left-0 overflow-visible pointer-events-none"
                width="100%"
                height="100%"
              >
                {nodes.map((node, i) => {
                  // Use dependencies to draw lines? For now, linear is simplest visual
                  if (i === nodes.length - 1) return null;
                  const nextNode = nodes[i + 1];

                  // Calculate start and end points
                  const startX = node.x + node.width;
                  const startY = node.y + node.height / 2; // Center of right side
                  const endX = nextNode.x;
                  const endY = nextNode.y + node.height / 2; // Center of left side

                  // Bezier Curve
                  const controlPoint1X = startX + (endX - startX) / 2;
                  const controlPoint1Y = startY;
                  const controlPoint2X = endX - (endX - startX) / 2;
                  const controlPoint2Y = endY;

                  const pathData = `M ${startX} ${startY} C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${endX} ${endY}`;
                  const isCompleted = completedSteps.has(node.data.id);
                  const nextIsCompleted = completedSteps.has(nextNode.data.id);

                  // Also color the path if the first node is completed, to show "flow" to next?
                  // Standard: Path is active if semantic connection used. Here we highlight green if 'source' is done.
                  const strokeColor = isCompleted ? "#334155" : "#cbd5e1";

                  return (
                    <g key={`edge-${i}`}>
                      <path
                        d={pathData}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={2}
                        className="transition-colors duration-300"
                      />
                      <circle
                        cx={startX}
                        cy={startY}
                        r={3}
                        fill={strokeColor}
                      />
                      <circle cx={endX} cy={endY} r={3} fill={strokeColor} />
                    </g>
                  );
                })}
              </svg>

              {/* HTML Layer for Nodes */}
              {nodes.map((node) => {
                const isCompleted = completedSteps.has(node.data.id);
                const isSelected =
                  selectedStep && selectedStep.stepTitle === node.data.title;
                return (
                  <div
                    key={node.id}
                    className="absolute"
                    style={{
                      left: node.x,
                      top: node.y,
                      width: node.width,
                    }}
                  >
                    <div
                      className={`
                                        group relative rounded-xl bg-white border-2 transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1
                                        ${isCompleted ? "border-slate-800 shadow-slate-300" : "border-slate-200 hover:border-slate-400"}
                                        ${isSelected ? "ring-2 ring-slate-800 scale-105" : ""}
                                    `}
                      onClick={() =>
                        handleStepClick(node.data.title, node.data.description)
                      }
                    >
                      {/* Header Strip - Removed for simple cards */}
                      {/* <div className={`h-1.5 w-full ${getTypeColor(node.data.type)}`}></div> */}

                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">
                              {/* Keep icon for context but color is removed from strip */}
                              {getIconForType(node.data.type)}
                            </span>
                            {/* Simple tag without categorical color */}
                            {node.data.type && (
                              <span className="text-[10px] font-bold tracking-widest uppercase text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                {node.data.type}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStepComplete(node.data.id);
                            }}
                            className={`
                                                  w-5 h-5 rounded-full border flex items-center justify-center transition-all
                                                  ${
                                                    isCompleted
                                                      ? "bg-slate-800 border-slate-800 text-white"
                                                      : "bg-transparent border-slate-300 text-transparent hover:border-slate-500"
                                                  }
                                              `}
                          >
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </button>
                        </div>

                        <h3 className="font-bold text-slate-800 mb-2 leading-tight">
                          {node.data.title}
                        </h3>
                        <p className="text-slate-500 text-xs line-clamp-3 leading-relaxed">
                          {node.data.description}
                        </p>

                        {/* Inputs/Outputs Pseudo-visuals */}
                        <div className="absolute top-1/2 -left-1 w-2 h-2 rounded-full bg-slate-200"></div>
                        <div className="absolute top-1/2 -right-1 w-2 h-2 rounded-full bg-slate-200"></div>
                      </div>

                      {/* Action Footer */}
                      <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-mono">
                          ID: {node.data.id}
                        </span>
                        {isCompleted && (
                          <span className="text-[10px] text-slate-700 font-bold">
                            COMPLETED
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Helper Controls (Bottom Right) */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-40">
        {/* Zoom In */}
        <button
          className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 shadow-lg"
          onClick={() => {
            if (!containerRef.current || !zoomBehaviorRef.current) return;
            select(containerRef.current)
              .transition()
              .duration(300)
              .call(zoomBehaviorRef.current.scaleBy, 1.2);
          }}
          title="Zoom In"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>

        {/* Zoom Out */}
        <button
          className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 shadow-lg"
          onClick={() => {
            if (!containerRef.current || !zoomBehaviorRef.current) return;
            select(containerRef.current)
              .transition()
              .duration(300)
              .call(zoomBehaviorRef.current.scaleBy, 0.8);
          }}
          title="Zoom Out"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 12H4"
            />
          </svg>
        </button>

        {/* Fit to Content */}
        <button
          className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 shadow-lg"
          onClick={() => {
            if (
              !containerRef.current ||
              !zoomBehaviorRef.current ||
              nodes.length === 0
            )
              return;

            // Calculate bounding box of all nodes
            const minX = Math.min(...nodes.map((n) => n.x));
            const maxX = Math.max(...nodes.map((n) => n.x + n.width));
            const minY = Math.min(...nodes.map((n) => n.y));
            const maxY = Math.max(...nodes.map((n) => n.y + n.height));

            const width = maxX - minX;
            const height = maxY - minY;
            const padding = 100; // Padding around the content

            const clientWidth = containerRef.current.clientWidth;
            const clientHeight = containerRef.current.clientHeight;

            // Calculate scale to fit
            const scaleX = (clientWidth - padding * 2) / width;
            const scaleY = (clientHeight - padding * 2) / height;
            const scale = Math.min(scaleX, scaleY);
            const clampedScale = Math.min(Math.max(scale, 0.5), 1.5); // Respect strictly limited zoom levels

            // Center
            const centerX = minX + width / 2;
            const centerY = minY + height / 2;

            const x = clientWidth / 2 - centerX * clampedScale;
            const y = clientHeight / 2 - centerY * clampedScale;

            select(containerRef.current)
              .transition()
              .duration(750)
              .call(
                zoomBehaviorRef.current.transform,
                zoomIdentity.translate(x, y).scale(clampedScale),
              );
          }}
          title="Fit to Content"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8V4m0 0h4M20 8V4m0 0h-4M4 16v4m0 0h4M20 16v4m0 0h-4"
            />
          </svg>
        </button>

        {/* Reset View */}
        <button
          className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 shadow-lg"
          onClick={() => {
            if (!containerRef.current || !zoomBehaviorRef.current) return;
            select(containerRef.current)
              .transition()
              .duration(750)
              .call(
                zoomBehaviorRef.current.transform,
                zoomIdentity
                  .translate(
                    window.innerWidth / 2 - 200,
                    window.innerHeight / 2 - 100,
                  )
                  .scale(1),
              );
          }}
          title="Reset View"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
        </button>
      </div>

      {/* Step Detail Modal - Light Mode Adaptation */}
      {selectedStep && (
        <div className="fixed inset-0 bg-slate-900/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col text-slate-800">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h2 className="text-xl font-bold text-blue-500">
                {selectedStep.stepTitle}
              </h2>
              <button
                onClick={closeStepDetail}
                className="p-2 hover:bg-slate-200 rounded-full transition text-slate-400 hover:text-slate-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-6 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-3"></div>
                    <p className="text-slate-500 text-sm">
                      Generating detailed execution guide...
                    </p>
                  </div>
                </div>
              ) : stepDetail ? (
                <div className="space-y-6">
                  {/* Step Goal */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-sm font-bold text-blue-500 uppercase tracking-wide mb-2">
                      Goal
                    </h3>
                    <p className="text-blue-900 font-medium">
                      {stepDetail.stepGoal}
                    </p>
                  </div>

                  {/* Detailed Actions */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">
                      Detailed Actions
                    </h3>
                    <div className="space-y-4">
                      {stepDetail.detailedActions.map((action, idx) => (
                        <div
                          key={idx}
                          className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg">
                              {idx + 1}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-slate-900 mb-1">
                                {action.action}
                              </h4>
                              <p className="text-slate-600 text-sm mb-2">
                                {action.howToExecute}
                              </p>
                              <div className="bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs">
                                <span className="text-slate-500 font-bold uppercase">
                                  Output
                                </span>
                                <p className="text-slate-700 mt-1">
                                  {action.output}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tools & Resources */}
                  {stepDetail.toolsOrResources.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">
                        Tools & Resources
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {stepDetail.toolsOrResources.map((tool, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-white text-slate-600 text-sm rounded-full border border-slate-200 shadow-sm"
                          >
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Common Pitfalls */}
                    {stepDetail.commonPitfalls.length > 0 && (
                      <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                        <h3 className="text-sm font-bold text-red-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                          <span>⚠️</span> Pitfalls
                        </h3>
                        <ul className="space-y-2">
                          {stepDetail.commonPitfalls.map((pitfall, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2 text-sm text-slate-600"
                            >
                              <span className="text-red-500 mt-0.5">•</span>
                              <span>{pitfall}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Done When */}
                    {stepDetail.doneWhen.length > 0 && (
                      <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                        <h3 className="text-sm font-bold text-green-600 uppercase tracking-wide mb-2 flex items-center gap-2">
                          <span>✅</span> Success Criteria
                        </h3>
                        <ul className="space-y-2">
                          {stepDetail.doneWhen.map((condition, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2 text-sm text-slate-600"
                            >
                              <span className="text-green-500 mt-0.5">•</span>
                              <span>{condition}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <p>Failed to load step details. Please try again.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
