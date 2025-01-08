import { PrismaService } from 'src/modules/prisma/prisma.service';

export const checkIsExistEmail = async (
  email: string,
  prisma: PrismaService,
) => {
  const user = await prisma.users.findUnique({
    where: {
      email: email,
    },
  });
  return !!user;
};
export const checkIsExistPhoneNumber = async (
  phone: string,
  prisma: PrismaService,
) => {
  const user = await prisma.users.findFirst({
    where: {
      phone: phone,
    },
  });
  return !!user;
};
