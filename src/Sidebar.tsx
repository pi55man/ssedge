import { ActionIcon, Tooltip, Box } from "@mantine/core";
import { IconDevices } from "@tabler/icons-react";

interface SidebarProps {
  onDevicesClick: () => void;
}

function Sidebar({ onDevicesClick }: SidebarProps) {
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
        zIndex: 100,
      }}
    >
      <Tooltip label="Devices" position="right">
        <ActionIcon
          onClick={onDevicesClick}
          size="lg"
          variant="subtle"
          color="gray"
        >
          <IconDevices size={24} />
        </ActionIcon>
      </Tooltip>
    </Box>
  );
}

export default Sidebar;
