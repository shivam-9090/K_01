import { api } from "./api";

export interface Employee {
  id: string;
  name: string;
  email: string;
  skills: string[];
  matchingSkills?: string[];
  matchScore?: number;
}

export interface Team {
  id: string;
  name: string;
  teamType: string;
  description?: string;
  companyId: string;
  createdById: string;
  memberIds: string[];
  members: Employee[];
  createdAt: string;
  updatedAt: string;
  company: {
    name: string;
  };
}

export interface CreateTeamDto {
  name: string;
  teamType: string;
  description?: string;
  memberIds?: string[];
}

export interface UpdateTeamDto {
  name?: string;
  teamType?: string;
  description?: string;
  memberIds?: string[];
}

export interface SuggestedEmployeesResponse {
  employees: Employee[];
  teamType: string;
  requiredSkills: string[];
}

const teamService = {
  // Get all teams
  getAllTeams: async (): Promise<Team[]> => {
    const response = await api.get("/teams");
    return response.data;
  },

  // Get team by ID
  getTeamById: async (teamId: string): Promise<Team> => {
    const response = await api.get(`/teams/${teamId}`);
    return response.data;
  },

  // Create team
  createTeam: async (teamData: CreateTeamDto): Promise<Team> => {
    const response = await api.post("/teams", teamData);
    return response.data;
  },

  // Update team
  updateTeam: async (
    teamId: string,
    teamData: UpdateTeamDto
  ): Promise<Team> => {
    const response = await api.put(`/teams/${teamId}`, teamData);
    return response.data;
  },

  // Delete team
  deleteTeam: async (teamId: string): Promise<void> => {
    await api.delete(`/teams/${teamId}`);
  },

  // Get suggested employees for team type
  suggestEmployees: async (
    teamType: string,
    searchQuery?: string
  ): Promise<SuggestedEmployeesResponse> => {
    const params = new URLSearchParams();
    params.append("teamType", teamType);
    if (searchQuery) {
      params.append("searchQuery", searchQuery);
    }
    const response = await api.get(
      `/teams/suggest-employees?${params.toString()}`
    );
    return response.data;
  },
};

export default teamService;
