import React, { useState, useEffect } from "react";
import { authService } from "../services/auth.service";

interface CommitAuthor {
  name: string;
  email: string;
  date: string;
  avatar?: string;
  username?: string;
}

interface Commit {
  sha: string;
  message: string;
  author: CommitAuthor;
  committer: {
    name: string;
    date: string;
  };
  url: string;
  verified: boolean;
}

interface BranchCommits {
  branchName: string;
  commits: Commit[];
}

interface CommitsTabProps {
  repoFullName: string;
  branch?: string;
}

type ViewMode = "list" | "graph";

export const CommitsTab: React.FC<CommitsTabProps> = ({
  repoFullName,
  branch,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [commits, setCommits] = useState<Commit[]>([]);
  const [branchesData, setBranchesData] = useState<BranchCommits[]>([]);
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>(branch || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!repoFullName) {
      setAvailableBranches([]);
      setBranchesData([]);
      setCommits([]);
      setLoading(false);
      return;
    }

    initializeCommits();
  }, [repoFullName, branch]);

  useEffect(() => {
    if (viewMode !== "list") {
      return;
    }

    const selectedBranchData = branchesData.find(
      (item) => item.branchName === selectedBranch,
    );
    setCommits(selectedBranchData?.commits || []);
  }, [viewMode, selectedBranch, branchesData]);

  const initializeCommits = async () => {
    try {
      setLoading(true);
      setError("");

      const branches = await authService.getRepositoryBranches(repoFullName);
      setAvailableBranches(branches);

      const preferredBranch =
        branch && branches.includes(branch)
          ? branch
          : branches.length > 0
            ? branches[0]
            : "";

      setSelectedBranch(preferredBranch);

      const branchesWithCommits: BranchCommits[] = [];

      for (const branchName of branches) {
        try {
          const branchCommits = await authService.getRepositoryCommits(
            repoFullName,
            branchName,
          );
          branchesWithCommits.push({
            branchName,
            commits: branchCommits,
          });
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (err) {
          branchesWithCommits.push({
            branchName,
            commits: [],
          });
        }
      }

      setBranchesData(branchesWithCommits);

      const selectedBranchData = branchesWithCommits.find(
        (item) => item.branchName === preferredBranch,
      );
      setCommits(selectedBranchData?.commits || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch branches");
      setAvailableBranches([]);
      setBranchesData([]);
      setCommits([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranchesAndCommits = async () => {
    try {
      setLoading(true);
      setError("");
      const branches = await authService.getRepositoryBranches(repoFullName);

      // Fetch commits for each branch sequentially with delay to avoid rate limiting
      const branchesWithCommits: BranchCommits[] = [];

      for (const branchName of branches) {
        try {
          const commits = await authService.getRepositoryCommits(
            repoFullName,
            branchName,
          );
          branchesWithCommits.push({
            branchName,
            commits: commits.slice(0, 10),
          });

          // Add small delay between requests to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (err) {
          branchesWithCommits.push({
            branchName,
            commits: [],
          });
        }
      }

      setBranchesData(branchesWithCommits);
    } catch (err: any) {
      setError(err.message || "Failed to fetch branches");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getCommitMessagePreview = (message: string) => {
    const firstLine = message.split("\n")[0];
    return firstLine.length > 80
      ? firstLine.substring(0, 80) + "..."
      : firstLine;
  };

  if (!repoFullName) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
          />
        </svg>
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          No GitHub repository linked to this project
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* View Mode Toggle Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <svg
                className="w-5 h-5 mr-2 text-gray-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z"
                  clipRule="evenodd"
                />
              </svg>
              Commits
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {repoFullName}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Branch Selector for List View */}
            {viewMode === "list" && availableBranches.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Branch:
                </label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {availableBranches.map((branchName) => (
                    <option key={branchName} value={branchName}>
                      {branchName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                  viewMode === "list"
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <svg
                  className="w-4 h-4 inline-block mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
                List
              </button>
              <button
                onClick={() => setViewMode("graph")}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                  viewMode === "graph"
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <svg
                  className="w-4 h-4 inline-block mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
                Graph
              </button>
            </div>
          </div>
        </div>
      </div>

      {viewMode === "list" ? renderListView() : renderGraphView()}
    </div>
  );

  function renderListView() {
    if (loading) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-lg p-4 animate-pulse"
            >
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <svg
              className="h-5 w-5 text-red-400 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-red-800 dark:text-red-200">{error}</span>
          </div>
          <button
            onClick={initializeCommits}
            className="mt-3 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
          >
            Try Again
          </button>
        </div>
      );
    }

    if (commits.length === 0) {
      return (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            No commits found on branch{" "}
            <span className="font-semibold">{selectedBranch}</span>
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Branch Info Badge */}
        <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-blue-600 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Viewing commits from{" "}
                <span className="font-bold">{selectedBranch}</span> branch
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-300 mt-0.5">
                {commits.length} commit{commits.length !== 1 ? "s" : ""} found
              </p>
            </div>
          </div>
          <button
            onClick={initializeCommits}
            className="px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition"
            title="Refresh commits"
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

        <div className="space-y-1">
          {commits.map((commit, index) => (
            <div
              key={commit.sha}
              className={`bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors ${
                index === 0 ? "ring-2 ring-blue-500 ring-opacity-50" : ""
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  {commit.author.avatar ? (
                    <img
                      src={commit.author.avatar}
                      alt={commit.author.name}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                      {commit.author.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {getCommitMessagePreview(commit.message)}
                      </p>
                      <div className="mt-1 flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-medium">
                          {commit.author.name}
                        </span>
                        {commit.author.username && (
                          <span className="text-gray-400">
                            @{commit.author.username}
                          </span>
                        )}
                        <span>•</span>
                        <span>{formatDate(commit.author.date)}</span>
                        {commit.verified && (
                          <>
                            <span>•</span>
                            <span className="flex items-center text-green-600 dark:text-green-400">
                              <svg
                                className="w-3 h-3 mr-1"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              Verified
                            </span>
                          </>
                        )}
                        {index === 0 && (
                          <>
                            <span>•</span>
                            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full font-medium">
                              Latest
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <code className="text-xs font-mono text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {commit.sha.substring(0, 7)}
                      </code>
                      <a
                        href={commit.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        title="View on GitHub"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                          <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderGraphView() {
    if (loading) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
            <div className="ml-8 space-y-3">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
              <div className="ml-8 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <svg
              className="h-5 w-5 text-red-400 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-red-800 dark:text-red-200">{error}</span>
          </div>
        </div>
      );
    }

    if (branchesData.length === 0) {
      return (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            No branches found
          </p>
        </div>
      );
    }

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        {/* Repository Root Node */}
        <div className="flex items-center gap-3 mb-6 animate-fadeIn">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
            <svg
              className="w-6 h-6 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z"
                clipRule="evenodd"
              />
              <path d="M15 7h1a2 2 0 012 2v5.5a1.5 1.5 0 01-3 0V7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {repoFullName.split("/")[1] || repoFullName}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Repository
            </p>
          </div>
        </div>

        {/* Branches and Commits Tree */}
        <div className="ml-5 border-l-2 border-gray-300 dark:border-gray-600 pl-4 space-y-6">
          {branchesData.map((branchData, branchIndex) => (
            <div
              key={branchData.branchName}
              className="animate-slideIn"
              style={{ animationDelay: `${branchIndex * 0.1}s` }}
            >
              {/* Branch Node */}
              <div className="flex items-center gap-3 mb-4 -ml-6 relative">
                <div className="absolute -left-[22px] w-4 h-4 bg-white dark:bg-gray-800 rounded-full border-2 border-blue-500"></div>
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="text-md font-semibold text-gray-900 dark:text-white">
                    {branchData.branchName}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {branchData.commits.length} commit
                    {branchData.commits.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              {/* Commits under branch */}
              {branchData.commits.length > 0 && (
                <div className="ml-4 border-l-2 border-gray-200 dark:border-gray-700 pl-4 space-y-3">
                  {branchData.commits
                    .slice(0, 10)
                    .map((commit, _commitIndex) => (
                      <div
                        key={commit.sha}
                        className="flex items-start gap-3 -ml-6 relative group hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded-lg transition-all"
                      >
                        <div className="absolute -left-[22px] w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                        {commit.author.avatar ? (
                          <img
                            src={commit.author.avatar}
                            alt={commit.author.name}
                            className="w-6 h-6 rounded-full flex-shrink-0"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                            {commit.author.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 dark:text-white font-medium truncate">
                            {getCommitMessagePreview(commit.message)}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {commit.author.name}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(commit.author.date)}
                            </span>
                            <code className="text-xs font-mono text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                              {commit.sha.substring(0, 7)}
                            </code>
                          </div>
                        </div>
                        <a
                          href={commit.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="opacity-0 group-hover:opacity-100 transition text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                          title="View on GitHub"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                          </svg>
                        </a>
                      </div>
                    ))}

                  {/* More commits link */}
                  {branchData.commits.length >= 10 && (
                    <div className="flex items-center gap-2 -ml-6 relative">
                      <div className="absolute -left-[22px] w-3 h-3 bg-gray-400 rounded-full border-2 border-white dark:border-gray-800"></div>
                      <a
                        href={`https://github.com/${repoFullName}/commits/${branchData.branchName}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium flex items-center gap-1 group"
                      >
                        <svg
                          className="w-4 h-4 group-hover:translate-x-1 transition"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 7l5 5m0 0l-5 5m5-5H6"
                          />
                        </svg>
                        View more commits on GitHub
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <style>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateX(-20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          .animate-fadeIn {
            animation: fadeIn 0.6s ease-out;
          }

          .animate-slideIn {
            animation: slideIn 0.5s ease-out both;
          }
        `}</style>
      </div>
    );
  }
};
