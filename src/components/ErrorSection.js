const { Typography } = antd;
const { Title, Text } = Typography;

export function ErrorSection({ errors, unmatchedBracket, handler }) {
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
        {unmatchedBracket &&
          unmatchedBracket.length > 0 &&
          unmatchedBracket.map((b, i) => (
            <Text
              type="warning"
              key={i}
              onClick={() => handler({ inputHighlight: [b.start, b.start] })}
            >
              Warning: unmacthed bracket {b.value}
              <br />
            </Text>
          ))}
      </div>
    </div>
  );
}
