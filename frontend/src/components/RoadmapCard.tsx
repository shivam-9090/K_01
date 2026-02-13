import React from "react";

interface RoadmapCardProps {
  id: string;
  title: string;
  description: string;
  order: number;
  estimatedTime: string;
  isCompleted?: boolean;
  onToggleComplete?: (id: string) => void;
}

export const RoadmapCard: React.FC<RoadmapCardProps> = ({
  id,
  title,
  description,
  order,
  estimatedTime,
  isCompleted = false,
  onToggleComplete,
}) => {
  return (
    <div
      className={`relative bg-white rounded-xl transition-all duration-300 group ${
        isCompleted
          ? "border-2 border-blue-500 shadow-md"
          : "border border-gray-200 shadow-sm hover:shadow-lg hover:border-blue-300"
      }`}
      style={{
        width: "280px",
        minHeight: "160px",
      }}
    >
      {/* Step Number Badge */}
      <div
        className={`absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-sm transition-colors ${
          isCompleted ? "bg-blue-600 text-white" : "bg-gray-900 text-white"
        }`}
      >
        {order}
      </div>

      {/* Action Header */}
      <div className="flex justify-end p-2 absolute top-0 right-0 w-full">
        {onToggleComplete && (
          <button
            onClick={() => onToggleComplete(id)}
            className={`w-6 h-6 rounded-full border transition-all flex items-center justify-center ${
              isCompleted
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-white border-gray-300 text-gray-300 hover:border-blue-400"
            }`}
          >
            {isCompleted && (
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Card Content */}
      <div className="p-5 pt-6">
        <h3
          className={`font-semibold text-lg leading-tight mb-2 ${
            isCompleted ? "text-gray-900" : "text-gray-900"
          }`}
        >
          {title}
        </h3>

        <p className="text-gray-500 text-sm mb-4 line-clamp-3 leading-relaxed">
          {description}
        </p>

        <div className="flex items-center gap-2 pt-3 border-t border-gray-100 mt-auto">
          <div className="flex items-center gap-1.5 text-gray-400">
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
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-xs font-medium uppercase tracking-wide">
              {estimatedTime}
            </span>
          </div>
        </div>
      </div>

      {/* Active State Indicator Strip */}
      {!isCompleted && (
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  );
};
