import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transporter } from 'nodemailer';
import { renderToStaticMarkup } from 'react-dom/server';
import ResetPasswordEmail from 'src/config/email_pwd.template';
import WelcomeEmail from 'src/config/email_templatet';

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
}
