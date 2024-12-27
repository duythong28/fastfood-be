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

  async getAllProducts(productQuery: ProductQuery) {
    const products = await this.prismaService.products.findMany({
      where: {
        title: {
          contains: productQuery.title,
          mode: 'insensitive',
        },
        Category: {
          name: {
            contains: productQuery.search ? productQuery.search : undefined,
            mode: 'insensitive',
          },
        },
        ...(productQuery.status ? { status: productQuery.status } : {}),
        ...(productQuery.min_price && {
          price: { gte: productQuery.min_price },
        }),
        ...(productQuery.max_price && {
          price: { lte: productQuery.max_price },
        }),
        ...(productQuery.min_star && {
          avg_stars: { gte: productQuery.min_star },
        }),
        ...(productQuery.max_star && {
          avg_stars: { lte: productQuery.max_star },
        }),
      },
      include: {
        Category: true,
      },
      orderBy: {
        [productQuery.sortBy || 'created_at']: productQuery.order || 'desc',
      },
      skip: productQuery.skip,
      take: productQuery.take,
    });
    const itemCount = await this.prismaService.products.count({
      where: {
        title: {
          contains: productQuery.title,
          mode: 'insensitive',
        },
        Category: {
          name: {
            contains: productQuery.search ? productQuery.search : undefined,
            mode: 'insensitive',
          },
        },
        ...(productQuery.status ? { status: productQuery.status } : {}),
        ...(productQuery.min_price && {
          price: { gte: productQuery.min_price },
        }),
        ...(productQuery.max_price && {
          price: { lte: productQuery.max_price },
        }),
        ...(productQuery.min_star && {
          avg_stars: { gte: productQuery.min_star },
        }),
        ...(productQuery.max_star && {
          avg_stars: { lte: productQuery.max_star },
        }),
      },
    });
    return { products, itemCount };
  }
  async createProduct(
    body: CreateProductDto,
    images?: Array<Express.Multer.File>,
  ) {
    const {
      title,
      author,
      categoryId,
      entryPrice,
      price,
      stockQuantity,
      description,
    } = body;
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
          author: author,
          Category: { connect: { id: categoryId } },
          entry_price: entryPrice,
          price,
          stock_quantity: parseInt(stockQuantity, 10),
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
      return await this.prismaService.$transaction(async (tx) => {
        const updatedProduct = await tx.products.update({
          where: { id },
          data: {
            title: dto.title,
            description: dto.description,
            image_url: imageUrls.length
              ? [...(dto.image_url ? dto.image_url : []), ...imageUrls]
              : existingProduct.image_url,
            price: dto?.price ?? existingProduct.price,
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
          {
            author: {
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
          {
            author: {
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
