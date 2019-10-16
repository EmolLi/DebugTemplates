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
    if (
      !inputHighlight ||
      inputHighlight.length == 0 ||
      inputHighlight.length % 2 != 0
    )
      return (
        <pre className="debugger-input-textarea-pre">
          <code>{src}</code>
        </pre>
      );
    return highlightSrc();
  }

  function highlightSrc() {
    let start = 0;
    let highlightStartIndex = 0;
    let highlightEndIndex = 1;

    let formattedSrc = [];
    while (highlightEndIndex < inputHighlight.length) {
      formattedSrc.push(
        <React.Fragment key={start}>
          <code className="disabled">
            {src.substring(start, inputHighlight[highlightStartIndex])}
          </code>
          <code>
            {src.substring(
              inputHighlight[highlightStartIndex],
              inputHighlight[highlightEndIndex] + 1
            )}
          </code>
        </React.Fragment>
      );
      start = inputHighlight[highlightEndIndex] + 1;
      highlightStartIndex += 2;
      highlightEndIndex += 2;
    }
    formattedSrc.push(
      <code className="disabled" key={start}>
        {src.substring(start)}
      </code>
    );
    return <pre className="debugger-input-textarea-pre">{formattedSrc}</pre>;
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
