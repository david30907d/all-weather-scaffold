import { DownOutlined } from "@ant-design/icons";
import { Dropdown, Space } from "antd";
const items = [
  {
    label: <a href="https://www.antgroup.com">1st menu item</a>,
    key: "0000",
  },
  {
    label: <a href="https://www.aliyun.com">2nd menu item</a>,
    key: "1000",
  },
  {
    type: "divider",
  },
  {
    label: "3rd menu item",
    key: "3000",
  },
];
const TokensDropdown = () => (
  <Dropdown
    menu={{
      items,
    }}
    trigger={["click"]}
  >
    <a onClick={e => e.preventDefault()}>
      <Space>
        <DownOutlined />
      </Space>
    </a>
  </Dropdown>
);
export default TokensDropdown;
