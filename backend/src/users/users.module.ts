import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { EmployeeService } from './employee.service';
import { EmployeeController } from './employee.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EncryptionService } from '../common/encryption.service';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController, EmployeeController],
  providers: [UsersService, EmployeeService, EncryptionService],
  exports: [UsersService, EmployeeService],
})
export class UsersModule {}
