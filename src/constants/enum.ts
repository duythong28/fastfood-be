export enum ORDER {
  ASC = 'asc',
  DESC = 'desc',
}
export enum ROLE {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF',
  CUSTOMER = 'CUSTOMER',
}
export enum DateFormat {
  DATE = 'DD-MM-YYYY',
  DATE_TIME = 'DD-MM-YYYY HH:mm:ss',
  TIME_DATE = 'HH:mm:ss DD-MM-YYYY',
}
export const ORDER_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  SUCCESS: 'SUCCESS',
  REJECT: 'REJECT',
};

export enum BOOKSTATUS {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum GENDER {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export enum ReviewState {
  UNANSWERED = 'UNANSWERED',
  ANSWERED = 'ANSWERED',
}
