import { ActionIcon, Tooltip, Box } from "@mantine/core";
import { IconDevices, IconHome } from "@tabler/icons-react";

interface SidebarProps {
  onHomeClick: () => void;
  onDevicesClick: () => void;
}

function Sidebar({ onHomeClick, onDevicesClick }: SidebarProps) {
  return (
    <Box
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        bottom: 0,
        width: 50,
        backgroundColor: "#25262b",
        borderRight: "1px solid #373A40",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 16,
        gap: 8,
        zIndex: 100,
      }}
    >
      <Tooltip label="Home" position="right">
        <ActionIcon
          onClick={onHomeClick}
          size="lg"
          variant="subtle"
          color="blue"
          style={{
            transition: "all 0.2s",
          }}
          sx={{
            '&:hover': {
              backgroundColor: 'rgba(34, 139, 230, 0.1)',
            }
          }}
        >
          <IconHome size={24} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Devices" position="right">
        <ActionIcon
          onClick={onDevicesClick}
          size="lg"
          variant="subtle"
          color="gray"
          sx={{
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
            }
          }}
        >
          <IconDevices size={24} />
        </ActionIcon>
      </Tooltip>
    </Box>
  );
}

export default Sidebar;

