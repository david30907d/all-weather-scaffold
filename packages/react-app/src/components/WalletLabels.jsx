import React from "react";
import { Icon, Label } from "semantic-ui-react";

const WalletLabels = addresses => {
  return (
    <div>
      {addresses.addresses.map(address => {
        return (
          <Label image>
            {address.substring(0, 4)}...{address.substring(address.length - 4)}
            <Icon name="delete" />
          </Label>
        );
      })}
    </div>
  );
};

export default WalletLabels;
