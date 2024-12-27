import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Gender, Role } from '@prisma/client';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword } from 'prisma/seed';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class GoogleOauthService {
  constructor(
    private readonly configSerivce: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
  ) {}
  async googleOauth(
    userPayload: { userData: any; role: Role },
    res: Response<any, Record<string, any>>,
  ) {
    const { userData, role } = userPayload;
    const { emails, photos, displayName } = userData.profile;
    const email = emails[0].value;
    const avatar_url = photos[0].value;
    const full_name = displayName;
    let user = await this.prismaService.users.findUnique({
      where: { email },
    });
    if (!user) {
      const hash_password = await hashPassword(
        this.configSerivce.get<string>('default_password') + email,
      );
      user = await this.prismaService.users.create({
        data: {
          email,
          full_name,
          avatar_url,
          role,
          birthday: new Date(Date.now()),
          password: hash_password,
          gender: Gender.MALE,
          verification: {
            create: {
              verified_code: hash_password,
              is_active: true,
            },
          },
        },
      });
      await this.prismaService.carts.create({
        data: {
          user_id: user.id,
        },
      });
    }
    const { id } = user;
    const { access_token, refresh_token } = await this.generateToken({
      id,
      role: user.role,
    });
    await this.prismaService.users.update({
      where: { id: user.id },
      data: { refresh_token: refresh_token },
    });
    res.cookie('access_token', access_token);
    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 10,
    });
    res.redirect(this.configSerivce.get<string>('success_auth_google'));
  }

  private async generateToken<T extends { id: string; role: Role }>(
    payload: T,
  ) {
    const jwtPayload = payload;
    const access_token = await this.jwtService.signAsync(jwtPayload, {
      secret: this.configSerivce.get('jwt_access_secret'),
      expiresIn: '300s',
    });
    const refresh_token = await this.jwtService.signAsync(jwtPayload, {
      secret: this.configSerivce.get('jwt_refresh_secret'),
      expiresIn: '10d',
    });
    return { access_token, refresh_token };
  }
}
