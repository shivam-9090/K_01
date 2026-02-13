import React, { useState } from "react";
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
  url: string;
  verified: boolean;
}

interface CommitSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCommit: (commit: Commit) => void;
  repoFullName: string;
  branch?: string;
  employeeGithubUsername: string;
}

export const CommitSelectorModal: React.FC<CommitSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectCommit,
  repoFullName,
  branch: _branch,
  employeeGithubUsername: _employeeGithubUsername,
}) => {
  const [error, setError] = useState("");
  const [selectedCommit, setSelectedCommit] = useState<Commit | null>(null);
  const [commitShaInput, setCommitShaInput] = useState("");
  const [fetchingCommit, setFetchingCommit] = useState(false);

  const fetchCommitBySha = async () => {
    const sha = commitShaInput.trim();
    if (!sha) {
      setError("Please enter a commit SHA");
      return;
    }

    try {
      setFetchingCommit(true);
      setError("");

      const commit = await authService.getCommitBySha(repoFullName, sha);

      setSelectedCommit(commit);
      setError("");
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Commit not found in this repository",
      );
      setSelectedCommit(null);
    } finally {
      setFetchingCommit(false);
    }
  };

  const handleSelectCommit = () => {
    if (selectedCommit) {
      onSelectCommit(selectedCommit);
      onClose();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Select Commit
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Enter commit SHA from any branch
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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

          <div className="mt-3 flex items-center text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">Repository:</span>
            <span className="ml-2">{repoFullName}</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Commit SHA (from any branch)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={commitShaInput}
                  onChange={(e) => setCommitShaInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") fetchCommitBySha();
                  }}
                  placeholder="e.g., a1b2c3d or full SHA..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={fetchCommitBySha}
                  disabled={fetchingCommit || !commitShaInput.trim()}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                >
                  {fetchingCommit ? "Loading..." : "Fetch"}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Paste the commit SHA from GitHub or your terminal (git log)
              </p>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {selectedCommit && (
              <div className="p-4 rounded-lg border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    {selectedCommit.author.avatar ? (
                      <img
                        src={selectedCommit.author.avatar}
                        alt={selectedCommit.author.name}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                        {selectedCommit.author.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedCommit.message.split("\n")[0]}
                    </p>
                    <div className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <code className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                        {selectedCommit.sha.substring(0, 7)}
                      </code>
                      <span className="mx-2">•</span>
                      <span>{formatDate(selectedCommit.author.date)}</span>
                      <span className="mx-2">•</span>
                      <span>{selectedCommit.author.name}</span>
                      {selectedCommit.verified && (
                        <>
                          <span className="mx-2">•</span>
                          <span className="text-green-600 dark:text-green-400 flex items-center">
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
                    </div>
                  </div>
                  <div className="ml-3 flex-shrink-0">
                    <svg
                      className="w-6 h-6 text-blue-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSelectCommit}
            disabled={!selectedCommit}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg transition disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
          >
            Complete Task with This Commit
          </button>
        </div>
      </div>
    </div>
  );
};
