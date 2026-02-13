import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employeeService } from "../services/employee.service";
import { taskService } from "../services/task.service";
import { usePermissions } from "../hooks/usePermissions";
import { AccessDenied } from "../components/AccessDenied";

const EmployeeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const permissions = usePermissions();
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [attendance, setAttendance] = useState(0);

  // Fetch employee details
  const { data: employee, isLoading: loadingEmployee } = useQuery({
    queryKey: ["employee", id],
    queryFn: () => employeeService.getById(id!),
    enabled: !!id,
  });

  // Fetch employee tasks
  const { data: tasks } = useQuery({
    queryKey: ["employee-tasks", id],
    queryFn: async () => {
      const allTasks = await taskService.getAll();

      // Filter to only show tasks assigned to THIS specific employee
      const employeeTasks = allTasks.filter((task: any) => {
        const isAssigned = task.assignedToIds?.includes(id);
        return isAssigned;
      });

      return employeeTasks;
    },
    enabled: !!id,
  });

  // Update attendance mutation
  const updateAttendanceMutation = useMutation({
    mutationFn: async (newAttendance: number) => {
      return employeeService.updateAttendance(id!, newAttendance);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", id] });
      setEditMode(false);
    },
  });

  React.useEffect(() => {
    if (employee) {
      setAttendance(employee.attendance || 0);
    }
  }, [employee]);

  if (!permissions.canViewAllEmployees && !permissions.canUpdateEmployee) {
    return (
      <AccessDenied
        requiredPermissions={["canViewAllEmployees", "canUpdateEmployee"]}
        message="You need at least one of the following permissions to view employee details."
      />
    );
  }

  if (loadingEmployee) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Employee not found</p>
          <button
            onClick={() => navigate("/employees")}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Back to Employees
          </button>
        </div>
      </div>
    );
  }

  const completedTasks =
    tasks?.filter((t: any) => t.status === "completed").length || 0;
  const pendingTasks =
    tasks?.filter(
      (t: any) => t.status === "pending" || t.status === "in_progress",
    ).length || 0;
  const missedTasks =
    tasks?.filter((t: any) => {
      if (
        t.closeDate &&
        new Date(t.closeDate) < new Date() &&
        t.status !== "completed"
      ) {
        return true;
      }
      return false;
    }).length || 0;

  const projects = tasks
    ? [...new Set(tasks.map((t: any) => t.projectId).filter(Boolean))]
    : [];
  const liveProjects = projects.length;

  return (
    <div className="h-screen overflow-hidden bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/employees")}
            className="text-gray-600 hover:text-gray-900"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {employee.name || employee.email?.split("@")[0]}
            </h1>
            <p className="text-sm text-gray-600">{employee.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              employee.isActive
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {employee.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      {/* Main Content - Grid Layout */}
      <div className="flex-1 overflow-hidden p-6">
        <div className="h-full grid grid-cols-3 gap-6">
          {/* Left Column - Stats Cards */}
          <div className="space-y-6">
            {/* Tasks Stats */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Task Statistics
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Completed</span>
                  <span className="text-2xl font-bold text-green-600">
                    {completedTasks}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Pending</span>
                  <span className="text-2xl font-bold text-yellow-600">
                    {pendingTasks}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Missed</span>
                  <span className="text-2xl font-bold text-red-600">
                    {missedTasks}
                  </span>
                </div>
                <div className="pt-3 border-t">
                  <span className="text-gray-600">Total Tasks</span>
                  <span className="ml-2 text-xl font-bold text-gray-900">
                    {tasks?.length || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Attendance Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Attendance
                </h3>
                {!editMode && permissions.canUpdateEmployee && (
                  <button
                    onClick={() => setEditMode(true)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Edit
                  </button>
                )}
              </div>
              {editMode ? (
                <div className="space-y-3">
                  <input
                    type="number"
                    value={attendance}
                    onChange={(e) => setAttendance(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        updateAttendanceMutation.mutate(attendance)
                      }
                      disabled={updateAttendanceMutation.isPending}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditMode(false);
                        setAttendance(employee.attendance || 0);
                      }}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-5xl font-bold text-blue-600">
                    {employee.attendance || 0}
                  </div>
                  <p className="text-gray-600 mt-2">Days Present</p>
                </div>
              )}
            </div>

            {/* Projects Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Projects
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Active Projects</span>
                  <span className="text-2xl font-bold text-purple-600">
                    {liveProjects}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Column - Charts */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              Performance Analytics
            </h3>

            {/* Task Completion Chart (Simple Bar Chart) */}
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Completed</span>
                  <span className="text-sm font-medium text-gray-900">
                    {completedTasks} tasks
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-green-500 h-4 rounded-full transition-all"
                    style={{
                      width: `${
                        tasks?.length
                          ? (completedTasks / tasks.length) * 100
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Pending</span>
                  <span className="text-sm font-medium text-gray-900">
                    {pendingTasks} tasks
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-yellow-500 h-4 rounded-full transition-all"
                    style={{
                      width: `${
                        tasks?.length ? (pendingTasks / tasks.length) * 100 : 0
                      }%`,
                    }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Missed</span>
                  <span className="text-sm font-medium text-gray-900">
                    {missedTasks} tasks
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-red-500 h-4 rounded-full transition-all"
                    style={{
                      width: `${
                        tasks?.length ? (missedTasks / tasks.length) * 100 : 0
                      }%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Completion Rate */}
              <div className="pt-6 border-t">
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600">
                    {tasks?.length
                      ? Math.round((completedTasks / tasks.length) * 100)
                      : 0}
                    %
                  </div>
                  <p className="text-gray-600 mt-2">Completion Rate</p>
                </div>
              </div>

              {/* Skills */}
              <div className="pt-6 border-t">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Skills
                </h4>
                <div className="flex flex-wrap gap-2">
                  {employee.skills?.map((skill: string) => (
                    <span
                      key={skill}
                      className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                  {(!employee.skills || employee.skills.length === 0) && (
                    <span className="text-gray-400 text-sm">
                      No skills listed
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Achievements & Recent Tasks */}
          <div className="space-y-6 overflow-y-auto">
            {/* Achievements */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Achievements
              </h3>
              <div className="space-y-3">
                {completedTasks >= 10 && (
                  <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                    <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Task Master</p>
                      <p className="text-xs text-gray-600">
                        Completed 10+ tasks
                      </p>
                    </div>
                  </div>
                )}
                {completedTasks >= 50 && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        Elite Contributor
                      </p>
                      <p className="text-xs text-gray-600">
                        Completed 50+ tasks
                      </p>
                    </div>
                  </div>
                )}
                {(employee.attendance || 0) >= 30 && (
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-white"
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
                    <div>
                      <p className="font-semibold text-gray-900">
                        Perfect Attendance
                      </p>
                      <p className="text-xs text-gray-600">30+ days present</p>
                    </div>
                  </div>
                )}
                {completedTasks === 0 && (employee.attendance || 0) === 0 && (
                  <div className="text-center py-6 text-gray-400">
                    <p className="text-sm">No achievements yet</p>
                    <p className="text-xs mt-1">
                      Complete tasks to earn achievements
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Tasks */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Recent Tasks
              </h3>
              <div className="space-y-3">
                {tasks?.slice(0, 5).map((task: any) => (
                  <div
                    key={task.id}
                    className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition"
                  >
                    <p className="text-sm font-medium text-gray-900">
                      {task.title}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span
                        className={`px-2 py-1 text-xs rounded-full font-medium ${
                          task.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : task.status === "in_progress"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {task.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {task.project?.title}
                      </span>
                    </div>
                  </div>
                ))}
                {(!tasks || tasks.length === 0) && (
                  <div className="text-center py-6 text-gray-400">
                    <p className="text-sm">No tasks assigned yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetail;
