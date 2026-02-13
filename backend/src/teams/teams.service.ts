import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamDto, UpdateTeamDto } from './dto/team.dto';

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  // Skill mapping for team types
  private readonly teamTypeSkills = {
    frontend: [
      'React',
      'Vue',
      'Angular',
      'HTML',
      'CSS',
      'JavaScript',
      'TypeScript',
      'Tailwind',
      'Next.js',
      'Vite',
    ],
    backend: [
      'Node.js',
      'Python',
      'Django',
      'Express',
      'NestJS',
      'Java',
      'Spring Boot',
      'PHP',
      'Laravel',
      '.NET',
    ],
    'ai/ml': [
      'Python',
      'TensorFlow',
      'PyTorch',
      'Machine Learning',
      'Data Science',
      'Keras',
      'Scikit-learn',
      'Deep Learning',
    ],
    devops: [
      'Docker',
      'Kubernetes',
      'AWS',
      'Azure',
      'GCP',
      'CI/CD',
      'Jenkins',
      'GitHub Actions',
      'Terraform',
      'Linux',
    ],
    mobile: [
      'React Native',
      'Flutter',
      'Swift',
      'Kotlin',
      'iOS',
      'Android',
      'Mobile Development',
      'Xamarin',
    ],
    testing: [
      'Jest',
      'Cypress',
      'Selenium',
      'Unit Testing',
      'E2E Testing',
      'QA',
      'Test Automation',
      'Mocha',
    ],
    database: [
      'PostgreSQL',
      'MongoDB',
      'MySQL',
      'Redis',
      'SQL',
      'NoSQL',
      'Database Design',
      'Prisma',
      'TypeORM',
    ],
    'ui/ux': [
      'Figma',
      'Adobe XD',
      'UI Design',
      'UX Design',
      'Wireframing',
      'Prototyping',
      'User Research',
      'Sketch',
    ],
    other: [],
  };

  // Create team
  async createTeam(
    createTeamDto: CreateTeamDto,
    createdById: string,
    companyId: string,
  ) {
    const { name, teamType, description, memberIds } = createTeamDto;

    // Validate team type
    if (!this.teamTypeSkills.hasOwnProperty(teamType)) {
      throw new BadRequestException('Invalid team type');
    }

    // Verify all members exist and belong to the company
    if (memberIds && memberIds.length > 0) {
      const members = await this.prisma.user.findMany({
        where: {
          id: { in: memberIds },
          companyId,
          role: 'EMPLOYEE',
        },
      });

      if (members.length !== memberIds.length) {
        throw new BadRequestException(
          'Some members do not exist or do not belong to the company',
        );
      }
    }

    const team = await this.prisma.team.create({
      data: {
        name,
        teamType,
        description,
        companyId,
        createdById,
        memberIds: memberIds || [],
      },
      include: {
        company: {
          select: {
            name: true,
          },
        },
      },
    });

    // Fetch member details
    const members =
      memberIds && memberIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: memberIds } },
            select: {
              id: true,
              name: true,
              email: true,
              skills: true,
            },
          })
        : [];

    return {
      ...team,
      members,
    };
  }

  // Get all teams
  async getAllTeams(companyId: string) {
    const teams = await this.prisma.team.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        company: {
          select: {
            name: true,
          },
        },
      },
    });

    // Fetch members for each team
    const teamsWithMembers = await Promise.all(
      teams.map(async (team) => {
        const members =
          team.memberIds.length > 0
            ? await this.prisma.user.findMany({
                where: { id: { in: team.memberIds } },
                select: {
                  id: true,
                  name: true,
                  email: true,
                  skills: true,
                },
              })
            : [];

        return {
          ...team,
          members,
        };
      }),
    );

    return teamsWithMembers;
  }

  // Get team by ID
  async getTeamById(teamId: string, companyId: string) {
    const team = await this.prisma.team.findFirst({
      where: {
        id: teamId,
        companyId,
      },
      include: {
        company: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Fetch members
    const members =
      team.memberIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: team.memberIds } },
            select: {
              id: true,
              name: true,
              email: true,
              skills: true,
            },
          })
        : [];

    return {
      ...team,
      members,
    };
  }

  // Update team
  async updateTeam(
    teamId: string,
    updateTeamDto: UpdateTeamDto,
    companyId: string,
  ) {
    const team = await this.prisma.team.findFirst({
      where: {
        id: teamId,
        companyId,
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const { name, teamType, description, memberIds } = updateTeamDto;

    // Validate team type if provided
    if (teamType && !this.teamTypeSkills.hasOwnProperty(teamType)) {
      throw new BadRequestException('Invalid team type');
    }

    // Verify all members exist and belong to the company
    if (memberIds) {
      const members = await this.prisma.user.findMany({
        where: {
          id: { in: memberIds },
          companyId,
          role: 'EMPLOYEE',
        },
      });

      if (members.length !== memberIds.length) {
        throw new BadRequestException(
          'Some members do not exist or do not belong to the company',
        );
      }
    }

    const updatedTeam = await this.prisma.team.update({
      where: { id: teamId },
      data: {
        ...(name && { name }),
        ...(teamType && { teamType }),
        ...(description !== undefined && { description }),
        ...(memberIds && { memberIds }),
      },
      include: {
        company: {
          select: {
            name: true,
          },
        },
      },
    });

    // Fetch member details
    const members =
      updatedTeam.memberIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: updatedTeam.memberIds } },
            select: {
              id: true,
              name: true,
              email: true,
              skills: true,
            },
          })
        : [];

    return {
      ...updatedTeam,
      members,
    };
  }

  // Delete team
  async deleteTeam(teamId: string, companyId: string) {
    const team = await this.prisma.team.findFirst({
      where: {
        id: teamId,
        companyId,
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    await this.prisma.team.delete({
      where: { id: teamId },
    });

    return { message: 'Team deleted successfully' };
  }

  // Suggest employees based on team type and skills
  async suggestEmployees(
    teamType: string,
    searchQuery: string,
    companyId: string,
  ) {
    // For custom team types (not in predefined list), just search all employees
    const isCustomType = !this.teamTypeSkills.hasOwnProperty(teamType);
    const requiredSkills = isCustomType ? [] : this.teamTypeSkills[teamType];

    // Build where clause
    const whereClause: any = {
      companyId,
      role: 'EMPLOYEE',
    };

    // If there are required skills for this team type, filter by them
    if (requiredSkills.length > 0) {
      whereClause.OR = requiredSkills.map((skill) => ({
        skills: {
          has: skill,
        },
      }));
    }

    // Add search filter if provided
    if (searchQuery) {
      whereClause.AND = {
        OR: [
          { name: { contains: searchQuery, mode: 'insensitive' } },
          { email: { contains: searchQuery, mode: 'insensitive' } },
        ],
      };
    }

    const employees = await this.prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        skills: true,
      },
      orderBy: { name: 'asc' },
    });

    // Calculate match scores for each employee
    const employeesWithScores = employees.map((emp) => {
      const matchingSkills = emp.skills.filter((skill) =>
        requiredSkills.some(
          (reqSkill) => reqSkill.toLowerCase() === skill.toLowerCase(),
        ),
      );

      const matchScore =
        requiredSkills.length > 0
          ? (matchingSkills.length / requiredSkills.length) * 100
          : 0;

      return {
        ...emp,
        matchingSkills,
        matchScore: Math.round(matchScore),
      };
    });

    // Sort by match score descending
    employeesWithScores.sort((a, b) => b.matchScore - a.matchScore);

    return {
      employees: employeesWithScores,
      teamType,
      requiredSkills,
    };
  }
}
