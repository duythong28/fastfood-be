import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { SignInByEmailDto, SignInByPhoneDto } from '../../dto/signin-dto';

@Injectable()
class SignInService {
  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}
  public async SignInByEmail(body: SignInByEmailDto, res: Response) {
    const { email, password } = body;
    const CAUSE = 'Email or password is incorrect or user has been disabled';
    const user = await this.prisma.users.findUnique({
      where: { email: email, is_disable: false },
      select: {
        id: true,
        password: true,
        role: true,
        verification: true,
      },
    });
    if (!user) {
      throw new BadRequestException(CAUSE, {
        cause: new Error(CAUSE),
      });
    }
    if (user.verification.is_active === false) {
      throw new BadRequestException('Account is not activated', {
        cause: new Error('Account is not activated'),
      });
    }
    const isMatchPassword = await bcrypt.compare(password, user.password);
    if (!isMatchPassword) {
      throw new BadRequestException(CAUSE, {
        cause: new Error(CAUSE),
      });
    }
    const jwts = await this.generateToken({ id: user.id, role: user.role });
    await this.prisma.users.update({
      where: { id: user.id },
      data: { refresh_token: jwts.refresh_token },
    });
    res.cookie('refresh_token', jwts.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 10,
    });
    return { access_token: jwts.access_token, user_id: user.id };
  }
  public async SignInByPhone(body: SignInByPhoneDto, res: Response) {
    const { phone, password } = body;
    const CAUSE = 'Phone or password is incorrect';
    const user = await this.prisma.users.findFirst({
      where: { phone: phone },
      select: {
        id: true,
        password: true,
        role: true,
        verification: true,
      },
    });
    if (!user) {
      throw new BadRequestException(CAUSE, {
        cause: new Error(CAUSE),
      });
    }
    if (user.verification.is_active === false) {
      throw new BadRequestException('Account is not activated', {
        cause: new Error('Account is not activated'),
      });
    }
    const isMatchPassword = await bcrypt.compare(password, user.password);
    if (!isMatchPassword) {
      throw new BadRequestException(CAUSE, {
        cause: new Error(CAUSE),
      });
    }
    const jwts = await this.generateToken({ id: user.id, role: user.role });
    await this.prisma.users.update({
      where: { id: user.id },
      data: { refresh_token: jwts.refresh_token },
    });
    res.cookie('refresh_token', jwts.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 10,
    });
    return { access_token: jwts.access_token, user_id: user.id };
  }
  private async generateToken<T extends { id: string; role: Role }>(
    payload: T,
  ) {
    const jwtPayload = payload;
    const access_token = await this.jwtService.signAsync(jwtPayload, {
      secret: this.configService.get('jwt_access_secret'),
      expiresIn: '1d',
    });
    const refresh_token = await this.jwtService.signAsync(jwtPayload, {
      secret: this.configService.get('jwt_refresh_secret'),
      expiresIn: '10d',
    });
    return { access_token, refresh_token };
  }
}
export default SignInService;
