import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
    paddingBottom: 4,

    backgroundColor: "#FFFFFF",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#DCE4E8",

    shadowColor: "#1F2937",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,

    elevation: 8,
  },

  tab: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },

  label: {
    maxWidth: 76,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "400",
    textAlign: "center",
  },

  activeLabel: {
    fontWeight: "600",
  },

  qrButton: {
    position: "absolute",
    top: -9,

    width: 52,
    height: 52,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "#008B9A",
    borderWidth: 4,
    borderColor: "#FFFFFF",
    borderRadius: 26,

    shadowColor: "#005F69",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.18,
    shadowRadius: 5,

    elevation: 7,
  },

  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
});
