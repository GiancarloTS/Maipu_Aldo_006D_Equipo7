import {
    House,
    NotebookTabs,
    Pill,
    QrCode,
    UserRound,
} from "lucide-react-native";
import React from "react";
import { Pressable, Text, View } from "react-native";

import { styles } from "./navbar-style";

export type TabName =
  | "home"
  | "medications"
  | "qr"
  | "notes"
  | "profile";

type TabBarProps = {
  activeTab: TabName;
  onChange: (tab: TabName) => void;
  primaryLabel?: string;
};

type TabItem = {
  id: TabName;
  label: string;
  icon: React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
  }>;
  primary?: boolean;
};

const tabs: TabItem[] = [
  {
    id: "home",
    label: "Inicio",
    icon: House,
  },
  {
    id: "medications",
    label: "Medicamentos",
    icon: Pill,
  },
  {
    id: "qr",
    label: "",
    icon: QrCode,
    primary: true,
  },
  {
    id: "notes",
    label: "Anotaciones",
    icon: NotebookTabs,
  },
  {
    id: "profile",
    label: "Perfil",
    icon: UserRound,
  },
];

const ACTIVE_COLOR = "#008FA0";
const INACTIVE_COLOR = "#405066";

export default function TabBar({
  activeTab,
  onChange,
  primaryLabel = "Escanear código QR",
}: TabBarProps) {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        if (tab.primary) {
          return (
            <View key={tab.id} style={styles.tab}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={primaryLabel}
                accessibilityState={{ selected: isActive }}
                onPress={() => onChange(tab.id)}
                style={({ pressed }) => [
                  styles.qrButton,
                  pressed && styles.pressed,
                ]}
              >
                <Icon
                  size={25}
                  color="#FFFFFF"
                  strokeWidth={2}
                />
              </Pressable>
            </View>
          );
        }

        const color = isActive
          ? ACTIVE_COLOR
          : INACTIVE_COLOR;

        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: isActive }}
            onPress={() => onChange(tab.id)}
            style={({ pressed }) => [
              styles.tab,
              pressed && styles.pressed,
            ]}
          >
            <Icon
              size={21}
              color={color}
              strokeWidth={isActive ? 2.2 : 1.8}
            />

            <Text
              numberOfLines={1}
              style={[
                styles.label,
                { color },
                isActive && styles.activeLabel,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
