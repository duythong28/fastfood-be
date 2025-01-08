import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create_category.dto';
import { UpdateCategoryDto } from './dto/update_category.dto';
import { CategoryPageOptionsDto } from './dto/find_all_category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}
  async create(body: CreateCategoryDto) {
    const { name } = body;
    const existCategory = await this.prisma.category.findFirst({
      where: { name },
    });
    if (existCategory) {
      throw new BadRequestException('Category already existed');
    }
    const newCategory = await this.prisma.category.create({
      data: {
        name: name,
      },
    });
    return newCategory;
  }
  async getCategoryById(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: id },
    });
    if (!category) {
      throw new BadRequestException('Category not found');
    }
    return category;
  }
  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({
      where: { id: id },
    });
    if (!category) {
      throw new BadRequestException('Category not found');
    }
    const updatedCategory = await this.prisma.category.update({
      where: { id: id },
      data: { name: dto?.name ? dto.name : category.name },
    });
    return updatedCategory;
  }
  async getCategories(query: CategoryPageOptionsDto, disable: boolean) {
    const where = disable !== undefined ? { is_disable: disable } : undefined;

    const [categories, itemCount] = await Promise.all([
      this.prisma.category.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: {
          [query.sortBy]: query.order,
        },
      }),
      this.prisma.category.count({ where }),
    ]);

    return { categories, itemCount };
  }

  async disableCategory(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: id },
    });
    if (!category) {
      throw new BadRequestException('Category not found');
    }
    await this.prisma.category.update({
      where: { id: id },
      data: { is_disable: true },
    });
    return category;
  }
  async enable(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: id },
    });
    if (!category) {
      throw new BadRequestException('Category not found');
    }
    await this.prisma.category.update({
      where: { id: id },
      data: { is_disable: false },
    });
    return category;
  }
  async search(
    query: string,
    pageOption: CategoryPageOptionsDto,
    disable: boolean,
  ) {
    const condition1 = query?.split(/\s+/).filter(Boolean).join(' & ');
    const categories = await this.prisma.category.findMany({
      where: {
        ...(condition1 !== undefined && {
          OR: [
            {
              name: {
                search: condition1,
                mode: 'insensitive',
              },
            },
            {
              name: {
                contains: query,
                mode: 'insensitive',
              },
            },
          ],
        }),
        ...(disable !== undefined && {
          is_disable: disable,
        }),
      },
      take: pageOption.take,
      skip: pageOption.skip,
      orderBy: query
        ? {
            _relevance: {
              fields: ['name'],
              search: condition1,
              sort: 'desc',
            },
          }
        : { [pageOption.sortBy]: pageOption.order },
    });
    const itemCount = await this.prisma.category.count({
      where: {
        ...(condition1 !== undefined && {
          OR: [
            {
              name: {
                search: condition1,
                mode: 'insensitive',
              },
            },
            {
              name: {
                contains: query,
                mode: 'insensitive',
              },
            },
          ],
        }),
        ...(disable !== undefined && {
          is_disable: disable,
        }),
      },
    });
    return { categories, itemCount };
  }
}
