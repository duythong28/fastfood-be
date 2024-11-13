import { Gender, PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
const prisma = new PrismaClient();

export const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};
import { faker } from '@faker-js/faker';
import category_data from './seeds/categories';
import { USER_IMAGE_URL } from 'src/constants/constant';
async function main() {
  /**
   * Neccessary to hash the password before seeding
   * Neccessary seeds: authors, categories, books, carts, orders, comments
   */
  const category_ids = (await prisma.category.findMany({})).map(
    (category) => category.id,
  );
  console.log(category_ids);
  await prisma.category.createMany({
    data: category_data,
  });
  const hashedPasswordAdmin = await hashPassword('admin123');
  const hashedPasswordCustomer = await hashPassword('customer123');
  const hashedPasswordTestUser = await hashPassword('testuser123');
  await prisma.users.create({
    data: {
      email: 'admin@gmail.com',
      password: hashedPasswordAdmin,
      role: 'ADMIN',
      phone: '0896423104',
      full_name: 'Admin',
      birthday: new Date('2004-01-31'),
      gender: Gender.MALE,
      avatar_url: USER_IMAGE_URL,
      verification: {
        create: {
          is_active: true,
          verified_code: hashedPasswordAdmin,
        },
      },
    },
  });
  await prisma.users.create({
    data: {
      email: 'customer@gmail.com',
      password: hashedPasswordCustomer,
      role: 'CUSTOMER',
      phone: '0763769185',
      full_name: 'Customer',
      birthday: new Date('2004-01-31'),
      gender: Gender.MALE,
      avatar_url: USER_IMAGE_URL,
      verification: {
        create: {
          is_active: true,
          verified_code: hashedPasswordCustomer,
        },
      },
    },
  });
  for (let i = 0; i < 100; i++) {
    await prisma.users.create({
      data: {
        email: faker.internet.email(),
        password: hashedPasswordTestUser,
        role: Role.CUSTOMER,
        phone: faker.phone.number({ style: 'national' }),
        full_name: faker.internet.userName(),
        birthday: new Date('31-01-2004'),
        gender: Gender.MALE,
        avatar_url: USER_IMAGE_URL,
        verification: {
          create: {
            is_active: true,
            verified_code: hashedPasswordTestUser,
          },
        },
      },
    });
  }
  for (let i = 0; i < 1000; i++) {
    await prisma.books.create({
      data: {
        title: faker.lorem.words(3),
        description: faker.lorem.sentence(),
        entry_price: faker.number.int({ min: 800000, max: 850000 }),
        price: faker.number.int({ min: 900000, max: 1000000 }),
        stock_quantity: faker.number.int({ min: 10000, max: 1000000 }),
        Category: {
          connect: {
            id: category_ids[
              faker.number.int({ min: 0, max: category_ids.length - 1 })
            ],
          },
        },
        author: 'mock author',
        image_url: [
          'https://img.freepik.com/free-vector/hand-drawn-flat-design-stack-books-illustration_23-2149341898.jpg?size=338&ext=jpg',
          'https://c8.alamy.com/comp/2NFNTAR/stack-of-old-vintage-books-hand-drawn-color-watercolor-illustration-learning-2NFNTAR.jpg',
        ],
      },
    });
  }
}
// main()
//   .catch(async (e) => {
//     console.error(e);
//     await prisma.$disconnect();
//     process.exit(1);
//   })
//   .finally(async () => {
//     console.log('Seeding done!');
//     await prisma.$disconnect();
//   });
