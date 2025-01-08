import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { Category } from '@prisma/client';
import { DOCUMENTATION } from 'src/constants/documentation';
import { END_POINTS } from 'src/constants/end_points';
import { CreateCategoryDto } from './dto/create_category.dto';
import { CategoryService } from './category.service';
import { StandardResponse } from 'src/utils/response.dto';
import HttpStatusCode from 'src/constants/http_status_code';
import { PageResponseDto } from 'src/utils/page_response.dto';
import { PageResponseMetaDto } from 'src/utils/page_response_meta.dto';
import { UpdateCategoryDto } from './dto/update_category.dto';
import { CategoryPageOptionsDto } from './dto/find_all_category.dto';
import { ChatbotService } from '../chatbot/chatbot.service';
import { Public } from 'src/common/decorators/public.decorator';

const {
  CATEGORIES: {
    BASE,
    CREATE,
    GET_ALL,
    GET_ONE,
    UPDATE,
    DISABLE,
    ENABLE,
    SEARCH,
  },
} = END_POINTS;
@ApiTags(DOCUMENTATION.TAGS.CATEGORIES)
@Controller(BASE)
export class CategoryController {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly chatbotService: ChatbotService,
  ) {}
  @Post(CREATE)
  async create(
    @Body() body: CreateCategoryDto,
  ): Promise<StandardResponse<Category>> {
    const category = await this.categoryService.create(body);
    await this.chatbotService.updateEntityCategory(body.name, [body.name]);
    const message = 'Create category successfully';
    return new StandardResponse(category, message, HttpStatusCode.CREATED);
  }
  @Get(GET_ALL)
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'take',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @Public()
  async getAll(
    @Query() query: CategoryPageOptionsDto,
    @Query('disable', new DefaultValuePipe(undefined))
    disable?: boolean,
  ): Promise<PageResponseDto<Category>> {
    const { categories, itemCount } = await this.categoryService.getCategories(
      query,
      disable,
    );
    const meta = new PageResponseMetaDto({
      pageOptionsDto: query,
      itemCount: itemCount,
    });
    return new PageResponseDto(categories, meta);
  }
  @Get(GET_ONE)
  async getCategoryById(@Param('id', ParseUUIDPipe) id: string) {
    return new StandardResponse(
      await this.categoryService.getCategoryById(id),
      'Get category successfully',
      HttpStatusCode.OK,
    );
  }
  @Post(DISABLE)
  async disableCategory(@Param('id', ParseUUIDPipe) id: string) {
    const category = await this.categoryService.disableCategory(id);
    const message = 'Disable category successfully';

    await this.chatbotService.deleteEntityCategory(category.name);

    return new StandardResponse(category, message, HttpStatusCode.OK);
  }
  @Put(UPDATE)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    const category = await this.categoryService.update(id, dto);
    const message = 'Update category successfully';
    await this.chatbotService.updateEntityCategory(dto.name, [dto.name]);
    return new StandardResponse(category, message, HttpStatusCode.OK);
  }
  @Post(ENABLE)
  async enable(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StandardResponse<Category>> {
    const category = await this.categoryService.enable(id);
    const message = 'Enable category successfully';

    await this.chatbotService.updateEntityCategory(category.name, [
      category.name,
    ]);
    return new StandardResponse(category, message, HttpStatusCode.OK);
  }
  @Get(SEARCH)
  async search(
    @Query(new ValidationPipe({ transform: true }))
    pageOption: CategoryPageOptionsDto,
    @Query('disable', new DefaultValuePipe(undefined)) disable?: boolean,
    @Query('query', new DefaultValuePipe(undefined)) query?: string,
  ) {
    const { categories, itemCount } = await this.categoryService.search(
      query,
      pageOption,
      disable,
    );
    const meta = new PageResponseMetaDto({
      pageOptionsDto: pageOption,
      itemCount: itemCount,
    });
    return new PageResponseDto(categories, meta);
  }
}
