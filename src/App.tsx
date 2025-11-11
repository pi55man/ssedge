import { useState } from "react";
import { MantineProvider, Title, Center, Text, Box, Stack, Paper, Group, ThemeIcon } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { IconDevices, IconShield, IconBolt } from "@tabler/icons-react";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import Sidebar from "./Sidebar";
import Devices from "./Devices";

function Home() {
  return (
    <Center style={{ height: "100%", padding: "40px" }}>
      <Stack spacing="xl" style={{ maxWidth: 800, width: "100%" }}>
        <Box style={{ textAlign: "center" }}>
          <Title 
            order={1} 
            mb="md" 
            style={{ 
              fontSize: "4rem", 
              fontWeight: 900,
              background: "linear-gradient(45deg, #228be6 0%, #15aabf 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "-2px"
            }}
          >
            ssedge
          </Title>
          <Text size="xl" color="dimmed" mb="xl">
            Secure device management made simple
          </Text>
        </Box>

        <Group grow spacing="md">
          <Paper shadow="md" p="xl" radius="md" withBorder>
            <Center mb="md">
              <ThemeIcon size={60} radius="md" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
                <IconDevices size={32} />
              </ThemeIcon>
            </Center>
            <Text size="lg" weight={500} align="center" mb="xs">
              Device Management
            </Text>
            <Text size="sm" color="dimmed" align="center">
              Add, monitor, and manage all your devices from a single interface
            </Text>
          </Paper>

          <Paper shadow="md" p="xl" radius="md" withBorder>
            <Center mb="md">
              <ThemeIcon size={60} radius="md" variant="gradient" gradient={{ from: 'teal', to: 'lime' }}>
                <IconShield size={32} />
              </ThemeIcon>
            </Center>
            <Text size="lg" weight={500} align="center" mb="xs">
              Secure Connections
            </Text>
            <Text size="sm" color="dimmed" align="center">
              SSH-based secure connections to keep your infrastructure safe
            </Text>
          </Paper>

          <Paper shadow="md" p="xl" radius="md" withBorder>
            <Center mb="md">
              <ThemeIcon size={60} radius="md" variant="gradient" gradient={{ from: 'orange', to: 'red' }}>
                <IconBolt size={32} />
              </ThemeIcon>
            </Center>
            <Text size="lg" weight={500} align="center" mb="xs">
              Real-time Monitoring
            </Text>
            <Text size="sm" color="dimmed" align="center">
              Track device status and activity with instant updates
            </Text>
          </Paper>
        </Group>

        <Text size="sm" color="dimmed" align="center" mt="xl">
          Click on the devices icon in the sidebar to get started
        </Text>
      </Stack>
    </Center>
  );
}

function App() {
  const [currentView, setCurrentView] = useState<"home" | "devices">("home");

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
        <Sidebar
          onHomeClick={() => setCurrentView("home")}
          onDevicesClick={() => setCurrentView("devices")}
        />
        <div
          style={{
            flex: 1,
            marginLeft: 50,
            height: "100vh",
            overflow: "auto",
            padding: "20px",
          }}
        >
          {currentView === "home" && <Home />}
          {currentView === "devices" && <Devices />}
        </div>
      </div>
    </MantineProvider>
  );
}

export default App;
