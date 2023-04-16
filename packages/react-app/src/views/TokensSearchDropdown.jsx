import { Dropdown } from "semantic-ui-react";
import tokens from "./tokens.json";
const tokenOptions = tokens.props.pageProps.tokenList["42161"].map(token => ({
  key: token.address,
  text: token.symbol,
  value: token.value,
  image: { avatar: true, src: token.logoURI },
}));

const DropdownExampleSearchSelectionTwo = () => (
  <Dropdown placeholder="ETH" search selection options={tokenOptions} defaultValue={tokenOptions[0].value} />
);

export default DropdownExampleSearchSelectionTwo;
