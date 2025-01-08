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
import { CreateProductDto } from './dto/create-product.dto';
import { ProductsService } from './product.service';
import { StandardResponse } from 'src/utils/response.dto';
import { Products } from '@prisma/client';
import { ProductQuery } from './query/product.query';
import { UpdateProductDto } from './dto/update-product.dto';
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
import { Public } from 'src/common/decorators/public.decorator';

const {
  PRODUCTS: {
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

@ApiTags(DOCUMENTATION.TAGS.PRODUCT)
@Controller(BASE)
export class ProductsController {
  constructor(private readonly productService: ProductsService) {}
  @ApiOperation({
    summary: 'Get all products',
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
    description: 'Product title',
  })
  @ApiQuery({
    name: 'author',
    required: false,
    type: String,
    description: 'Product author',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    type: String,
    description: 'Product category',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['INSTOCK', 'OUTOFSTOCK'],
    description: 'Product status',
  })
  @Public()
  @Get(GET_ALL)
  @UsePipes(new ValidationPipe({ transform: true }))
  async getAllProducts(
    @Query() productQuery: ProductQuery,
    @Query('categoryStatus') categoryStatus?: boolean,
  ): Promise<PageResponseDto<Products>> {
    const { products, itemCount } = await this.productService.getAllProducts(
      productQuery,
      categoryStatus,
    );
    const pageOptionsDto = new PageOptionsDto(productQuery);
    const meta = new PageResponseMetaDto({
      pageOptionsDto,
      itemCount: itemCount,
    });
    return new PageResponseDto(products, meta);
  }
  @ApiOperation({
    summary: 'Create a new product',
    description: 'Allow admin',
  })
  @Post(CREATE)
  @UseInterceptors(FilesInterceptor('images'))
  async createProduct(
    @Body() body: CreateProductDto,
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
  ): Promise<StandardResponse<Products>> {
    const newProduct: Products = await this.productService.createProduct(
      body,
      images,
    );
    const message = 'Create product successfully';
    return new StandardResponse(newProduct, message, HttpStatusCode.CREATED);
  }
  @ApiOperation({
    summary: 'Update a product',
    description: 'Allow admin',
  })
  @Patch(UPDATE)
  @UseInterceptors(FilesInterceptor('images_update'))
  async updateProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
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
  ): Promise<StandardResponse<Products>> {
    const updatedProduct: Products = await this.productService.updateProduct(
      id,
      dto,
      images,
    );
    const message = 'Update product successfully';
    return new StandardResponse(updatedProduct, message, HttpStatusCode.OK);
  }
  @ApiOperation({
    summary: 'Get a Product by id',
    description: 'Allow admin/ customer',
  })
  @Get(GET_ONE)
  @Public()
  async getProductDetailsById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StandardResponse<Products>> {
    const product: Products =
      await this.productService.getProductDetailsById(id);
    const message = 'Get product successfully';
    return new StandardResponse(product, message, HttpStatusCode.OK);
  }
  @Get(SEARCH_BY_PRICE)
  async searchByPrice(
    @Body() dto: PriceFilterDto,
    @Query() query: ProductQuery,
  ) {
    const { products, itemCount } = await this.productService.searchByPrice(
      dto,
      query,
    );
    const meta = new PageResponseMetaDto({
      pageOptionsDto: query,
      itemCount: itemCount,
    });
    return new PageResponseDto(products, meta);
  }
  @Get(SEARCH_BY_RATING)
  async searchByRating(
    @Body() dto: RatingFilterDto,
    @Query() query: ProductQuery,
  ) {
    const { products, itemCount } = await this.productService.searchByRating(
      dto,
      query,
    );
    const meta = new PageResponseMetaDto({
      pageOptionsDto: query,
      itemCount: itemCount,
    });
    return new PageResponseDto(products, meta);
  }
  @Get(SEARCH)
  async searchProduct(
    @Query() productQuery: ProductQuery,
    @Query('query') query?: string,
  ) {
    const { products, itemCount } = await this.productService.searchProduct(
      query,
      productQuery,
    );
    const meta = new PageResponseMetaDto({
      pageOptionsDto: productQuery,
      itemCount: itemCount,
    });
    return new PageResponseDto(products, meta);
  }
  @Get(SEARCH_BY_CATEGORY)
  async searchByCategory(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Query() productQuery: ProductQuery,
  ) {
    const { products, itemCount } = await this.productService.searchByCategory(
      categoryId,
      productQuery,
    );
    const meta = new PageResponseMetaDto({
      pageOptionsDto: productQuery,
      itemCount: itemCount,
    });
    return new PageResponseDto(products, meta);
  }
  @Post(ACTIVE)
  async enableProduct(@Param('id', ParseUUIDPipe) id: string) {
    const product = await this.productService.activeProduct(id);
    return new StandardResponse(
      product,
      'Enable product successfully',
      HttpStatusCode.OK,
    );
  }
  @Post(INACTIVE)
  async disableProduct(@Param('id', ParseUUIDPipe) id: string) {
    const product = await this.productService.inactiveProduct(id);
    return new StandardResponse(
      product,
      'Disable product successfully',
      HttpStatusCode.OK,
    );
  }
}
