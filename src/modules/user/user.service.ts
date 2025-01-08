import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TUserSession } from 'src/common/decorators/user-session.decorator';
import { CreateUserDto } from './dto/create_user.dto';
import { isEmailExist } from './helper';
import { UpdateUserProfileDto } from './dto/update_user_profile.dto';
import { GetAllUserDto } from './dto/get_all_user.dto';
import { EUploadFolder, USER_IMAGE_URL } from 'src/constants/constant';
import { uploadFilesFromFirebase } from 'src/libs/firebase/upload';
import { hashedPassword } from '../auth/services/signUp/hash-password';
import { UpdateUserProfileByAdmin } from './dto/update_user_profile_by_admin.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}
  async createNewUser(body: CreateUserDto) {
    if (await isEmailExist(body.email)) {
      throw new BadRequestException('Email already exists', {
        cause: new Error('User already exist'),
      });
    }
    const hashPassword = await hashedPassword(body.password);
    const newUser = await this.prisma.users.create({
      data: {
        email: body.email,
        password: hashPassword,
        full_name: body.fullName,
        role: body.role,
        birthday: new Date(body.birthday),
        gender: body.gender,
        avatar_url: USER_IMAGE_URL,
        verification: {
          create: {
            verified_code: hashPassword,
            is_active: true,
          },
        },
      },
    });
    if (newUser.role === 'CUSTOMER') {
      await this.prisma.carts.create({
        data: {
          user_id: newUser.id,
        },
      });
    }
    return newUser;
  }
  async getAllUsers(query: GetAllUserDto, isDisabled?: boolean) {
    const users = await this.prisma.users.findMany({
      where: {
        ...(query.role && { role: query.role }),
        ...(isDisabled !== undefined && { is_disable: isDisabled }),
      },
      skip: query.skip,
      take: query.take,
      orderBy: { [query.sortBy]: query.order },
    });
    const itemCount = await this.prisma.users.count({
      where: {
        ...(query.role && { role: query.role }),
        ...(isDisabled !== undefined && { is_disable: isDisabled }),
      },
    });
    return { users, itemCount };
  }
  async findUserById(id: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: id },
    });
    return user;
  }
  async disableUserById(id: string) {
    const user = await this.prisma.users.update({
      where: { id: id },
      data: {
        is_disable: true,
      },
    });
    return user;
  }
  async updateUserProfile(
    session: TUserSession,
    dto: UpdateUserProfileDto,
    image?: Express.Multer.File,
  ) {
    let imageUrls = [];
    try {
      if (image && image.buffer.byteLength > 0) {
        const uploadImagesData = await uploadFilesFromFirebase(
          [image],
          EUploadFolder.user,
        );
        if (!uploadImagesData.success) {
          throw new Error('Failed to upload images!');
        }
        imageUrls = uploadImagesData.urls;
      }
      const user = await this.prisma.users.findUnique({
        where: { id: session.id },
      });
      if (!user) {
        throw new BadRequestException('User not found', {
          cause: new Error('User not found'),
        });
      }
      const { birthday, fullName, ...data } = dto;
      const filteredData = Object.fromEntries(
        Object.entries(data).filter(
          ([value]) => value !== null && value !== '',
        ),
      );
      const updatedUser = await this.prisma.users.update({
        where: { id: session.id },
        data: {
          full_name: fullName ?? user.full_name,
          birthday: birthday ? new Date(birthday) : user.birthday,
          avatar_url: image ? imageUrls[0] : user.avatar_url,
          ...filteredData,
        },
      });
      return updatedUser;
    } catch (error) {
      console.log(error);
      throw new BadRequestException('Failed to update user profile', {
        cause: error,
      });
    }
  }
  async enableUserById(id: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: id },
    });
    if (!user) {
      throw new BadRequestException('User not found', {
        cause: new Error('User not found'),
      });
    }
    const updatedUser = await this.prisma.users.update({
      where: { id: id },
      data: {
        is_disable: false,
      },
    });
    return updatedUser;
  }
  async searchUser(keyword: string, query: GetAllUserDto, disable: boolean) {
    const users = await this.prisma.users.findMany({
      where: {
        full_name: {
          contains: keyword,
          mode: 'insensitive',
        },
        ...(query.role && { role: query.role }),
        ...(disable !== undefined && { is_disable: disable }),
      },
      skip: query.skip,
      take: query.take,
      orderBy: { [query.sortBy]: query.order },
    });
    const itemCount = await this.prisma.users.count({
      where: {
        full_name: {
          contains: keyword,
          mode: 'insensitive',
        },
        ...(query.role && { role: query.role }),
        ...(disable !== undefined && { is_disable: disable }),
      },
    });
    return { users, itemCount };
  }
  async updateUserByAdmin(
    body: UpdateUserProfileByAdmin,
    image?: Express.Multer.File,
  ) {
    const user = await this.prisma.users.findUnique({ where: { id: body.id } });
    if (!user) {
      throw new BadRequestException('User not found', {
        cause: new Error('User not found'),
      });
    }
    let imageUrls = [];
    if (image && image.buffer.byteLength > 0) {
      const uploadImagesData = await uploadFilesFromFirebase(
        [image],
        EUploadFolder.user,
      );
      if (!uploadImagesData.success) {
        throw new Error('Failed to upload images!');
      }
      imageUrls = uploadImagesData.urls;
    }
    const { birthday, fullName, ...data } = body;
    const updatedUser = await this.prisma.users.update({
      where: { id: body.id },
      data: {
        ...data,
        full_name: fullName ?? user.full_name,
        birthday: birthday ? new Date(birthday) : user.birthday,
        phone: data.phone ?? user.phone,
        avatar_url: image ? imageUrls[0] : user.avatar_url,
      },
    });
    return updatedUser;
  }
}
