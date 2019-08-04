const { Typography, Button, Icon } = antd;
const { Title } = Typography;

export function CallStackSection({ stepHistory, handler, debug }) {
  const navigateInHistory = index => async () => {
    if (!stepHistory[index].src) return;
    handler(
      {
        src: stepHistory[index].src,
        params: stepHistory[index].params,
        stepHistory: stepHistory.splice(0, index + 1)
      },
      debug
    );
  };

  if (stepHistory.length <= 1) return null;
  return (
    <div id="debugger-call-stack">
      <Title level={4} type="secondary">
        Call Stack
      </Title>
      <div className="non-padding-section">
        {stepHistory.map((h, i) => (
          <React.Fragment key={i}>
            {i > 0 && <Icon type="right" />}
            <Button type="link" onClick={navigateInHistory(i)}>
              {h.title}
            </Button>
          </React.Fragment>
        ))}
      </div>
      {stepHistory.slice(0, stepHistory.length - 1).map((h, i) => (
        <Typography key={i}>
          <strong>{h.title}</strong>: {h.command}
        </Typography>
      ))}
    </div>
  );
}
