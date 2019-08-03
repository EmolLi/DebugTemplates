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
  handler
}) {
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
          <div id="debugger-input-textarea">
            {this.inputTextWithHighlight()}
          </div>
        )}
      </div>
    </div>
  );
}
