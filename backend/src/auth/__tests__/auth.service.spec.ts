import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../users/users.service';
import { QueueService } from '../../queue/queue.service';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    company: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
  };

  const mockQueueService = {
    addEmailJob: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: QueueService,
          useValue: mockQueueService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should throw ConflictException if email already exists', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
        companyName: 'Test Company',
        mobile: '1234567890',
      };

      mockPrismaService.user.findFirst.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        'Email or mobile number already exists',
      );
    });

    it('should throw ConflictException if company name already exists', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
        companyName: 'Existing Company',
        mobile: '1234567890',
      };

      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.company.findUnique.mockResolvedValue({
        id: '1',
        name: 'Existing Company',
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        'Company name already exists',
      );
    });

    it('should create user and company successfully', async () => {
      const registerDto = {
        email: 'new@example.com',
        password: 'Password123!',
        name: 'New User',
        companyName: 'New Company',
        mobile: '1234567890',
      };

      const mockUser = {
        id: 'user-1',
        email: 'new@example.com',
        role: 'BOSS',
        companyId: 'company-1',
      };

      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.company.findUnique.mockResolvedValue(null);
      mockPrismaService.$transaction.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('mock-token');

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('user');
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('validateUser', () => {
    it('should return null if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toBeNull();
    });

    it('should return null if password is incorrect', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        password: await bcrypt.hash('correctpassword', 10),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validateUser('test@example.com', 'wrongpassword');

      expect(result).toBeNull();
    });

    it('should return user (without password) if credentials are valid', async () => {
      const password = 'correctpassword';
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        password: hashedPassword,
        role: 'BOSS',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validateUser('test@example.com', password);

      expect(result).toBeDefined();
      expect(result?.email).toBe('test@example.com');
      expect(result).not.toHaveProperty('password');
    });
  });
});
