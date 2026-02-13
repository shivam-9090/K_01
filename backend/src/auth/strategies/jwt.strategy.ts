import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../interfaces/auth.interface';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return {
      sub: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      isTwoFAEnabled: user.isTwoFAEnabled,
      // Include all permission fields
      canCreateProject: user.canCreateProject,
      canUpdateProject: user.canUpdateProject,
      canDeleteProject: user.canDeleteProject,
      canViewAllProjects: user.canViewAllProjects,
      canCreateTask: user.canCreateTask,
      canUpdateTask: user.canUpdateTask,
      canDeleteTask: user.canDeleteTask,
      canCompleteTask: user.canCompleteTask,
      canVerifyTask: user.canVerifyTask,
      canViewAllTasks: user.canViewAllTasks,
      canViewOverdueTasks: user.canViewOverdueTasks,
      canCreateEmployee: user.canCreateEmployee,
      canUpdateEmployee: user.canUpdateEmployee,
      canDeleteEmployee: user.canDeleteEmployee,
      canViewAllEmployees: user.canViewAllEmployees,
      canManagePermissions: user.canManagePermissions,
      canCreateTeam: user.canCreateTeam,
      canUpdateTeam: user.canUpdateTeam,
      canDeleteTeam: user.canDeleteTeam,
      canViewAllTeams: user.canViewAllTeams,
      canViewAuditLogs: user.canViewAuditLogs,
      canViewAllSessions: user.canViewAllSessions,
      canManage2FA: user.canManage2FA,
    };
  }
}
