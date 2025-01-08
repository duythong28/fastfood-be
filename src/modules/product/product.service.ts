import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PriceFilterDto } from './dto/filter-by-price.dto';
import { RatingFilterDto } from './dto/filter-by-rating.dto';
import { uploadFilesFromFirebase } from 'src/libs/firebase/upload';
import { EUploadFolder } from 'src/constants/constant';
import { deleteFilesFromFirebase } from 'src/libs/firebase/delete';
import { ProductQuery } from './query/product.query';

@Injectable()
export class ProductsService {
  constructor(private readonly prismaService: PrismaService) {}

  async getAllProducts(productQuery: ProductQuery, categoryStatus?: boolean) {
    const AND = [
      {
        price: {
          ...(productQuery.min_price && { gte: productQuery.min_price }),
          ...(productQuery.max_price && { lte: productQuery.max_price }),
        },
      },
      {
        avg_stars: {
          ...(productQuery.min_star && { gte: productQuery.min_star }),
          ...(productQuery.max_star && { lte: productQuery.max_star }),
        },
      },
      ...(productQuery.categoryId
        ? [
            {
              Category: { id: productQuery.categoryId },
            },
          ]
        : []),
      ...(categoryStatus !== undefined
        ? [
            {
              Category: { is_disable: categoryStatus },
            },
          ]
        : []),
    ].filter(
      (condition) =>
        Object.keys(condition).length > 0 &&
        Object.keys(Object.values(condition)[0]).length > 0,
    );

    const condition1 =
      productQuery.search?.replace(/\s+/g, '&').trim() ??
      productQuery.title?.replace(/\s+/g, '&').trim();
    const products = await this.prismaService.products.findMany({
      where: {
        ...(condition1 !== undefined && {
          OR: [
            {
              title: {
                search: condition1,
                mode: 'insensitive',
              },
            },
            {
              description: {
                search: condition1,
                mode: 'insensitive',
              },
            },
            {
              description: {
                contains: productQuery.title,
                mode: 'insensitive',
              },
            },
            {
              Category: {
                name: {
                  contains: productQuery.title,
                  mode: 'insensitive',
                },
              },
            },
            {
              Category: {
                name: {
                  search: condition1,
                  mode: 'insensitive',
                },
              },
            },
          ],
        }),
        ...(productQuery.status ? { status: productQuery.status } : {}),
        AND: AND,
      },
      include: {
        Category: true,
      },
      orderBy: [
        condition1 !== undefined
          ? {
              _relevance: {
                fields: ['title', 'description'],
                search: condition1,
                sort: 'desc',
              },
            }
          : {},
        { [productQuery.sortBy]: productQuery.order },
      ],
      skip: productQuery.skip,
      take: productQuery.take,
    });
    const itemCount = await this.prismaService.products.count({
      where: {
        ...(condition1 !== undefined && {
          OR: [
            {
              title: {
                search: condition1,
                mode: 'insensitive',
              },
            },
            {
              title: {
                contains: productQuery.title,
                mode: 'insensitive',
              },
            },
            {
              description: {
                search: condition1,
                mode: 'insensitive',
              },
            },
            {
              description: {
                contains: productQuery.title,
                mode: 'insensitive',
              },
            },
            {
              Category: {
                name: {
                  contains: productQuery.search,
                  mode: 'insensitive',
                },
              },
            },
            {
              Category: {
                name: {
                  search: condition1,
                  mode: 'insensitive',
                },
              },
            },
          ],
        }),
        ...(productQuery.status ? { status: productQuery.status } : {}),
        AND: AND,
      },
    });
    return { products, itemCount };
  }
  async createProduct(
    body: CreateProductDto,
    images?: Array<Express.Multer.File>,
  ) {
    const { title, categoryId, price, description } = body;
    const category = await this.prismaService.category.findFirst({
      where: { id: categoryId },
    });
    if (!category) {
      throw new BadRequestException('Category not found');
    }
    let imageUrls = [];
    try {
      if (images.length > 0) {
        const uploadImagesData = await uploadFilesFromFirebase(
          images,
          EUploadFolder.product,
        );
        if (!uploadImagesData.success) {
          throw new Error('Failed to upload images!');
        }
        imageUrls = uploadImagesData.urls;
      }
      const newProduct = await this.prismaService.products.create({
        data: {
          title: title,
          Category: { connect: { id: categoryId } },
          price,
          description,
          image_url: imageUrls,
        },
      });
      return newProduct;
    } catch (error) {
      console.log('Error:', error.message);
      if (images.length && !imageUrls.length)
        await deleteFilesFromFirebase(imageUrls);
      throw new BadRequestException({
        messaging: error.message,
      });
    }
  }
  async updateProduct(
    id: string,
    dto: UpdateProductDto,
    images: Array<Express.Multer.File>,
  ) {
    const existingProduct = await this.prismaService.products.findFirst({
      where: { id: id },
    });
    if (!existingProduct) {
      throw new BadRequestException('Product not found');
    }
    let imageUrls = [];
    try {
      if (images.length > 0) {
        const uploadImagesData = await uploadFilesFromFirebase(
          images,
          EUploadFolder.product,
        );
        if (!uploadImagesData.success) {
          throw new Error('Failed to upload images!');
        }
        imageUrls = uploadImagesData.urls;
      }
      const { categoryId, image_url, ...dtoExcept } = dto;
      return await this.prismaService.$transaction(async (tx) => {
        const updatedProduct = await tx.products.update({
          where: { id },
          data: {
            ...dtoExcept,
            ...(categoryId && {
              Category: { connect: { id: dto.categoryId } },
            }),
            image_url: imageUrls.length
              ? [...(image_url ? image_url : []), ...imageUrls]
              : existingProduct.image_url,
          },
        });
        return updatedProduct;
      });
    } catch (error) {
      console.log('Error:', error.message);
      if (imageUrls.length && !imageUrls.length)
        await deleteFilesFromFirebase(imageUrls);
      throw new BadRequestException({
        messaging: error.message,
      });
    }
  }
  async getProductDetailsById(id: string) {
    const product = await this.prismaService.products.findFirst({
      where: { id },
    });
    if (!product) {
      throw new BadRequestException('Product not found');
    }
    return product;
  }
  async searchByPrice(dto: PriceFilterDto, query: ProductQuery) {
    const products = await this.prismaService.products.findMany({
      where: {
        price: {
          gte: dto.minPrice,
          lte: dto.maxPrice,
        },
      },
      take: query.take,
      skip: query.skip,
      orderBy: { [query.sortBy]: query.order },
    });
    const itemCount = await this.prismaService.products.count({
      where: {
        price: {
          gte: dto.minPrice,
          lte: dto.maxPrice,
        },
      },
    });
    return { products, itemCount };
  }
  async searchByRating(dto: RatingFilterDto, query: ProductQuery) {
    const products = await this.prismaService.products.findMany({
      where: {
        avg_stars: {
          gte: dto.minRating,
          lte: dto.maxRating,
        },
      },
      take: query.take,
      skip: query.skip,
      orderBy: { [query.sortBy]: query.order },
    });
    const itemCount = await this.prismaService.products.count({
      where: {
        avg_stars: {
          gte: dto.minRating,
          lte: dto.maxRating,
        },
      },
    });
    return { products, itemCount };
  }
  async searchProduct(query: string, productQuery: ProductQuery) {
    const products = await this.prismaService.products.findMany({
      where: {
        OR: [
          {
            title: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
        ...(productQuery.status && { status: productQuery.status }),
      },
      take: productQuery.take,
      skip: productQuery.skip,
      orderBy: { [productQuery.sortBy]: productQuery.order },
    });
    const itemCount = await this.prismaService.products.count({
      where: {
        OR: [
          {
            title: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
      },
    });
    return { products, itemCount };
  }
  async searchByCategory(categoryId: string, productQuery: ProductQuery) {
    const products = await this.prismaService.products.findMany({
      where: {
        Category: {
          id: categoryId,
        },
        ...(productQuery.status && { status: productQuery.status }),
      },
      take: productQuery.take,
      skip: productQuery.skip,
      orderBy: { [productQuery.sortBy]: productQuery.order },
    });
    const itemCount = await this.prismaService.products.count({
      where: {
        Category: {
          id: categoryId,
        },
      },
    });
    return { products, itemCount };
  }
  async activeProduct(id: string) {
    const existingProduct = await this.prismaService.products.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });
    if (!existingProduct) {
      throw new BadRequestException('Product not found');
    }
    return existingProduct;
  }
  async inactiveProduct(id: string) {
    const existingProduct = await this.prismaService.products.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
    if (!existingProduct) {
      throw new BadRequestException('Product not found');
    }
    return existingProduct;
  }
}
