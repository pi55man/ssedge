import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { AppShell, Tabs, Container, Title, TextInput, Button, Paper, Group } from "@mantine/core";
import { IconHome, IconDevices } from "@tabler/icons-react";
import Devices from "./Devices";
import { logger } from "./logger";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
  const [activeTab, setActiveTab] = useState<string | null>("home");

  async function greet() {
    logger.info(`Greeting user: ${name}`);
    try {
      const msg = await invoke("greet", { name });
      setGreetMsg(msg as string);
      logger.info("Greet command executed successfully");
    } catch (error) {
      logger.error(`Failed to greet: ${error}`);
    }
  }

  return (
    <AppShell
      padding="md"
      styles={{
        main: {
          background: '#1a1b1e',
        },
      }}
    >
      <Container size="xl" p="xl">
        <Tabs value={activeTab} onChange={setActiveTab} variant="pills" radius="md">
          <Tabs.List mb="xl">
            <Tabs.Tab value="home" leftSection={<IconHome size={16} />}>
              Home
            </Tabs.Tab>
            <Tabs.Tab value="devices" leftSection={<IconDevices size={16} />}>
              Devices
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="home">
            <Paper shadow="md" p="xl" radius="md" withBorder>
              <Title order={1} mb="xl" ta="center">
                Welcome to Tauri + React
              </Title>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          greet();
        }}
      >
                <Group justify="center" gap="md">
                  <TextInput
                    placeholder="Enter a name..."
                    value={name}
                    onChange={(e) => setName(e.currentTarget.value)}
          size="md"
                    style={{ width: 300 }}
        />
                  <Button type="submit" size="md" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
                    Greet
                  </Button>
        </Group>
              </form>
              
              {greetMsg && (
                <Title order={3} mt="xl" ta="center" c="blue">
                  {greetMsg}
                </Title>
              )}
            </Paper>
          </Tabs.Panel>

          <Tabs.Panel value="devices">
            <Devices />
        </Tabs.Panel>
        </Tabs>
      </Container>
    </AppShell>
  );
}

export default App;
 
 
