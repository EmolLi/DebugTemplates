const { Typography } = antd;
const { Title, Text } = Typography;

export function ErrorSection({ errors, handler }) {
  return (
    <div id="debugger-errors" className="debugger-section">
      <Title level={4}>Errors</Title>
      <div id="debugger-errors-content">
        {errors && (
          <Text type="danger">
            Error: {errors}
            <br />
          </Text>
        )}
      </div>
    </div>
  );
}
