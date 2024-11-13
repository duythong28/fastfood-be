import {
  Body,
  Controller,
  Get,
  Param,
  ParseFilePipeBuilder,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CreateBookDto } from './dto/create-book.dto';
import { BooksService } from './books.service';
import { StandardResponse } from 'src/utils/response.dto';
import { Books } from '@prisma/client';
import { BookQuery } from './query/book.query';
import { UpdateBookDto } from './dto/update-book.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { PriceFilterDto } from './dto/filter-by-price.dto';
import { RatingFilterDto } from './dto/filter-by-rating.dto';
import { DOCUMENTATION } from 'src/constants/documentation';
import { END_POINTS } from 'src/constants/end_points';
import { FILE_TYPES_REGEX } from 'src/constants/constraints';
import HttpStatusCode from 'src/constants/http_status_code';
import { PageResponseDto } from 'src/utils/page_response.dto';
import { PageResponseMetaDto } from 'src/utils/page_response_meta.dto';
import { PageOptionsDto } from 'src/utils/page_option.dto';

const {
  BOOKS: {
    BASE,
    GET_ALL,
    CREATE,
    UPDATE,
    GET_ONE,
    SEARCH,
    SEARCH_BY_PRICE,
    SEARCH_BY_RATING,
    SEARCH_BY_CATEGORY,
    ACTIVE,
    INACTIVE,
  },
} = END_POINTS;

@ApiTags(DOCUMENTATION.TAGS.BOOKS)
@Controller(BASE)
export class BooksController {
  constructor(private readonly bookService: BooksService) {}
  @ApiOperation({
    summary: 'Get all books',
    description: 'Allow admin/ customer',
  })
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
  @ApiQuery({
    name: 'title',
    required: false,
    type: String,
    description: 'Book title',
  })
  @ApiQuery({
    name: 'author',
    required: false,
    type: String,
    description: 'Book author',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    type: String,
    description: 'Book category',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['INSTOCK', 'OUTOFSTOCK'],
    description: 'Book status',
  })
  @Get(GET_ALL)
  @UsePipes(new ValidationPipe({ transform: true }))
  async getAllBooks(
    @Query() bookQuery: BookQuery,
  ): Promise<PageResponseDto<Books>> {
    const { books, itemCount } = await this.bookService.getAllBooks(bookQuery);
    const pageOptionsDto = new PageOptionsDto(bookQuery);
    const meta = new PageResponseMetaDto({
      pageOptionsDto,
      itemCount: itemCount,
    });
    return new PageResponseDto(books, meta);
  }
  @ApiOperation({
    summary: 'Create a new book',
    description: 'Allow admin',
  })
  @Post(CREATE)
  @UseInterceptors(FilesInterceptor('images'))
  async createBook(
    @Body() body: CreateBookDto,
    @UploadedFiles(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: FILE_TYPES_REGEX,
        })
        .build({
          fileIsRequired: false,
        }),
    )
    images?: Array<Express.Multer.File>,
  ): Promise<StandardResponse<Books>> {
    const newBook: Books = await this.bookService.createBook(body, images);
    const message = 'Create book successfully';
    return new StandardResponse(newBook, message, HttpStatusCode.CREATED);
  }
  @ApiOperation({
    summary: 'Update a book',
    description: 'Allow admin',
  })
  @Patch(UPDATE)
  @UseInterceptors(FilesInterceptor('images_update'))
  async updateBook(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBookDto,
    @UploadedFiles(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: FILE_TYPES_REGEX,
        })
        .build({
          fileIsRequired: false,
        }),
    )
    images?: Array<Express.Multer.File>,
  ): Promise<StandardResponse<Books>> {
    const updatedBook: Books = await this.bookService.updateBook(
      id,
      dto,
      images,
    );
    const message = 'Update book successfully';
    return new StandardResponse(updatedBook, message, HttpStatusCode.OK);
  }
  @ApiOperation({
    summary: 'Get a book by id',
    description: 'Allow admin/ customer',
  })
  @Get(GET_ONE)
  async getBookDetailsById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StandardResponse<Books>> {
    const book: Books = await this.bookService.getBookDetailsById(id);
    const message = 'Get book successfully';
    return new StandardResponse(book, message, HttpStatusCode.OK);
  }
  @Get(SEARCH_BY_PRICE)
  async searchByPrice(@Body() dto: PriceFilterDto, @Query() query: BookQuery) {
    const { books, itemCount } = await this.bookService.searchByPrice(
      dto,
      query,
    );
    const meta = new PageResponseMetaDto({
      pageOptionsDto: query,
      itemCount: itemCount,
    });
    return new PageResponseDto(books, meta);
  }
  @Get(SEARCH_BY_RATING)
  async searchByRating(
    @Body() dto: RatingFilterDto,
    @Query() query: BookQuery,
  ) {
    const { books, itemCount } = await this.bookService.searchByRating(
      dto,
      query,
    );
    const meta = new PageResponseMetaDto({
      pageOptionsDto: query,
      itemCount: itemCount,
    });
    return new PageResponseDto(books, meta);
  }
  @Get(SEARCH)
  async searchBook(
    @Query() bookQuery: BookQuery,
    @Query('query') query?: string,
  ) {
    const { books, itemCount } = await this.bookService.searchBook(
      query,
      bookQuery,
    );
    const meta = new PageResponseMetaDto({
      pageOptionsDto: bookQuery,
      itemCount: itemCount,
    });
    return new PageResponseDto(books, meta);
  }
  @Get(SEARCH_BY_CATEGORY)
  async searchByCategory(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Query() BookQuery: BookQuery,
  ) {
    const { books, itemCount } = await this.bookService.searchByCategory(
      categoryId,
      BookQuery,
    );
    const meta = new PageResponseMetaDto({
      pageOptionsDto: BookQuery,
      itemCount: itemCount,
    });
    return new PageResponseDto(books, meta);
  }
  @Post(ACTIVE)
  async enableBook(@Param('id', ParseUUIDPipe) id: string) {
    const book = await this.bookService.activeBook(id);
    return new StandardResponse(
      book,
      'Enable book successfully',
      HttpStatusCode.OK,
    );
  }
  @Post(INACTIVE)
  async disableBook(@Param('id', ParseUUIDPipe) id: string) {
    const book = await this.bookService.inactiveBook(id);
    return new StandardResponse(
      book,
      'Disable book successfully',
      HttpStatusCode.OK,
    );
  }
}
