import * as process from 'node:process';

export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  jwt_access_secret: process.env.JWT_ACCESS_SECRET,
  jwt_refresh_secret: process.env.JWT_REFRESH_SECRET,
  email_host: process.env.EMAIL_HOST,
  email_port: parseInt(process.env.EMAIL_PORT, 10),
  email_username: process.env.EMAIL_USERNAME,
  email_password: process.env.EMAIL_PASSWORD,
  smtp_user: process.env.SMTP_USER,
  firebase_project_id: process.env.FIREBASE_PROJECT_ID,
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET,
  redirect_url: process.env.OAUTH_GOOGLE_REDIRECT_URL,
  jwt_oauth_access_secret: process.env.JWT_OAUTH_ACCESS_SECRET,
  default_password: process.env.DEFAULT_PASSWORD,
  success_auth_google: process.env.SUCCESS_AUTH_GOOGLE,
});
