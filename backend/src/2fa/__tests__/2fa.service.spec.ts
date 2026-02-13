import { Test, TestingModule } from '@nestjs/testing';
import { TwoFAService } from '../2fa.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as speakeasy from 'speakeasy';
import * as bcrypt from 'bcrypt';

describe('TwoFAService', () => {
  let service: TwoFAService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    twoFABackupCode: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwoFAService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TwoFAService>(TwoFAService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Set environment variable for encryption key
    process.env.TWOFA_ENCRYPTION_KEY =
      'un0zfCzsUJBSPdtSWAKpqkflWg4jV/dEzWT37H23AYw=';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateSecret', () => {
    it('should throw error if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.generateSecret('invalid-user-id')).rejects.toThrow(
        'User not found',
      );
    });

    it('should throw error if 2FA is already enabled', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        twoFAEnabled: true,
      });

      await expect(service.generateSecret('user-1')).rejects.toThrow(
        'Two-factor authentication is already enabled',
      );
    });

    it('should generate secret and return QR code', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        twoFAEnabled: false,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        twoFASecret: 'encrypted-secret',
      });

      const result = await service.generateSecret('user-1');

      expect(result).toHaveProperty('qrCodeUrl');
      expect(result).toHaveProperty('secret');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { twoFASecret: expect.any(String) },
      });
    });
  });

  describe('verifyToken', () => {
    it('should return false for invalid token', async () => {
      const mockUser = {
        id: 'user-1',
        twoFASecret: 'encrypted-secret',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.verifyToken('user-1', 'invalid-token');

      expect(result).toBe(false);
    });

    it('should increment failed attempts on invalid token', async () => {
      const mockUser = {
        id: 'user-1',
        twoFASecret: 'encrypted-secret',
        twoFAFailedAttempts: 0,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await service.verifyToken('user-1', 'invalid-token');

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          twoFAFailedAttempts: 1,
          twoFALastFailedAttempt: expect.any(Date),
        },
      });
    });
  });

  describe('generateBackupCodes', () => {
    it('should generate 10 backup codes', async () => {
      const mockUser = {
        id: 'user-1',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.twoFABackupCode.deleteMany.mockResolvedValue({});
      mockPrismaService.twoFABackupCode.create.mockResolvedValue({});

      const result = await service.generateBackupCodes('user-1');

      expect(result).toHaveLength(10);
      expect(mockPrismaService.twoFABackupCode.create).toHaveBeenCalledTimes(
        10,
      );
    });
  });

  describe('verifyBackupCode', () => {
    it('should return false if code not found', async () => {
      mockPrismaService.twoFABackupCode.findMany.mockResolvedValue([]);

      const result = await service.verifyBackupCode('user-1', 'invalid-code');

      expect(result).toBe(false);
    });

    it('should mark code as used and return true for valid code', async () => {
      const hashedCode = await bcrypt.hash('VALID-CODE-123', 10);

      mockPrismaService.twoFABackupCode.findMany.mockResolvedValue([
        {
          id: 'code-1',
          code: hashedCode,
          used: false,
        },
      ]);

      mockPrismaService.twoFABackupCode.update.mockResolvedValue({});

      const result = await service.verifyBackupCode('user-1', 'VALID-CODE-123');

      expect(result).toBe(true);
      expect(mockPrismaService.twoFABackupCode.update).toHaveBeenCalledWith({
        where: { id: 'code-1' },
        data: { used: true, usedAt: expect.any(Date) },
      });
    });
  });
});
