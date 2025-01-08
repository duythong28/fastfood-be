import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import dialogflow from '@google-cloud/dialogflow';
import { StatisticService } from '../statistic/statistic.service';
import { requestMessageDto } from './dto/requestMessage.dto';

const CREDENTIALS = JSON.parse(process.env.CREDENTIALS);
const PROJECTID = CREDENTIALS.project_id;

const CONFIGURATION = {
  credentials: {
    private_key: CREDENTIALS['private_key'],
    client_email: CREDENTIALS['client_email'],
  },
};

const sessionClient = new dialogflow.SessionsClient(CONFIGURATION);

const entityCategoryId =
  'projects/fastfood-egpp/agent/entityTypes/70907846-7225-4e48-abb3-8bbfb4d8d7dd';
const entityTypesClient = new dialogflow.EntityTypesClient(CONFIGURATION);

const entityOrderIdId =
  'projects/fastfood-egpp/agent/entityTypes/2b4a5a53-93ea-4dee-a7fc-478ec440f19a';

const entityProductTitleId =
  'projects/fastfood-egpp/agent/entityTypes/32471da4-a180-44f1-b157-5d15705479fd';

@Injectable()
export class ChatbotService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly statisticService: StatisticService,
  ) {}

  async chatbot(requestMessageDto: requestMessageDto) {
    try {
      const message = requestMessageDto.message;
      const sessionId = uuidv4();

      const sessionPath = sessionClient.projectAgentSessionPath(
        PROJECTID,
        sessionId,
      );

      const request = {
        session: sessionPath,
        queryInput: {
          text: {
            text: message,
            languageCode: 'vi',
          },
        },
      };

      const responses = await sessionClient.detectIntent(request);
      const result = responses[0].queryResult;

      if (result.fulfillmentText === 'Best Seller') {
        const response =
          'Chào bạn! FoodzyBot rất vui được giúp bạn tìm món ăn ngon nhé. Hiện tại, các món ăn được khách hàng của chúng mình yêu thích nhất là:';
        const data = await this.statisticService.getBestSellerProduct();
        return { response, data };
      }

      if (result.fulfillmentText.substring(0, 8) === 'Category') {
        const category = result.fulfillmentText.substring(10);
        const response = `Chào bạn! FoodzyBot sẽ gợi ý cho bạn một số ${category} hot nhất nhé!`;

        const data = await this.prismaService.products.findMany({
          orderBy: [{ sold_quantity: 'desc' }],
          where: {
            status: 'ACTIVE',
            Category: {
              name: category,
              is_disable: false,
            },
          },
        });

        if (data.length == 0) {
          const response =
            'Cảm ơn bạn đã quan tâm đến sản phẩm của chúng mình. Hiện tại, sản phẩm mà bạn đang tìm kiếm không có sẵn. Chúng mình rất tiếc vì sự bất tiện này.';
          return { response, data };
        }

        return { response, data };
      }

      if (result.fulfillmentText.substring(0, 7) === 'Product') {
        const title = result.fulfillmentText.substring(9);
        const response = `Chào bạn! Danh sách sản phẩm phù hợp với từ khóa tìm kiếm của bạn là`;

        const data = await this.prismaService.products.findMany({
          orderBy: [{ sold_quantity: 'desc' }],
          where: {
            status: 'ACTIVE',
            title: {
              contains: title ? title : undefined,
              mode: 'insensitive',
            },
          },
        });

        if (data.length == 0) {
          const response =
            'Cảm ơn bạn đã quan tâm đến sản phẩm của chúng mình. Hiện tại, sản phẩm mà bạn đang tìm kiếm không có sẵn. Chúng mình rất tiếc vì sự bất tiện này.';
          return { response, data };
        }

        return { response, data };
      }

      if (result.fulfillmentText.substring(0, 7) === 'OrderId') {
        const orderId = result.fulfillmentText.substring(9);
        let response = 'Chào bạn! Cảm ơn bạn đã đặt hàng tại Foodzy.';

        const data = await this.prismaService.orders.findUnique({
          where: { id: orderId },
        });

        if (!data) {
          response = 'Mã đơn hàng không tồn tại!';
        }

        return { response, data };
      }

      const response = result.fulfillmentText;
      const data = null;
      return { response, data };
    } catch (err) {
      throw new Error(`Error in chatbot: ${err.message}`);
    }
  }

  async updateEntityCategory(category: string, synonyms: string[]) {
    try {
      const [entityType] = await entityTypesClient.getEntityType({
        name: entityCategoryId,
      });

      const newEntityValue = category;

      const existingValues = entityType.entities.map((entity) => entity.value);
      if (existingValues.includes(newEntityValue)) {
        return;
      }

      entityType.entities.push({
        value: newEntityValue,
        synonyms: synonyms,
      });

      const updateEntityRequest = {
        entityType: entityType,
      };

      await entityTypesClient.updateEntityType(updateEntityRequest);
    } catch (err) {
      throw new Error(err.message);
    }
  }

  async updateEntityOrderId(orderId: string) {
    try {
      const [entityType] = await entityTypesClient.getEntityType({
        name: entityOrderIdId,
      });

      const newEntityValue = orderId;

      const existingValues = entityType.entities.map((entity) => entity.value);
      if (existingValues.includes(newEntityValue)) {
        return;
      }

      entityType.entities.push({
        value: newEntityValue,
        synonyms: [orderId],
      });

      const updateEntityRequest = {
        entityType: entityType,
      };

      await entityTypesClient.updateEntityType(updateEntityRequest);
    } catch (err) {
      throw new Error(err.message);
    }
  }

  async deleteEntityOrderId(orderId: string) {
    try {
      const [entityType] = await entityTypesClient.getEntityType({
        name: entityOrderIdId,
      });

      const existingValues = entityType.entities.map((entity) => entity.value);

      if (existingValues.includes(orderId)) {
        const entityIndex = entityType.entities.findIndex(
          (entity) => entity.value === orderId,
        );

        entityType.entities.splice(entityIndex, 1);
      }

      const updateEntityRequest = {
        entityType: entityType,
      };

      await entityTypesClient.updateEntityType(updateEntityRequest);
    } catch (err) {
      throw new Error(err.message);
    }
  }

  async deleteEntityCategory(category: string) {
    try {
      const [entityType] = await entityTypesClient.getEntityType({
        name: entityCategoryId,
      });

      const existingValues = entityType.entities.map((entity) => entity.value);

      if (existingValues.includes(category)) {
        const entityIndex = entityType.entities.findIndex(
          (entity) => entity.value === category,
        );

        entityType.entities.splice(entityIndex, 1);
      }

      const updateEntityRequest = {
        entityType: entityType,
      };

      await entityTypesClient.updateEntityType(updateEntityRequest);
    } catch (err) {
      throw new Error(err.message);
    }
  }

  async updateEntityTitle(title: string, synonyms: string[]) {
    try {
      const [entityType] = await entityTypesClient.getEntityType({
        name: entityProductTitleId,
      });

      const newEntityValue = title;

      const existingValues = entityType.entities.map((entity) => entity.value);
      if (existingValues.includes(newEntityValue)) {
        return;
      }

      entityType.entities.push({
        value: newEntityValue,
        synonyms: synonyms,
      });

      const updateEntityRequest = {
        entityType: entityType,
      };

      await entityTypesClient.updateEntityType(updateEntityRequest);
    } catch (err) {
      throw new Error(err.message);
    }
  }

  async deleteEntityTitle(title: string) {
    try {
      const [entityType] = await entityTypesClient.getEntityType({
        name: entityProductTitleId,
      });

      const existingValues = entityType.entities.map((entity) => entity.value);

      if (existingValues.includes(title)) {
        const entityIndex = entityType.entities.findIndex(
          (entity) => entity.value === title,
        );

        entityType.entities.splice(entityIndex, 1);
      }

      const updateEntityRequest = {
        entityType: entityType,
      };

      await entityTypesClient.updateEntityType(updateEntityRequest);
    } catch (err) {
      throw new Error(err.message);
    }
  }
}
