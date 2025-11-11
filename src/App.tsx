import { useState } from "react";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import Sidebar from "./Sidebar";
import Devices from "./Devices";

function App() {
  const [currentView, setCurrentView] = useState<"devices" | null>(null);

  return (
    <MantineProvider
      theme={{
        colorScheme: "dark",
        primaryColor: "blue",
      }}
      defaultColorScheme="dark"
    >
      <Notifications />
      <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        <Sidebar onDevicesClick={() => setCurrentView("devices")} />
        <div
          style={{
            flex: 1,
            marginLeft: 50,
            height: "100vh",
            overflow: "auto",
            padding: "20px",
          }}
        >
          {currentView === "devices" && <Devices />}
        </div>
      </div>
    </MantineProvider>
  );
}

export default App;
