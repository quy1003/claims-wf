import { Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../engine/entities/user.entity';
import { UserRole } from '../engine/constants';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Run Database seeding on startup.
   * If table has no users, pre-populates default accounts for each role.
   */
  async onModuleInit() {
    try {
      await this.seedUsers();
    } catch (error) {
      console.error('Failed to run database seeder:', error);
    }
  }

  /**
   * Seed standard mock credentials into database with bcrypt hashes.
   */
  async seedUsers() {
    const count = await this.userRepository.count();
    if (count > 0) {
      console.log('Users database already populated. Skipping seeding.');
      return;
    }

    console.log('Seeding default role-based users into database...');
    const defaultUsers = [
      { username: 'clerk_01', password: 'password123', role: UserRole.DOCUMENT_CLERK },
      { username: 'lead_01', password: 'password123', role: UserRole.TEAM_LEAD },
      { username: 'assessor_02', password: 'password123', role: UserRole.ASSESSOR },
      { username: 'finance_01', password: 'password123', role: UserRole.FINANCE },
      { username: 'system_user', password: 'password123', role: UserRole.SYSTEM },
    ];

    const saltRounds = 10;
    for (const u of defaultUsers) {
      const hashedPassword = await bcrypt.hash(u.password, saltRounds);
      const user = this.userRepository.create({
        id: `USR-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
        username: u.username,
        password: hashedPassword,
        role: u.role,
      });
      await this.userRepository.save(user);
      console.log(`Seeded user "${u.username}" with role "${u.role}"`);
    }
  }

  /**
   * Validates user credentials.
   */
  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.userRepository.findOne({ where: { username } });
    if (user) {
      const isMatch = await bcrypt.compare(pass, user.password);
      if (isMatch) {
        const { password, ...result } = user;
        return result;
      }
    }
    return null;
  }

  /**
   * Logs in a validated user and returns a signed JWT.
   */
  async login(loginDto: any): Promise<{ accessToken: string }> {
    const user = await this.validateUser(loginDto.username, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid username or password.');
    }

    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}
