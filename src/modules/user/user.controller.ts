import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  TUserSession,
  UserSession,
} from 'src/common/decorators/user-session.decorator';
import { StandardResponse } from 'src/utils/response.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { DOCUMENTATION } from 'src/constants/documentation';
import { CreateUserDto } from './dto/create_user.dto';
import { UsersService } from './user.service';
import { UpdateUserProfileDto } from './dto/update_user_profile.dto';
import { END_POINTS } from 'src/constants/end_points';
import { FILE_TYPES_REGEX } from 'src/constants/constraints';
import { GetAllUserDto } from './dto/get_all_user.dto';
import { PageResponseDto } from 'src/utils/page_response.dto';
import { PageResponseMetaDto } from 'src/utils/page_response_meta.dto';
import { UpdateUserProfileByAdmin } from './dto/update_user_profile_by_admin.dto';

const {
  USERS: {
    BASE,
    GET_ALL,
    CREATE,
    GET_ONE,
    UPDATE,
    ENABLE,
    DISABLE,
    SEARCH,
    UPDATE_BY_ADMIN,
  },
} = END_POINTS;

@ApiTags(DOCUMENTATION.TAGS.USERS)
@Controller(BASE)
export class UsersController {
  constructor(private readonly userService: UsersService) {}
  @Get(GET_ALL)
  async getAllUsers(
    @Query() query: GetAllUserDto,
    @Query('disable', new DefaultValuePipe(undefined)) disable?: boolean,
  ) {
    const { users, itemCount } = await this.userService.getAllUsers(
      query,
      disable,
    );
    const meta = new PageResponseMetaDto({
      pageOptionsDto: query,
      itemCount: itemCount,
    });
    return new PageResponseDto(users, meta);
  }
  @Post(CREATE)
  async createNewUser(@Body() body: CreateUserDto) {
    const user = await this.userService.createNewUser(body);
    return new StandardResponse(
      user,
      'Create user successfully',
      HttpStatus.CREATED,
    );
  }
  @ApiOperation({
    summary: 'Get a user',
    description: 'Allowed roles: ADMIN/CUSTOMER',
  })
  @ApiResponse({
    status: 400,
    description: 'Customer can only get themselves',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @Get(GET_ONE)
  async findUserById(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.userService.findUserById(id);
    return new StandardResponse(user, 'Get user successfully', HttpStatus.OK);
  }
  @Patch(UPDATE)
  @UseInterceptors(FileInterceptor('avatar_url'))
  async updateUserProfile(
    @UserSession() session: TUserSession,
    @Body() dto: UpdateUserProfileDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: FILE_TYPES_REGEX,
        })
        .build({
          fileIsRequired: false,
        }),
    )
    image?: Express.Multer.File,
  ) {
    console.log(session);
    const user = await this.userService.updateUserProfile(session, dto, image);
    return new StandardResponse(
      user,
      'Update user profile successfully',
      HttpStatus.CREATED,
    );
  }
  @Post(ENABLE)
  async enableUserById(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.userService.enableUserById(id);
    return new StandardResponse(
      user,
      'Enable user successfully',
      HttpStatus.CREATED,
    );
  }
  @Post(DISABLE)
  async disableUserById(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.userService.disableUserById(id);
    return new StandardResponse(
      user,
      'Disable user successfully',
      HttpStatus.CREATED,
    );
  }
  @Get(SEARCH)
  async searchUser(
    @Query() query: GetAllUserDto,
    @Query('keyword', new DefaultValuePipe(undefined)) keyword?: string,
    @Query('disable', new DefaultValuePipe(undefined)) disable?: boolean,
  ) {
    const { users, itemCount } = await this.userService.searchUser(
      keyword,
      query,
      disable,
    );
    const meta = new PageResponseMetaDto({
      pageOptionsDto: query,
      itemCount: itemCount,
    });
    return new PageResponseDto(users, meta);
  }
  @Put(UPDATE_BY_ADMIN)
  async updateUserByAdmin(@Body() dto: UpdateUserProfileByAdmin) {
    const user = await this.userService.updateUserByAdmin(dto);
    return new StandardResponse(
      user,
      'Update user by admin successfully',
      HttpStatus.CREATED,
    );
  }
}
