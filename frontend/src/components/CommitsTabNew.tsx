import React, { useState, useEffect, useMemo, useRef } from "react";
import { authService } from "../services/auth.service";
import { formatDistanceToNow } from "date-fns";
import {
  GitCommit,
  GitBranch,
  RefreshCw,
  ExternalLink,
  List as LayoutList,
  Network,
  Search,
  ChevronDown,
} from "lucide-react";

interface CommitAuthor {
  name: string;
  email: string;
  date: string;
  avatar?: string;
  username?: string;
}

interface CommitParent {
  sha: string;
  url: string;
}

interface Commit {
  sha: string;
  message: string;
  author: CommitAuthor;
  committer: {
    name: string;
    date: string;
  };
  parents: CommitParent[];
  url: string;
  verified: boolean;
  branchName?: string;
}

interface CommitsTabProps {
  repoFullName: string;
  branch?: string;
}

type ViewMode = "list" | "graph";

const GRAPH_COLORS = [
  "#22d3ee", // Cyan 400
  "#f472b6", // Pink 400
  "#a78bfa", // Violet 400
  "#fbbf24", // Amber 400
  "#34d399", // Emerald 400
  "#f87171", // Red 400
  "#60a5fa", // Blue 400
  "#fb923c", // Orange 400
  "#a3e635", // Lime 400
  "#e879f9", // Fuchsia 400
];

interface GraphNode extends Commit {
  x: number;
  y: number;
  lane: number;
  color: string;
}

export const CommitsTabNew: React.FC<CommitsTabProps> = ({
  repoFullName,
  branch,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [commits, setCommits] = useState<Commit[]>([]);
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterText, setFilterText] = useState("");
  const [selectedBranch, setSelectedBranch] = useState<string>(branch || "");
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const initialized = useRef(false);

  useEffect(() => {
    if (branch && !selectedBranch) {
      setSelectedBranch(branch);
    }
  }, [branch]);

  useEffect(() => {
    if (!repoFullName) return;
    initializeCommits();
  }, [repoFullName]);

  useEffect(() => {
    // If branch changes, we might want to refetch or ensure it's included
    if (selectedBranch && availableBranches.includes(selectedBranch)) {
      fetchCommitsForBranch(selectedBranch);
    }
  }, [selectedBranch]);

  // Use useMemo to filter commits based on search text
  const filteredCommits = useMemo(() => {
    let result = commits;
    // Note: We are currently merging all fetched commits.
    // If we want to filter by selected branch strictly, we'd need commit-to-branch mapping which is expensive to maintain perfectly.
    // For now, we show all "fetched" commits, which includes the selected branch.

    if (filterText) {
      const lower = filterText.toLowerCase();
      result = result.filter(
        (c) =>
          c.message.toLowerCase().includes(lower) ||
          c.author.name.toLowerCase().includes(lower) ||
          c.sha.toLowerCase().includes(lower),
      );
    }
    return result;
  }, [commits, filterText]);

  const fetchCommitsForBranch = async (branchName: string) => {
    if (!branchName) return;
    try {
      setLoading(true);
      const result = await authService.getRepositoryCommits(
        repoFullName,
        branchName,
      );

      setCommits((prev) => {
        const unique = new Map(prev.map((c) => [c.sha, c]));
        result.forEach((c: any) => {
          if (!unique.has(c.sha)) {
            const parents = c.parents || [];
            unique.set(c.sha, { ...c, parents, branchName });
          }
        });
        const sorted = Array.from(unique.values()).sort(
          (a, b) =>
            new Date(b.author.date).getTime() -
            new Date(a.author.date).getTime(),
        );
        // Recalculate graph
        calculateGraph(sorted);
        return sorted;
      });
      setLoading(false);
    } catch (e) {
      console.error("Error fetching branch commits", e);
      setError("Failed to fetch branch commits");
      setLoading(false);
    }
  };

  const initializeCommits = async () => {
    try {
      setLoading(true);
      setError("");

      // Fetch branches first
      const branches = await authService.getRepositoryBranches(repoFullName);
      setAvailableBranches(branches);

      if (!selectedBranch && branches.length > 0) {
        setSelectedBranch(
          branches.includes("main")
            ? "main"
            : branches.includes("master")
              ? "master"
              : branches[0],
        );
      }

      // Determine which branches to fetch initially
      const branchesToFetch = new Set<string>();
      if (selectedBranch) branchesToFetch.add(selectedBranch);
      else if (branch) branchesToFetch.add(branch);

      if (branches.includes("main")) branchesToFetch.add("main");
      if (branches.includes("master")) branchesToFetch.add("master");

      // Fetch initial set
      const uniqueCommits = new Map<string, Commit>();

      await Promise.all(
        Array.from(branchesToFetch).map(async (bName) => {
          try {
            const result = await authService.getRepositoryCommits(
              repoFullName,
              bName,
            );
            result.forEach((c: any) => {
              if (!uniqueCommits.has(c.sha)) {
                // Ensure parents exists
                const parents = c.parents || [];
                uniqueCommits.set(c.sha, { ...c, parents, branchName: bName });
              }
            });
          } catch (e) {
            console.error(`Failed to fetch branch ${bName}`, e);
          }
        }),
      );

      const sorted = Array.from(uniqueCommits.values()).sort(
        (a, b) =>
          new Date(b.author.date).getTime() - new Date(a.author.date).getTime(),
      );

      setCommits(sorted);
      calculateGraph(sorted);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "Failed to fetch commits");
      setLoading(false);
    }
  };

  const calculateGraph = (sortedCommits: Commit[]) => {
    const lanes: (string | null)[] = [];
    const nodes: GraphNode[] = [];
    const ROW_HEIGHT = 50;
    const COL_WIDTH = 24;

    sortedCommits.forEach((commit, index) => {
      // Find a lane
      let laneIndex = -1;

      // Check if this commit maps to an active lane (i.e., is a parent of a previously processed commit)
      // Since we process children first, we look for a lane that "expects" this SHA.
      for (let i = 0; i < lanes.length; i++) {
        if (lanes[i] === commit.sha) {
          laneIndex = i;
          break;
        }
      }

      if (laneIndex === -1) {
        // No existing lane expects this commit. Assign a new empty lane.
        // Prefer reusing empty slots.
        for (let i = 0; i < lanes.length; i++) {
          if (lanes[i] === null) {
            laneIndex = i;
            break;
          }
        }
        if (laneIndex === -1) {
          laneIndex = lanes.length;
          lanes.push(null);
        }
      }

      // Consumed this expectation.
      lanes[laneIndex] = null;

      // Set parents' expectations
      if (commit.parents && commit.parents.length > 0) {
        // First parent continues the lane
        const firstParent = commit.parents[0].sha;
        // If current lane is taken by someone else logic...
        // Simple: just set it. If overwritten, it means merge/branch complexity handled by order.
        if (lanes[laneIndex] === null || lanes[laneIndex] === firstParent) {
          lanes[laneIndex] = firstParent;
        } else {
          // Conflict? Move to new lane?
          // Simplification: just overwrite for visualization continuity.
          // Or find another lane for the *current* expectation if we are branching?
          // Actually, if we are branching from parent, parent has multiple children.
        }

        // Other parents (merge sources)
        for (let p = 1; p < commit.parents.length; p++) {
          const parentSha = commit.parents[p].sha;
          // Assign a lane for this parent if not already there
          let found = false;
          for (let l = 0; l < lanes.length; l++) {
            if (lanes[l] === parentSha) {
              found = true;
              break;
            }
          }
          if (!found) {
            // Find free lane
            let free = -1;
            for (let l = 0; l < lanes.length; l++) {
              if (lanes[l] === null) {
                free = l;
                break;
              }
            }
            if (free === -1) {
              free = lanes.length;
              lanes.push(null);
            }
            lanes[free] = parentSha;
          }
        }
      }

      nodes.push({
        ...commit,
        lane: laneIndex,
        x: laneIndex * COL_WIDTH + 20,
        y: index * ROW_HEIGHT + ROW_HEIGHT / 2,
        color: GRAPH_COLORS[laneIndex % GRAPH_COLORS.length],
      });
    });

    setGraphNodes(nodes);
  };

  const getCommitMessagePreview = (msg: string) => msg.split("\n")[0];

  const renderGraph = () => {
    // Show only first 10 nodes for performance/view (as requested by user)
    // but we can make this adjustable later if needed.
    const visibleNodes = graphNodes.slice(0, 10);
    const hasMore = graphNodes.length > 10;

    // Map SHA -> coordinates for drawing lines
    // We Map ALL nodes because a visible node might parent to a node that is just outside the view
    // But if we only render 10, we can't draw lines to non-existent nodes in the SVG space effectively without them looking like they go nowhere.
    // However, if we clip the graph, valid lines strictly between visible nodes are safe.
    // Lines to parents outside visible scope will just point to "nowhere" if we use their real-calculated Y.
    // Since Y is index * ROW_HEIGHT, the 11th node is just below the 10th. It might look fine to have lines going down off-screen.
    // So let's map all nodes for coordinates.
    const nodeMap = new Map<string, { x: number; y: number }>();
    graphNodes.forEach((n) => nodeMap.set(n.sha, { x: n.x, y: n.y }));

    return (
      <div className="border border-gray-800 rounded-xl bg-black/40 overflow-hidden shadow-sm relative backdrop-blur-sm">
        <div className="overflow-x-auto">
          <div
            className="relative"
            style={{
              // Height accommodates visible nodes + extra space for the "View More" link
              minHeight: Math.max(
                300,
                visibleNodes.length * 50 + (hasMore ? 80 : 0),
              ),
              minWidth: 600,
            }}
          >
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
              {visibleNodes.map((node) => {
                return node.parents.map((parent) => {
                  const target = nodeMap.get(parent.sha);

                  // If target exists (it should since we mapped all graphNodes)
                  if (!target) return null;

                  // Optimization: If target is far below visible area, maybe clamp it?
                  // But SVG handles large coordinates fine.

                  // Draw Bezier
                  const midY = (node.y + target.y) / 2;
                  const path =
                    node.x === target.x
                      ? `M ${node.x} ${node.y} L ${target.x} ${target.y}`
                      : `M ${node.x} ${node.y} C ${node.x} ${midY}, ${target.x} ${midY}, ${target.x} ${target.y}`;

                  return (
                    <path
                      key={`${node.sha}-${parent.sha}`}
                      d={path}
                      stroke={node.color}
                      strokeWidth={2}
                      fill="none"
                      strokeOpacity={0.6}
                    />
                  );
                });
              })}
            </svg>

            {visibleNodes.map((node) => (
              <div
                key={node.sha}
                className="absolute w-full group hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors flex items-center pr-4"
                style={{ top: node.y - 25, height: 50 }}
              >
                <div
                  className="absolute z-10 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 shadow-sm"
                  style={{ left: node.x - 6, backgroundColor: node.color }}
                  title={node.sha}
                />

                <div
                  className="flex-1 flex items-center gap-4"
                  style={{
                    marginLeft:
                      Math.max(
                        4,
                        Math.max(...graphNodes.map((n) => n.lane)) + 1,
                      ) *
                        24 +
                      60,
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 rounded">
                        {node.sha.substring(0, 7)}
                      </span>
                      <span
                        className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate"
                        title={node.message}
                      >
                        {getCommitMessagePreview(node.message)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                      <span>{node.author.name}</span>
                      <span>•</span>
                      <span>
                        {formatDistanceToNow(new Date(node.author.date), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>

                  <a
                    href={node.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-blue-500 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}

            {hasMore ? (
              <div
                className="absolute w-full flex justify-center items-center pb-8 pt-12 bg-gradient-to-t from-gray-900/90 to-transparent pointer-events-auto"
                style={{ top: visibleNodes.length * 50 }}
              >
                <a
                  href={`https://github.com/${repoFullName}/commits/${selectedBranch || branch}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-full shadow-lg transition-all transform hover:scale-105"
                >
                  View older commits on GitHub{" "}
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  const renderList = () => (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          className="w-full pl-10 pr-4 py-1.5 bg-black/20 border border-gray-800 rounded-lg text-sm text-gray-200 focus:ring-1 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-600"
          placeholder="Search history..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        {filteredCommits.map((commit) => (
          <div
            key={commit.sha}
            className="group bg-black/20 p-3 rounded-lg border border-gray-800 hover:border-gray-700 hover:bg-black/30 transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 pt-0.5">
                {commit.author.avatar ? (
                  <img
                    src={commit.author.avatar}
                    alt={commit.author.name}
                    className="w-8 h-8 rounded-full bg-gray-800"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-900/40 flex items-center justify-center text-blue-400 font-bold text-xs ring-1 ring-blue-900/60">
                    {commit.author.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <h4 className="text-sm font-medium text-gray-200 truncate pr-4">
                    {getCommitMessagePreview(commit.message)}
                  </h4>
                  <span className="flex-shrink-0 text-[10px] text-gray-500 whitespace-nowrap">
                    {formatDistanceToNow(new Date(commit.author.date), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                {/* <p className="text-xs text-gray-500 mb-1.5 line-clamp-1">
                  {commit.message}
                </p> */}
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-900 text-[10px] font-mono text-gray-400 border border-gray-800">
                    <GitCommit className="w-2.5 h-2.5" />
                    {commit.sha.substring(0, 7)}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-gray-500">
                    {commit.author.name}
                  </div>
                  <div className="flex-1" />
                  <a
                    href={commit.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] font-medium text-blue-400 hover:text-blue-300 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    GitHub <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-gray-400">
        <RefreshCw className="w-8 h-8 animate-spin mb-3 text-blue-500" />
        <p className="text-sm">Loading repository history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm text-center">
        {error}
        <button
          onClick={initializeCommits}
          className="block mx-auto mt-2 font-medium hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between bg-black/40 p-2 rounded-lg border border-gray-800 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-2 px-2">
          <GitBranch className="w-5 h-5 text-gray-500" />
          <div className="relative group">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="appearance-none bg-transparent text-sm font-medium text-gray-200 outline-none cursor-pointer pr-8 py-1 hover:text-white transition-colors"
            >
              {availableBranches.length > 0 ? (
                availableBranches.map((b) => (
                  <option
                    key={b}
                    value={b}
                    className="bg-gray-900 text-gray-200"
                  >
                    {b}
                  </option>
                ))
              ) : (
                <option value={branch} className="bg-gray-900 text-gray-200">
                  {branch || "Default"}
                </option>
              )}
            </select>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
              <ChevronDown className="w-3 h-3" />
            </div>
          </div>
          <span className="text-xs text-gray-600">•</span>
          <span className="text-xs text-gray-500">
            {commits.length} commits
          </span>
        </div>

        <div className="flex bg-gray-900/50 rounded-md p-1 border border-gray-800">
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-all ${viewMode === "list" ? "bg-gray-800 text-blue-400 shadow-sm border border-gray-700" : "text-gray-500 hover:text-gray-300"}`}
          >
            <LayoutList className="w-3.5 h-3.5" /> List
          </button>
          <button
            onClick={() => setViewMode("graph")}
            className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-all ${viewMode === "graph" ? "bg-gray-800 text-blue-400 shadow-sm border border-gray-700" : "text-gray-500 hover:text-gray-300"}`}
          >
            <Network className="w-3.5 h-3.5" /> Graph
          </button>
        </div>
      </div>

      <div className="animate-in fade-in duration-300">
        {viewMode === "list" ? renderList() : renderGraph()}
      </div>
    </div>
  );
};
