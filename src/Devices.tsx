import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Card,
  Text,
  Badge,
  Group,
  Button,
  Grid,
  TextInput,
  Paper,
  Title,
  Stack,
  ActionIcon,
  Loader,
  Center,
  Box,
} from "@mantine/core";
import {
  IconRefresh,
  IconPlus,
  IconTrash,
  IconDeviceDesktop,
} from "@tabler/icons-react";
import { logger } from "./logger";

interface Device {
  id: number;
  name: string;
  ip: string;
  last_seen: number | null;
}

function Devices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingDevice, setAddingDevice] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDevice, setNewDevice] = useState({ name: "", ip: "" });

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    setLoading(true);
    logger.info("Fetching devices from backend");
    try {
      const result = await invoke<Device[]>("get_devices");
      setDevices(result);
      logger.info(`Successfully fetched ${result.length} devices`);
    } catch (error) {
      logger.error(`Failed to fetch devices: ${error}`);
      console.error("Failed to fetch devices:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    logger.info(`Connecting and adding device: ${newDevice.name} (${newDevice.ip})`);
    setAddingDevice(true);
    try {
      const result = await invoke("connect_and_add_device", { 
        hostname: newDevice.name, 
        ip: newDevice.ip 
      });
      logger.info("Device connected and added successfully", result);
      console.log("Device connection result:", result);
      setNewDevice({ name: "", ip: "" });
      setShowAddForm(false);
      await fetchDevices();
    } catch (error) {
      logger.error(`Failed to connect and add device: ${error}`);
      console.error("Failed to connect and add device:", error);
      alert(`Failed to add device: ${error}`);
    } finally {
      setAddingDevice(false);
    }
  };

  const handleDeleteDevice = async (id: number) => {
    logger.info(`Deleting device: ${id}`);
    try {
      await invoke("delete_device", { id });
      logger.info(`Device deleted successfully: ${id}`);
      fetchDevices();
    } catch (error) {
      logger.error(`Failed to delete device: ${error}`);
      console.error("Failed to delete device:", error);
    }
  };

  const formatLastSeen = (timestamp: number | null) => {
    if (!timestamp) return "Never";
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  };

  return (
    <Box>
      <Group position="apart" mb="md">
        <Title order={2}>Devices</Title>
        <Group>
          <ActionIcon onClick={fetchDevices} variant="outline" disabled={loading || addingDevice}>
            <IconRefresh />
          </ActionIcon>
          <ActionIcon onClick={() => setShowAddForm((v) => !v)} variant="outline" disabled={addingDevice}>
            <IconPlus />
          </ActionIcon>
        </Group>
      </Group>
      {loading ? (
        <Center>
          <Loader />
        </Center>
      ) : (
        <Grid>
          {devices.map((device) => (
            <Grid.Col span={4} key={device.id}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Group position="apart">
                  <Group>
                    <IconDeviceDesktop size={32} />
                    <Text weight={500}>{device.name}</Text>
                  </Group>
                  <ActionIcon 
                    color="red" 
                    onClick={() => handleDeleteDevice(device.id)}
                    disabled={addingDevice}
                  >
                    <IconTrash />
                  </ActionIcon>
                </Group>
                <Text size="sm" color="dimmed">
                  IP: {device.ip}
                </Text>
                <Badge color={device.last_seen ? "green" : "gray"} mt="sm">
                  Last seen: {formatLastSeen(device.last_seen)}
                </Badge>
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      )}
      {showAddForm && (
        <Paper shadow="xs" p="md" mt="md">
          <form onSubmit={handleAddDevice}>
            <Stack>
              <TextInput
                label="Device Name"
                value={newDevice.name}
                onChange={(e) => setNewDevice({ ...newDevice, name: e.currentTarget.value })}
                required
                disabled={addingDevice}
              />
              <TextInput
                label="IP Address"
                value={newDevice.ip}
                onChange={(e) => setNewDevice({ ...newDevice, ip: e.currentTarget.value })}
                required
                disabled={addingDevice}
              />
              <Group position="right">
                <Button type="submit" loading={addingDevice}>Add Device</Button>
                <Button 
                  variant="outline" 
                  color="red" 
                  onClick={() => {
                    setShowAddForm(false);
                    setNewDevice({ name: "", ip: "" });
                  }}
                  disabled={addingDevice}
                >
                  Cancel
                </Button>
              </Group>
            </Stack>
          </form>
        </Paper>
      )}
    </Box>
  );
}

export default Devices;

