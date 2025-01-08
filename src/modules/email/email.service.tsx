import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transporter } from 'nodemailer';
import { renderToStaticMarkup } from 'react-dom/server';
import { OrderEmailTemplateDto } from 'src/config/dto/order_email_template_dto';
import ResetPasswordEmail from 'src/config/email_pwd.template';
import WelcomeEmail from 'src/config/email_templatet';
import { OrderRejected } from 'src/config/order_reject_template';
import { Users } from '@prisma/client';
import { OrderProcessing } from 'src/config/order_processing_template';
import { OrderSuccess } from 'src/config/order_success_template';
import { OrderDelivered } from 'src/config/order_delivered_template';

@Injectable()
export class EmailService {
  constructor(
    private configService: ConfigService,
    @Inject('NODEMAILER') private readonly transporter: Transporter,
  ) {}
  async sendEmailVerify({
    to,
    subject,
    userFirstname,
    url,
  }: {
    to: string;
    subject: string;
    userFirstname: string;
    url: string;
  }) {
    const emailHtml = renderToStaticMarkup(
      <WelcomeEmail url={url} userFirstname={userFirstname} />,
    );
    const mailOptions = {
      from: this.configService.get<string>('smtp_user'),
      to,
      subject,
      html: emailHtml,
    };
    await this.transporter.sendMail(mailOptions);
  }
  async sendEmailForgotPwd({
    to,
    subject,
    userFirstname,
    url,
    urlRedirectWithCode,
    code,
  }: {
    to: string;
    subject: string;
    userFirstname: string;
    url: string;
    code: string;
    urlRedirectWithCode: string;
  }) {
    const emailHtml = renderToStaticMarkup(
      <ResetPasswordEmail
        url={url}
        code={code}
        userFirstname={userFirstname}
        urlRedirectWithCode={urlRedirectWithCode}
      />,
    );
    const mailOptions = {
      from: this.configService.get<string>('smtp_user'),
      to,
      subject,
      html: emailHtml,
    };
    await this.transporter.sendMail(mailOptions);
  }
  async sendOrderProcessing({
    order,
    user,
  }: {
    order: OrderEmailTemplateDto;
    user: Users;
  }) {
    const emailHtml = renderToStaticMarkup(
      <OrderProcessing order={order} userName={user.full_name} />,
    );
    const mailOptions = {
      from: this.configService.get<string>('smtp_user'),
      to: user.email,
      subject: 'Order Processing',
      html: emailHtml,
    };
    await this.transporter.sendMail(mailOptions);
  }
  async sendOrderRejected({
    order,
    user,
  }: {
    order: OrderEmailTemplateDto;
    user: Users;
  }) {
    const emailHtml = renderToStaticMarkup(
      <OrderRejected order={order} userName={user.full_name} />,
    );
    const mailOptions = {
      from: this.configService.get<string>('smtp_user'),
      to: user.email,
      subject: 'Order Processing',
      html: emailHtml,
    };
    await this.transporter.sendMail(mailOptions);
  }
  async sendOrderSuccess({
    order,
    user,
  }: {
    order: OrderEmailTemplateDto;
    user: Users;
  }) {
    const emailHtml = renderToStaticMarkup(
      <OrderSuccess order={order} userName={user.full_name} />,
    );
    const mailOptions = {
      from: this.configService.get<string>('smtp_user'),
      to: user.email,
      subject: 'Order Processing',
      html: emailHtml,
    };
    await this.transporter.sendMail(mailOptions);
  }
  async sendOrderDelivering({
    order,
    user,
  }: {
    order: OrderEmailTemplateDto;
    user: Users;
  }) {
    const emailHtml = renderToStaticMarkup(
      <OrderDelivered order={order} userName={user.full_name} />,
    );
    const mailOptions = {
      from: this.configService.get<string>('smtp_user'),
      to: user.email,
      subject: 'Order Processing',
      html: emailHtml,
    };
    await this.transporter.sendMail(mailOptions);
  }
}
