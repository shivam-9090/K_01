import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import teamService, {
  type Team,
  type CreateTeamDto,
  type Employee,
} from "../services/team.service";
import { employeeService } from "../services/employee.service";
import { usePermissions } from "../hooks/usePermissions";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Users, Edit2, Trash2, Plus, X } from "lucide-react";
import { cn } from "../lib/utils";

const TEAM_TYPES = [
  { value: "frontend", label: "Frontend" },
  { value: "backend", label: "Backend" },
  { value: "ai/ml", label: "AI/ML" },
  { value: "devops", label: "DevOps" },
  { value: "mobile", label: "Mobile" },
  { value: "testing", label: "Testing" },
  { value: "database", label: "Database" },
  { value: "ui/ux", label: "UI/UX" },
  { value: "other", label: "Other" },
];

export const TeamsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const permissions = usePermissions();
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [selectedTeamType, setSelectedTeamType] = useState("");
  const [customTeamType, setCustomTeamType] = useState("");
  const [useCustomType, setUseCustomType] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Close modals on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showTeamModal) setShowTeamModal(false);
        if (showEditModal) {
          setShowEditModal(false);
          setEditingTeam(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showTeamModal, showEditModal]);

  // Fetch all teams
  const { data: teams, isLoading } = useQuery({
    queryKey: ["teams"],
    queryFn: () => teamService.getAllTeams(),
  });

  // Fetch suggested employees based on team type
  const { data: suggestedData } = useQuery({
    queryKey: [
      "suggestEmployees",
      useCustomType ? customTeamType : selectedTeamType,
      searchQuery,
    ],
    queryFn: () =>
      teamService.suggestEmployees(
        useCustomType ? customTeamType : selectedTeamType,
        searchQuery,
      ),
    enabled:
      (!!selectedTeamType || !!customTeamType) &&
      (showTeamModal || showEditModal),
  });

  // Fetch all employees for showing in modal (with search filter)
  const { data: allEmployees } = useQuery({
    queryKey: ["allEmployees"],
    queryFn: () => employeeService.getAllEmployees(),
    enabled: showTeamModal || showEditModal,
  });

  // Create team mutation
  const createTeamMutation = useMutation({
    mutationFn: (data: CreateTeamDto) => teamService.createTeam(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      resetForm();
      setShowTeamModal(false);
    },
  });

  // Delete team mutation
  const deleteTeamMutation = useMutation({
    mutationFn: (teamId: string) => teamService.deleteTeam(teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });

  // Update team mutation
  const updateTeamMutation = useMutation({
    mutationFn: ({ teamId, data }: { teamId: string; data: any }) =>
      teamService.updateTeam(teamId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      resetForm();
      setShowEditModal(false);
      setEditingTeam(null);
    },
  });

  // Helper function to filter and sort employees
  const getFilteredEmployees = () => {
    if (!allEmployees) return [];

    const suggested = suggestedData?.employees || [];
    const suggestedIds = new Set(suggested.map((e: Employee) => e.id));

    // Filter by search query
    const filtered = allEmployees.filter((emp: Employee) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        emp.email.toLowerCase().includes(query) ||
        (emp.name && emp.name.toLowerCase().includes(query))
      );
    });

    // Sort: suggested first, then others
    return filtered.sort((a: Employee, b: Employee) => {
      const aIsSuggested = suggestedIds.has(a.id);
      const bIsSuggested = suggestedIds.has(b.id);
      if (aIsSuggested && !bIsSuggested) return -1;
      if (!aIsSuggested && bIsSuggested) return 1;
      return 0;
    });
  };

  const resetForm = () => {
    setTeamName("");
    setTeamDescription("");
    setSelectedTeamType("");
    setCustomTeamType("");
    setUseCustomType(false);
    setSelectedMembers([]);
    setSearchQuery("");
  };

  const handleCreateTeam = () => {
    const finalTeamType = useCustomType ? customTeamType : selectedTeamType;

    if (!teamName || !finalTeamType) {
      alert("Please provide team name and type");
      return;
    }

    createTeamMutation.mutate({
      name: teamName,
      teamType: finalTeamType,
      description: teamDescription,
      memberIds: selectedMembers,
    });
  };

  const handleUpdateTeam = () => {
    const finalTeamType = useCustomType ? customTeamType : selectedTeamType;

    if (!teamName || !finalTeamType || !editingTeam) {
      alert("Please provide team name and type");
      return;
    }

    updateTeamMutation.mutate({
      teamId: editingTeam.id,
      data: {
        name: teamName,
        teamType: finalTeamType,
        description: teamDescription,
        memberIds: selectedMembers,
      },
    });
  };

  const openEditModal = (team: Team) => {
    setEditingTeam(team);
    setTeamName(team.name);
    setTeamDescription(team.description || "");

    // Check if team type is in predefined list
    const isPredefined = TEAM_TYPES.some((t) => t.value === team.teamType);
    if (isPredefined) {
      setSelectedTeamType(team.teamType);
      setUseCustomType(false);
      setCustomTeamType("");
    } else {
      setUseCustomType(true);
      setCustomTeamType(team.teamType);
      setSelectedTeamType("");
    }

    setSelectedMembers(team.memberIds || []);
    setShowEditModal(true);
  };

  const toggleMember = (employeeId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId],
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 text-muted-foreground">
        Loading teams...
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Teams</h2>
          <p className="text-muted-foreground">Manage your development teams</p>
        </div>
        {permissions.canCreateTeam && (
          <Button onClick={() => setShowTeamModal(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create Team
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams?.map((team: Team) => (
          <Card key={team.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl font-semibold">
                  {team.name}
                </CardTitle>
                <Badge variant="secondary">{team.teamType}</Badge>
              </div>
            </CardHeader>
            <CardContent className="pb-3 text-sm">
              <p className="text-muted-foreground line-clamp-2 h-10 mb-4">
                {team.description || "No description provided."}
              </p>

              <div className="mt-4">
                <div className="flex items-center text-muted-foreground mb-2">
                  <Users className="h-4 w-4 mr-2" />
                  <span className="font-medium">
                    Members ({team.members?.length || 0})
                  </span>
                </div>

                <div className="flex flex-wrap gap-1 mt-1">
                  {team.members && team.members.length > 0 ? (
                    team.members.slice(0, 5).map((member) => (
                      <Badge
                        key={member.id}
                        variant="outline"
                        className="text-xs font-normal"
                      >
                        {member.name || member.email?.split("@")[0]}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground italic">
                      No members assigned
                    </span>
                  )}
                  {team.members && team.members.length > 5 && (
                    <Badge variant="outline" className="text-xs font-normal">
                      +{team.members.length - 5} more
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-3 border-t flex justify-end gap-2">
              {permissions.canUpdateTeam && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditModal(team)}
                >
                  <Edit2 className="h-4 w-4 mr-1" /> Edit
                </Button>
              )}
              {permissions.canDeleteTeam && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Are you sure you want to delete this team?",
                      )
                    ) {
                      deleteTeamMutation.mutate(team.id);
                    }
                  }}
                  disabled={deleteTeamMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
        {teams?.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-lg bg-card text-muted-foreground">
            <Users className="h-12 w-12 mb-4 opacity-20" />
            <h3 className="text-lg font-medium mb-1">No teams found</h3>
            <p className="mb-4 max-w-sm">
              Create your first team to start organizing your projects.
            </p>
            {permissions.canCreateTeam && (
              <Button onClick={() => setShowTeamModal(true)}>
                <Plus className="mr-2 h-4 w-4" /> Create Team
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Create Team Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card text-card-foreground border rounded-lg shadow-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold tracking-tight">
                Create New Team
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowTeamModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Team Name *
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="e.g., Frontend Team A"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Team Type *
                </label>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={!useCustomType}
                        onChange={() => {
                          setUseCustomType(false);
                          setCustomTeamType("");
                        }}
                        className="h-4 w-4 text-primary focus:ring-primary border-input bg-background"
                      />
                      <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Choose from list
                      </span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={useCustomType}
                        onChange={() => {
                          setUseCustomType(true);
                          setSelectedTeamType("");
                        }}
                        className="h-4 w-4 text-primary focus:ring-primary border-input bg-background"
                      />
                      <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Custom type
                      </span>
                    </label>
                  </div>

                  {!useCustomType ? (
                    <select
                      value={selectedTeamType}
                      onChange={(e) => {
                        setSelectedTeamType(e.target.value);
                        setSelectedMembers([]);
                      }}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Select team type...</option>
                      {TEAM_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={customTeamType}
                      onChange={(e) => {
                        setCustomTeamType(e.target.value);
                        setSelectedMembers([]);
                      }}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Enter custom team type (e.g., Security, QA)"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Description (Optional)
                </label>
                <textarea
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  rows={3}
                  placeholder="Describe the team's purpose..."
                />
              </div>

              {/* Employee Suggestions */}
              {selectedTeamType && (
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Select Team Members
                  </label>

                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mb-3"
                    placeholder="Search by name or email..."
                  />

                  {suggestedData &&
                    suggestedData.requiredSkills?.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-2">
                        <span className="text-xs text-muted-foreground">
                          Suggested skills:
                        </span>
                        {suggestedData.requiredSkills
                          .slice(0, 5)
                          .map((skill) => (
                            <Badge
                              key={skill}
                              variant="secondary"
                              className="text-xs"
                            >
                              {skill}
                            </Badge>
                          ))}
                      </div>
                    )}

                  <div className="border border-input rounded-md max-h-64 overflow-y-auto bg-background">
                    {getFilteredEmployees().length > 0 ? (
                      getFilteredEmployees().map((employee: Employee) => {
                        const suggestedEmployee =
                          suggestedData?.employees?.find(
                            (e: any) => e.id === employee.id,
                          );
                        const isRecommended = !!suggestedEmployee;
                        return (
                          <div
                            key={employee.id}
                            className={cn(
                              "flex items-center p-3 border-b border-input last:border-b-0 hover:bg-accent/50 transition-colors",
                              isRecommended && "bg-accent/30",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={selectedMembers.includes(employee.id)}
                              onChange={() => toggleMember(employee.id)}
                              className="mr-3 h-4 w-4 rounded border-primary text-primary focus:ring-primary"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-foreground">
                                  {employee.name ||
                                    employee.email.split("@")[0]}
                                </p>
                                {isRecommended &&
                                  suggestedEmployee.matchScore !==
                                    undefined && (
                                    <Badge
                                      variant={
                                        suggestedEmployee.matchScore >= 70
                                          ? "default"
                                          : "secondary"
                                      }
                                    >
                                      {suggestedEmployee.matchScore}% match
                                    </Badge>
                                  )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {employee.email}
                              </p>
                              {isRecommended &&
                                suggestedEmployee.matchingSkills &&
                                suggestedEmployee.matchingSkills.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {suggestedEmployee.matchingSkills.map(
                                      (skill) => (
                                        <Badge
                                          key={skill}
                                          variant="outline"
                                          className="text-[10px] px-1 py-0 h-5"
                                        >
                                          {skill}
                                        </Badge>
                                      ),
                                    )}
                                  </div>
                                )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-center py-6 text-muted-foreground text-sm">
                        No employees found
                      </p>
                    )}
                  </div>

                  {selectedMembers.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Selected: {selectedMembers.length} member(s)
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  resetForm();
                  setShowTeamModal(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateTeam}
                disabled={
                  createTeamMutation.isPending ||
                  !teamName ||
                  (!selectedTeamType && !customTeamType)
                }
              >
                {createTeamMutation.isPending ? "Creating..." : "Create Team"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Team Modal */}
      {showEditModal && editingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card text-card-foreground border rounded-lg shadow-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold tracking-tight">
                Edit Team
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingTeam(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Team Name *
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="e.g., Frontend Team A"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Team Type *
                </label>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={!useCustomType}
                        onChange={() => {
                          setUseCustomType(false);
                          setCustomTeamType("");
                        }}
                        className="h-4 w-4 text-primary focus:ring-primary border-input bg-background"
                      />
                      <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Choose from list
                      </span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={useCustomType}
                        onChange={() => {
                          setUseCustomType(true);
                          setSelectedTeamType("");
                        }}
                        className="h-4 w-4 text-primary focus:ring-primary border-input bg-background"
                      />
                      <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Custom type
                      </span>
                    </label>
                  </div>

                  {!useCustomType ? (
                    <select
                      value={selectedTeamType}
                      onChange={(e) => {
                        setSelectedTeamType(e.target.value);
                      }}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Select team type...</option>
                      {TEAM_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={customTeamType}
                      onChange={(e) => {
                        setCustomTeamType(e.target.value);
                      }}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Enter custom team type (e.g., Security, QA)"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Description (Optional)
                </label>
                <textarea
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  rows={3}
                  placeholder="Describe the team's purpose..."
                />
              </div>

              {/* Employee Suggestions for Edit */}
              {(selectedTeamType || customTeamType) && (
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Team Members
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name or email..."
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mb-2"
                  />
                  <div className="border border-input rounded-md max-h-64 overflow-y-auto bg-background">
                    {getFilteredEmployees().length > 0 ? (
                      <>
                        {getFilteredEmployees().map((employee: Employee) => {
                          const suggestedEmployee =
                            suggestedData?.employees?.find(
                              (e: any) => e.id === employee.id,
                            );
                          const isRecommended = !!suggestedEmployee;
                          return (
                            <div
                              key={employee.id}
                              className={cn(
                                "flex items-center p-3 border-b border-input last:border-b-0 hover:bg-accent/50 transition-colors",
                                isRecommended && "bg-accent/30",
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={selectedMembers.includes(employee.id)}
                                onChange={() => toggleMember(employee.id)}
                                className="mr-3 h-4 w-4 rounded border-primary text-primary focus:ring-primary"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-foreground">
                                    {employee.name ||
                                      employee.email.split("@")[0]}
                                  </p>
                                  {isRecommended &&
                                    suggestedEmployee.matchScore !==
                                      undefined && (
                                      <Badge
                                        variant={
                                          suggestedEmployee.matchScore >= 70
                                            ? "default"
                                            : "secondary"
                                        }
                                      >
                                        {suggestedEmployee.matchScore}% match
                                      </Badge>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {employee.email}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No employees found
                      </p>
                    )}
                  </div>

                  {selectedMembers.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Selected: {selectedMembers.length} member(s)
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  resetForm();
                  setShowEditModal(false);
                  setEditingTeam(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateTeam}
                disabled={
                  updateTeamMutation.isPending ||
                  !teamName ||
                  (!selectedTeamType && !customTeamType)
                }
              >
                {updateTeamMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
