const { Typography, Icon } = antd;
const { Title } = Typography;
import { OPT_CODE_VALIDATION_STATUS } from "../Enums";

export function CodePad({ src, optCodeValidationStatus }) {
  function getStatusIcon() {
    switch (optCodeValidationStatus) {
      case OPT_CODE_VALIDATION_STATUS.SUCCESS:
        return (
          <Icon
            className="title-right-icon"
            type="check-circle"
            theme="filled"
          />
        );
      case OPT_CODE_VALIDATION_STATUS.ERROR:
        return (
          <Icon
            className="title-right-icon"
            type="exclamation-circle"
            theme="filled"
          />
        );
      default:
        return <Icon className="title-right-icon" type="loading" />;
    }
  }
  return (
    <div id="code-pad">
      <Title level={4} type="secondary">
        Optimized Code
        {getStatusIcon()}
      </Title>

      <div id="debugger-input-textarea">
        <pre className="debugger-input-textarea-pre">
          <code>{src}</code>
        </pre>
      </div>
    </div>
  );
}
