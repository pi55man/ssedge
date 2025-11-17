import { useState, useEffect, useRef } from "react";
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
  Modal,
  Progress,
  Tooltip,
  ThemeIcon,
  Transition,
  Divider,
} from "@mantine/core";
import {
  IconRefresh,
  IconPlus,
  IconTrash,
  IconDeviceDesktop,
  IconActivity,
  IconCpu,
  IconDatabase,
  IconServer,
  IconClock,
  IconChartLine,
} from "@tabler/icons-react";
import { logger } from "./logger";

interface Device {
  id: number;
  name: string;
  ip: string;
  last_seen: number | null;
}

interface SystemMetrics {
  cpu_usage: number;
  memory_used_mb: number;
  memory_total_mb: number;
  memory_percent: number;
  disk_used_gb: number;
  disk_total_gb: number;
  disk_percent: number;
  uptime_seconds: number;
  load_average: string;
  timestamp: number;
}

function Devices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingDevice, setAddingDevice] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const metricsIntervalRef = useRef<number | null>(null);
  const [newDevice, setNewDevice] = useState({
    name: "",
    ip: "",
    username: "",
    port: "22",
    strictHostKeyChecking: true,
    connectTimeout: "30"
  });

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    // Cleanup metrics interval on unmount or when metrics modal closes
    return () => {
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
      }
    };
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
      // Use advanced config if custom values are provided
      const useAdvancedConfig = newDevice.username || newDevice.port !== "22" ||
        !newDevice.strictHostKeyChecking || newDevice.connectTimeout !== "30";

      const result = useAdvancedConfig
        ? await invoke("connect_and_add_device_with_config", {
          hostname: newDevice.name,
          ip: newDevice.ip,
          username: newDevice.username || null,
          port: newDevice.port ? parseInt(newDevice.port) : null,
          strictHostKeyChecking: newDevice.strictHostKeyChecking,
          connectTimeout: newDevice.connectTimeout ? parseInt(newDevice.connectTimeout) : null
        })
        : await invoke("connect_and_add_device", {
          hostname: newDevice.name,
          ip: newDevice.ip
        });

      logger.info(`Device connected and added successfully: ${result}`);
      console.log("Device connection result:", result);
      setNewDevice({
        name: "",
        ip: "",
        username: "",
        port: "22",
        strictHostKeyChecking: true,
        connectTimeout: "30"
      });
      setShowAddForm(false);
      setShowAdvanced(false);
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

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const fetchMetrics = async (device: Device) => {
    try {
      const result = await invoke<SystemMetrics>("get_device_metrics", {
        ip: device.ip,
        username: "root", // TODO: Store username in DB per device
        port: null,
        strictHostKeyChecking: false, // For localhost testing
        connectTimeout: null,
      });
      setMetrics(result);
      logger.info(`Fetched metrics for device ${device.name}`);
    } catch (error) {
      logger.error(`Failed to fetch metrics: ${error}`);
      console.error("Failed to fetch metrics:", error);
      // Show error to user
      alert(`Failed to fetch metrics: ${error}`);
    }
  };

  const startMetricsStream = (device: Device) => {
    setSelectedDevice(device);
    setShowMetrics(true);
    setMetricsLoading(true);

    // Fetch immediately
    fetchMetrics(device).finally(() => setMetricsLoading(false));

    // Then fetch every 500ms
    if (metricsIntervalRef.current) {
      clearInterval(metricsIntervalRef.current);
    }
    metricsIntervalRef.current = window.setInterval(() => {
      fetchMetrics(device);
    }, 500);
  };

  const stopMetricsStream = () => {
    if (metricsIntervalRef.current) {
      clearInterval(metricsIntervalRef.current);
      metricsIntervalRef.current = null;
    }
    setShowMetrics(false);
    setSelectedDevice(null);
    setMetrics(null);
  };

  return (
    <Box p="md">
      <Paper p="xl" radius="lg" withBorder mb="xl" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)' }}>
        <Group justify="space-between">
          <div>
            <Title order={1} mb="xs" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Device Manager
            </Title>
            <Text size="sm" c="dimmed">
              Manage and monitor your remote devices • {devices.length} device{devices.length !== 1 ? 's' : ''} connected
            </Text>
          </div>
          <Group>
            <Tooltip label="Refresh devices">
              <ActionIcon
                onClick={fetchDevices}
                size="xl"
                variant="light"
                color="blue"
                disabled={loading || addingDevice}
                loading={loading}
              >
                <IconRefresh size={20} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Add new device">
              <ActionIcon
                onClick={() => setShowAddForm((v) => !v)}
                size="xl"
                variant="gradient"
                gradient={{ from: 'blue', to: 'cyan', deg: 90 }}
                disabled={addingDevice}
              >
                <IconPlus size={20} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </Paper>
      {loading ? (
        <Center>
          <Loader />
        </Center>
      ) : (
        <Grid>
          {devices.map((device) => (
            <Grid.Col span={{ base: 12, sm: 6, md: 4 }} key={device.id}>
              <Transition mounted={true} transition="fade" duration={300}>
                {(styles) => (
                  <Card
                    shadow="md"
                    padding="xl"
                    radius="lg"
                    withBorder
                    style={{
                      ...styles,
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.12)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '';
                    }}
                  >
                    <Group justify="space-between" mb="md">
                      <Group gap="sm">
                        <ThemeIcon size="xl" radius="md" variant="light" color="blue">
                          <IconDeviceDesktop size={28} />
                        </ThemeIcon>
                        <div>
                          <Text fw={600} size="lg">{device.name}</Text>
                          <Text size="xs" c="dimmed">{device.ip}</Text>
                        </div>
                      </Group>
                      <Tooltip label="Delete device" position="left">
                        <ActionIcon
                          color="red"
                          variant="subtle"
                          onClick={() => handleDeleteDevice(device.id)}
                          disabled={addingDevice}
                          size="lg"
                        >
                          <IconTrash size={18} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>

                    <Divider my="sm" />

                    <Badge
                      color={device.last_seen ? "teal" : "gray"}
                      variant="light"
                      size="lg"
                      fullWidth
                      mb="md"
                    >
                      {device.last_seen ? "🟢 Online" : "⚫ Offline"} • {formatLastSeen(device.last_seen)}
                    </Badge>

                    <Button
                      fullWidth
                      size="md"
                      leftSection={<IconActivity size={18} />}
                      variant="gradient"
                      gradient={{ from: 'blue', to: 'cyan', deg: 90 }}
                      onClick={() => startMetricsStream(device)}
                      style={{ fontWeight: 600 }}
                    >
                      View System Health
                    </Button>
                  </Card>
                )}
              </Transition>
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

              <Button
                variant="subtle"
                size="xs"
                onClick={() => setShowAdvanced(!showAdvanced)}
                disabled={addingDevice}
              >
                {showAdvanced ? "Hide" : "Show"} Advanced SSH Options
              </Button>

              {showAdvanced && (
                <>
                  <TextInput
                    label="SSH Username"
                    placeholder="user"
                    value={newDevice.username}
                    onChange={(e) => setNewDevice({ ...newDevice, username: e.currentTarget.value })}
                    disabled={addingDevice}
                    description="Leave empty to use default 'user'"
                  />
                  <TextInput
                    label="SSH Port"
                    type="number"
                    value={newDevice.port}
                    onChange={(e) => setNewDevice({ ...newDevice, port: e.currentTarget.value })}
                    disabled={addingDevice}
                    description="Default: 22"
                  />
                  <TextInput
                    label="Connection Timeout (seconds)"
                    type="number"
                    value={newDevice.connectTimeout}
                    onChange={(e) => setNewDevice({ ...newDevice, connectTimeout: e.currentTarget.value })}
                    disabled={addingDevice}
                    description="Default: 30 seconds"
                  />
                  <Group>
                    <Text size="sm">Strict Host Key Checking:</Text>
                    <Button
                      variant={newDevice.strictHostKeyChecking ? "filled" : "outline"}
                      size="xs"
                      onClick={() => setNewDevice({ ...newDevice, strictHostKeyChecking: !newDevice.strictHostKeyChecking })}
                      disabled={addingDevice}
                    >
                      {newDevice.strictHostKeyChecking ? "Enabled" : "Disabled"}
                    </Button>
                  </Group>
                </>
              )}

              <Group justify="flex-end">
                <Button type="submit" loading={addingDevice}>Add Device</Button>
                <Button
                  variant="outline"
                  color="red"
                  onClick={() => {
                    setShowAddForm(false);
                    setShowAdvanced(false);
                    setNewDevice({
                      name: "",
                      ip: "",
                      username: "",
                      port: "22",
                      strictHostKeyChecking: true,
                      connectTimeout: "30"
                    });
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

      <Modal
        opened={showMetrics}
        onClose={stopMetricsStream}
        title={
          <Group gap="sm">
            <ThemeIcon size="lg" radius="md" variant="light" color="teal">
              <IconChartLine size={20} />
            </ThemeIcon>
            <div>
              <Text fw={600} size="lg">System Health Monitor</Text>
              <Text size="xs" c="dimmed">{selectedDevice?.name || ''} ({selectedDevice?.ip})</Text>
            </div>
          </Group>
        }
        size="xl"
        padding="xl"
      >
        {metricsLoading && !metrics ? (
          <Center p="xl">
            <Stack align="center" gap="md">
              <Loader size="xl" type="dots" />
              <Text c="dimmed">Connecting to device...</Text>
            </Stack>
          </Center>
        ) : metrics ? (
          <Stack gap="lg">
            {/* CPU Section */}
            <Paper p="lg" withBorder radius="md" style={{ background: 'linear-gradient(135deg, rgba(66, 153, 225, 0.05) 0%, rgba(66, 153, 225, 0.02) 100%)' }}>
              <Group gap="sm" mb="md">
                <ThemeIcon size="lg" radius="md" variant="light" color="blue">
                  <IconCpu size={20} />
                </ThemeIcon>
                <div style={{ flex: 1 }}>
                  <Text size="sm" fw={600} c="blue.7">CPU Usage</Text>
                  <Text size="xl" fw={700} mt="xs">{metrics.cpu_usage.toFixed(1)}%</Text>
                </div>
              </Group>
              <Progress
                value={metrics.cpu_usage}
                color={metrics.cpu_usage > 80 ? "red" : metrics.cpu_usage > 60 ? "orange" : "blue"}
                size="xl"
                radius="md"
                animated
              />
            </Paper>

            {/* Memory Section */}
            <Paper p="lg" withBorder radius="md" style={{ background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.05) 0%, rgba(6, 182, 212, 0.02) 100%)' }}>
              <Group gap="sm" mb="md">
                <ThemeIcon size="lg" radius="md" variant="light" color="cyan">
                  <IconServer size={20} />
                </ThemeIcon>
                <div style={{ flex: 1 }}>
                  <Text size="sm" fw={600} c="cyan.7">Memory Usage</Text>
                  <Text size="xl" fw={700} mt="xs">{metrics.memory_percent.toFixed(1)}%</Text>
                </div>
              </Group>
              <Progress
                value={metrics.memory_percent}
                color={metrics.memory_percent > 80 ? "red" : metrics.memory_percent > 60 ? "orange" : "cyan"}
                size="xl"
                radius="md"
                animated
              />
              <Text size="xs" c="dimmed" mt="sm">
                {metrics.memory_used_mb.toFixed(0)} MB / {metrics.memory_total_mb.toFixed(0)} MB
              </Text>
            </Paper>

            {/* Disk Section */}
            <Paper p="lg" withBorder radius="md" style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(34, 197, 94, 0.02) 100%)' }}>
              <Group gap="sm" mb="md">
                <ThemeIcon size="lg" radius="md" variant="light" color="green">
                  <IconDatabase size={20} />
                </ThemeIcon>
                <div style={{ flex: 1 }}>
                  <Text size="sm" fw={600} c="green.7">Disk Usage</Text>
                  <Text size="xl" fw={700} mt="xs">{metrics.disk_percent.toFixed(1)}%</Text>
                </div>
              </Group>
              <Progress
                value={metrics.disk_percent}
                color={metrics.disk_percent > 80 ? "red" : metrics.disk_percent > 60 ? "orange" : "green"}
                size="xl"
                radius="md"
                animated
              />
              <Text size="xs" c="dimmed" mt="sm">
                {metrics.disk_used_gb.toFixed(1)} GB / {metrics.disk_total_gb.toFixed(1)} GB
              </Text>
            </Paper>

            {/* System Info Grid */}
            <Grid>
              <Grid.Col span={6}>
                <Paper p="lg" withBorder radius="md" style={{ textAlign: 'center' }}>
                  <ThemeIcon size="lg" radius="md" variant="light" color="violet" mx="auto" mb="sm">
                    <IconClock size={20} />
                  </ThemeIcon>
                  <Text size="xs" c="dimmed" mb="xs">System Uptime</Text>
                  <Text size="xl" fw={700}>{formatUptime(metrics.uptime_seconds)}</Text>
                </Paper>
              </Grid.Col>
              <Grid.Col span={6}>
                <Paper p="lg" withBorder radius="md" style={{ textAlign: 'center' }}>
                  <ThemeIcon size="lg" radius="md" variant="light" color="orange" mx="auto" mb="sm">
                    <IconChartLine size={20} />
                  </ThemeIcon>
                  <Text size="xs" c="dimmed" mb="xs">Load Average</Text>
                  <Text size="xl" fw={700}>{metrics.load_average}</Text>
                </Paper>
              </Grid.Col>
            </Grid>

            <Divider />

            <Group justify="center" gap="xs">
              <Loader size="xs" type="dots" />
              <Text size="xs" c="dimmed">
                Live updating every 0.5 seconds
              </Text>
            </Group>
          </Stack>
        ) : (
          <Center p="xl">
            <Stack align="center" gap="md">
              <ThemeIcon size="xl" radius="xl" variant="light" color="gray">
                <IconActivity size={28} />
              </ThemeIcon>
              <Text c="dimmed">No metrics available</Text>
            </Stack>
          </Center>
        )}
      </Modal>
    </Box>
  );
}

export default Devices;

