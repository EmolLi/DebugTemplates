const EXTENSIONS = {
  parserFunctions: "parserFunctions",
  variables: "variables",
  stringFunctions: "stringFunctions"
};
const EXTENSIONS_FORMATTED = {
  parserFunctions: "Parser Functions",
  variables: "Variables",
  stringFunctions: "String Functions"
};
const { Collapse, Typography, Input, Checkbox } = antd;
const { Panel } = Collapse;

const { Title } = Typography;

const customPanelStyle = {
  border: 0
};

export function SettingPanel({ url, homePageUrl, extensions, handler }) {
  return (
    <Collapse
      className="debugger-collapse-section"
      expandIconPosition="right"
      bordered={false}
      defaultActiveKey={["1"]}
    >
      <Panel
        header={
          <Title level={4} type="secondary">
            Settings
          </Title>
        }
        key="1"
        style={customPanelStyle}
      >
        <Input
          placeholder="API URL"
          value={url}
          onChange={e => handler({ url: e.target.value })}
        />
        <Input
          placeholder="Home Page URL"
          value={homePageUrl}
          onChange={e => handler({ homePageUrl: e.target.value })}
        />
        <div id="supported-ext">
          {Object.keys(EXTENSIONS).map(ext => (
            <Checkbox
              key={ext}
              onChange={e =>
                handler({
                  extensions: {
                    ...extensions,
                    [ext]: e.target.checked
                  }
                })
              }
              checked={extensions[ext]}
            >
              {EXTENSIONS_FORMATTED[ext]}
            </Checkbox>
          ))}
        </div>
      </Panel>
    </Collapse>
  );
}
