import { Controller, Post, Body } from '@nestjs/common';
import { StandardResponse } from 'src/utils/response.dto';
import HttpStatusCode from 'src/constants/http_status_code';
import { ChatbotService } from './chatbot.service';
import { Products } from '@prisma/client';
import { requestMessageDto } from './dto/requestMessage.dto';

@Controller('/chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}
  @Post('/')
  async createDailyStatistic(
    @Body() requestMessageDto: requestMessageDto,
  ): Promise<StandardResponse<Products>> {
    const { response, data } =
      await this.chatbotService.chatbot(requestMessageDto);
    return new StandardResponse(data, response, HttpStatusCode.OK);
  }
}
