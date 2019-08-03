import { SettingPanel } from "./SettingPanel.js";
const { Button, Input, Typography } = antd;
const { TextArea, Search } = Input;
const { Title } = Typography;

export function InputSection({
  src,
  title,
  result,
  url,
  homePageUrl,
  errors,
  stepIntoTemplateButtonDisabled,
  editIntput,
  extensions,
  getTemplateSource,
  inputHighlight,
  handler
}) {
  function inputTextWithHighlight() {
    if (!inputHighlight)
      return (
        <pre className="debugger-input-textarea-pre">
          <code>{src}</code>
        </pre>
      );
    return (
      <React.Fragment>
        <pre className="debugger-input-textarea-pre">
          {inputHighlight[0] > 0 && (
            <code className="disabled">
              {src.substring(0, inputHighlight[0])}
            </code>
          )}
          <code>{src.substring(inputHighlight[0], inputHighlight[1] + 1)}</code>
          {inputHighlight[1] < src.length - 1 && (
            <code className="disabled">
              {src.substring(inputHighlight[1] + 1)}
            </code>
          )}
        </pre>
      </React.Fragment>
    );
  }

  return (
    <div id="debugger-input" className="debugger-section">
      <Title level={4}>Input</Title>
      <SettingPanel
        url={url}
        homePageUrl={homePageUrl}
        extensions={extensions}
        handler={handler}
      />
      <div>
        <Title className="debugger-title" level={4} type="secondary">
          Source
          <Button
            onClick={() => handler({ editIntput: true })}
            disabled={editIntput}
            icon="edit"
            type="primary"
          />
        </Title>
        <Search
          placeholder="Template Title"
          value={title}
          onChange={e => handler({ title: e.target.value })}
          onSearch={getTemplateSource}
          enterButton
        />
        {editIntput ? (
          <TextArea
            value={src}
            id="debugger-input-textarea"
            onChange={e =>
              handler({ src: e.target.value, inputHighlight: null })
            }
          />
        ) : (
          <div id="debugger-input-textarea">{inputTextWithHighlight()}</div>
        )}
      </div>
    </div>
  );
}
