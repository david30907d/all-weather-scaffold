import React from "react";

export default function AppHeader({ link, title, subTitle, ...props }) {
  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: 15,
          paddingLeft: 20,
          paddingRight: 20,
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            alignItems: "start",
          }}
        >
          <img src="/logo.png" alt="logo" width={120} height={55} />
        </div>
        {props.children}
      </div>
    </>
  );
}
