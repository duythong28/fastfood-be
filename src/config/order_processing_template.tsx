import { Body, Head, Html, Preview } from '@react-email/components';
import { OrderEmailTemplateDto } from './dto/order_email_template_dto';

interface OrderSuccessProps {
  order: OrderEmailTemplateDto;
  userName: string;
}

export const OrderProcessing = ({ order, userName }: OrderSuccessProps) => {
  return (
    <Html>
      <Head />
      <Preview>
        The sales intelligence platform that helps you uncover qualified leads.
      </Preview>
      <Body style={main}>
        <h1 style={title}>Fastfood - Đơn hàng đang được xử lý</h1>
        <p style={paragraph}>Hi {userName},</p>
        <p style={paragraph}>
          Fastfood xin chân thành cảm ơn bạn vì đã mua hàng. Đơn đặt hàng của
          bạn đang được xử lý. Dưới đây là chi tiết đơn hàng của bạn:
        </p>
        <p style={paragraph}>
          <strong>Mã đơn hàng:</strong> {order.id}
        </p>
        <p style={paragraph}>
          <strong>Ngày đặt hàng:</strong> {order.created_at.toTimeString()}
        </p>
        <p style={paragraph}>
          <strong>Tổng giá trị đơn hàng:</strong> {order.total_price.toString()}{' '}
          VND
        </p>
        <p style={paragraph}>
          <strong>Phương thức thanh toán:</strong> {order.payment_method}
        </p>
        <p style={paragraph}>
          <strong>Địa chỉ nhận hàng:</strong> {order.address}
        </p>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={tableHeaderStyle}>Ảnh sản phẩm</th>
              <th style={tableHeaderStyle}>Tên món ăn</th>
              <th style={tableHeaderStyle}>Số Lượng</th>
              <th style={tableHeaderStyle}>Giá</th>
            </tr>
          </thead>
          <tbody>
            {order.OrderItems.map((orderItem) => (
              <tr key={orderItem.product.id}>
                <td style={tableCellStyle}>
                  <img
                    src={orderItem.product.image_url[0]}
                    alt="Product Image"
                    style={imageStyle}
                  />
                </td>
                <td style={tableCellStyle}>{orderItem.product.title}</td>
                <td style={tableCellStyle}>{orderItem.quantity}</td>
                <td style={tableCellStyle}>{orderItem.price} VND</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Body>
    </Html>
  );
};

const main = {
  fontFamily: 'Arial, sans-serif',
  padding: '20px',
};

const title = {
  color: '#47699d',
  fontSize: '24px',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '1.5',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  marginTop: '20px',
};

const tableHeaderStyle = {
  textAlign: 'left' as const,
  padding: '10px',
  borderBottom: '2px solid #ddd',
  fontWeight: 'bold',
};

const tableCellStyle = {
  padding: '10px',
  borderBottom: '1px solid #ddd',
};

const imageStyle = {
  maxWidth: '100px',
  height: 'auto',
  borderRadius: '8px',
  display: 'block',
  margin: '0 auto',
};
