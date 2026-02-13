import React, { useEffect, useState } from "react";

/**
 * PermissionChangeNotification Component
 *
 * Shows a banner after permissions are successfully updated,
 * informing the employee they need to logout/login to see changes.
 *
 * Usage: Add to Employees.tsx after successful permission update
 */
export const PermissionChangeNotification: React.FC<{
  show: boolean;
  onClose: () => void;
  employeeName?: string;
}> = ({ show, onClose, employeeName }) => {
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (show && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      onClose();
    }
  }, [show, countdown, onClose]);

  if (!show) return null;

  return (
    <div className="fixed top-4 right-4 left-4 md:left-auto md:w-96 z-50 animate-slide-down">
      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg shadow-2xl p-4 border-l-4 border-green-300">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center">
            <svg
              className="w-6 h-6 mr-2 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <h3 className="font-bold text-lg">Permissions Updated!</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-green-100 transition ml-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <p className="mb-3 text-green-50">
          {employeeName
            ? `Permissions for ${employeeName} have been successfully updated.`
            : "Permissions have been successfully updated."}
        </p>

        <div className="bg-green-700 bg-opacity-50 rounded-md p-3 mb-3">
          <p className="text-sm font-semibold mb-2 flex items-center">
            <svg
              className="w-4 h-4 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            Important: Changes Require Re-login
          </p>
          <p className="text-sm text-green-50">
            The employee must <strong>logout and login again</strong> to see the
            new permissions reflected in their interface.
          </p>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-green-100">
            Permissions are stored in the authentication token
          </span>
          <span className="bg-green-800 px-2 py-1 rounded font-mono text-xs">
            {countdown}s
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Simple success toast for quick actions
 */
export const PermissionSuccessToast: React.FC<{
  message: string;
  show: boolean;
  onClose: () => void;
}> = ({ message, show, onClose }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
      <div className="bg-white rounded-lg shadow-xl p-4 border-l-4 border-green-500 flex items-center space-x-3 max-w-sm">
        <svg
          className="w-6 h-6 text-green-500 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        <p className="text-gray-800 font-medium">{message}</p>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};
