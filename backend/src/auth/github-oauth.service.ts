import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/encryption.service';

@Injectable()
export class GitHubOAuthService {
  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
  ) {}

  private readonly clientId = process.env.GITHUB_CLIENT_ID;
  private readonly clientSecret = process.env.GITHUB_CLIENT_SECRET;
  private readonly callbackUrl = process.env.GITHUB_CALLBACK_URL;

  /**
   * Generate GitHub OAuth authorization URL
   */
  getAuthorizationUrl(): string {
    if (!this.clientId || !this.callbackUrl) {
      throw new BadRequestException('GitHub OAuth is not configured');
    }

    const scope = 'read:user'; // Minimal scope - only read user profile
    const state = this.generateState();

    const url = `https://github.com/login/oauth/authorize?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.callbackUrl)}&scope=${scope}&state=${state}`;
    return url;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<string> {
    if (!this.clientId || !this.clientSecret || !this.callbackUrl) {
      throw new BadRequestException('GitHub OAuth is not configured');
    }

    try {
      const response = await fetch(
        'https://github.com/login/oauth/access_token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            client_id: this.clientId,
            client_secret: this.clientSecret,
            code,
            redirect_uri: this.callbackUrl,
          }),
        },
      );

      const data: any = await response.json();

      if (data.error) {
        throw new BadRequestException(
          `GitHub OAuth error: ${data.error_description}`,
        );
      }

      return data.access_token;
    } catch (error) {
      throw new BadRequestException('Failed to exchange code for token');
    }
  }

  /**
   * Get GitHub user information using access token
   */
  async getGitHubUser(accessToken: string) {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        throw new UnauthorizedException('Failed to fetch GitHub user');
      }

      const data: any = await response.json();

      return {
        githubId: String(data.id),
        githubUsername: data.login,
        githubAvatarUrl: data.avatar_url,
        githubProfileUrl: data.html_url,
        githubBio: data.bio || null,
        githubLocation: data.location || null,
        githubCompany: data.company || null,
        githubReposCount: data.public_repos || 0,
        name: data.name || data.login,
        email: data.email,
      };
    } catch (error) {
      throw new UnauthorizedException(
        'Failed to fetch GitHub user information',
      );
    }
  }

  /**
   * Link GitHub account to existing user
   */
  async linkGitHubAccount(userId: string, code: string) {
    // Exchange code for access token
    const accessToken = await this.exchangeCodeForToken(code);

    // Get GitHub user info
    const githubUser = await this.getGitHubUser(accessToken);

    // Check if GitHub account is already linked to another user
    const existingLink = await this.prisma.user.findFirst({
      where: {
        githubId: githubUser.githubId,
        id: { not: userId },
      },
    });

    if (existingLink) {
      throw new BadRequestException(
        'This GitHub account is already linked to another user',
      );
    }

    // Update user with GitHub information
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        githubId: githubUser.githubId,
        githubUsername: githubUser.githubUsername,
        githubAvatarUrl: githubUser.githubAvatarUrl,
        githubProfileUrl: githubUser.githubProfileUrl,
        githubBio: githubUser.githubBio,
        githubLocation: githubUser.githubLocation,
        githubCompany: githubUser.githubCompany,
        githubReposCount: githubUser.githubReposCount,
        githubAccessToken: this.encryptionService.encrypt(accessToken), // Encrypt before storing
        name: githubUser.name, // Update user's name with GitHub name
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        githubId: true,
        githubUsername: true,
        githubAvatarUrl: true,
        githubProfileUrl: true,
        githubBio: true,
        githubLocation: true,
        githubCompany: true,
        githubReposCount: true,
      },
    });

    return {
      success: true,
      message: 'GitHub account linked successfully',
      user: updatedUser,
    };
  }

  /**
   * Unlink GitHub account from user
   */
  async unlinkGitHubAccount(userId: string) {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        githubId: null,
        githubUsername: null,
        githubAvatarUrl: null,
        githubAccessToken: null,
        githubProfileUrl: null,
        githubBio: null,
        githubLocation: null,
        githubCompany: null,
        githubReposCount: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        githubId: true,
        githubUsername: true,
        githubAvatarUrl: true,
      },
    });

    return {
      success: true,
      message: 'GitHub account unlinked successfully',
      user: updatedUser,
    };
  }

  /**
   * Fetch user's GitHub repositories
   */
  async getUserRepositories(userId: string): Promise<any[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { githubAccessToken: true, githubUsername: true },
    });

    if (!user?.githubAccessToken) {
      throw new UnauthorizedException('GitHub account not connected');
    }

    // Decrypt the access token
    const decryptedToken = this.encryptionService.decrypt(
      user.githubAccessToken,
    );

    try {
      const response = await fetch(
        'https://api.github.com/user/repos?per_page=100&sort=updated',
        {
          headers: {
            Authorization: `Bearer ${decryptedToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        },
      );

      if (!response.ok) {
        throw new UnauthorizedException('Failed to fetch GitHub repositories');
      }

      const repos: any = await response.json();

      return repos.map((repo: any) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        url: repo.html_url,
        defaultBranch: repo.default_branch,
        private: repo.private,
        language: repo.language,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        updatedAt: repo.updated_at,
      }));
    } catch (error) {
      throw new UnauthorizedException('Failed to fetch GitHub repositories');
    }
  }

  /**
   * Fetch commits for a GitHub repository
   */
  async getRepositoryCommits(
    userId: string,
    repoFullName: string,
    branch?: string,
    authorUsername?: string,
  ): Promise<any[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { githubAccessToken: true },
    });

    if (!user?.githubAccessToken) {
      throw new UnauthorizedException('GitHub account not connected');
    }

    // Decrypt the access token
    const decryptedToken = this.encryptionService.decrypt(
      user.githubAccessToken,
    );

    try {
      const branchQuery = branch ? `?sha=${branch}` : '?';
      const authorQuery = authorUsername ? `&author=${authorUsername}` : '';
      const response = await fetch(
        `https://api.github.com/repos/${repoFullName}/commits${branchQuery}${authorQuery}&per_page=50`,
        {
          headers: {
            Authorization: `Bearer ${decryptedToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        },
      );

      if (!response.ok) {
        throw new UnauthorizedException('Failed to fetch commits');
      }

      const commits: any = await response.json();

      return commits.map((commit: any) => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: {
          name: commit.commit.author.name,
          email: commit.commit.author.email,
          date: commit.commit.author.date,
          avatar: commit.author?.avatar_url,
          username: commit.author?.login,
        },
        committer: {
          name: commit.commit.committer.name,
          date: commit.commit.committer.date,
        },
        parents:
          commit.parents?.map((parent: any) => ({
            sha: parent.sha,
            url: parent.html_url,
          })) || [],
        url: commit.html_url,
        verified: commit.commit.verification?.verified || false,
      }));
    } catch (error) {
      throw new UnauthorizedException('Failed to fetch repository commits');
    }
  }

  /**
   * Fetch branches for a GitHub repository
   */
  async getRepositoryBranches(
    userId: string,
    repoFullName: string,
  ): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { githubAccessToken: true },
    });

    if (!user?.githubAccessToken) {
      throw new UnauthorizedException('GitHub account not connected');
    }

    // Decrypt the access token
    const decryptedToken = this.encryptionService.decrypt(
      user.githubAccessToken,
    );

    try {
      const response = await fetch(
        `https://api.github.com/repos/${repoFullName}/branches?per_page=100`,
        {
          headers: {
            Authorization: `Bearer ${decryptedToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        },
      );

      if (!response.ok) {
        throw new UnauthorizedException('Failed to fetch branches');
      }

      const branches: any = await response.json();

      return branches.map((branch: any) => branch.name);
    } catch (error) {
      throw new UnauthorizedException('Failed to fetch repository branches');
    }
  }

  /**
   * Fetch a specific commit by SHA from a GitHub repository
   */
  async getCommitBySha(
    userId: string,
    repoFullName: string,
    commitSha: string,
  ): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { githubAccessToken: true },
    });

    if (!user?.githubAccessToken) {
      throw new UnauthorizedException('GitHub account not connected');
    }

    // Decrypt the access token
    const decryptedToken = this.encryptionService.decrypt(
      user.githubAccessToken,
    );

    try {
      const response = await fetch(
        `https://api.github.com/repos/${repoFullName}/commits/${commitSha}`,
        {
          headers: {
            Authorization: `Bearer ${decryptedToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        },
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new BadRequestException('Commit not found in this repository');
        }
        throw new UnauthorizedException('Failed to fetch commit');
      }

      const commit: any = await response.json();

      return {
        sha: commit.sha,
        message: commit.commit.message,
        author: {
          name: commit.commit.author.name,
          email: commit.commit.author.email,
          date: commit.commit.author.date,
          avatar: commit.author?.avatar_url,
          username: commit.author?.login,
        },
        committer: {
          name: commit.commit.committer.name,
          date: commit.commit.committer.date,
        },
        url: commit.html_url,
        verified: commit.commit.verification?.verified || false,
        stats: {
          additions: commit.stats?.additions || 0,
          deletions: commit.stats?.deletions || 0,
          total: commit.stats?.total || 0,
        },
        files: commit.files?.map((file: any) => ({
          filename: file.filename,
          status: file.status,
          additions: file.additions,
          deletions: file.deletions,
          changes: file.changes,
        })),
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new UnauthorizedException('Failed to fetch commit details');
    }
  }

  /**
   * Generate random state for CSRF protection
   */
  private generateState(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }
}
