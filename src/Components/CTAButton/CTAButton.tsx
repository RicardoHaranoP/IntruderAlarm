import React, { FC, useState } from "react";

import { TouchableOpacity, Text, StyleSheet, StyleProp, ViewStyle } from "react-native";

import variaveis from "../../colors/variaveis";


type ButtonType = "primary" | "secondary";

interface CTAButtonProps {
  title: string;
  variant: ButtonType;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export const CTAButton: FC<CTAButtonProps> = ({ title, onPress, variant, style }) => {

  const [isEnabled, setIsEnabled] = useState(false);


  const containerStyle =
    variant === "primary" ? styles.containerPrimary : styles.containerSecondary;

  const textStyle =
    variant === "primary" ? styles.textPrimary : styles.textSecondary;

  return (
    <TouchableOpacity onPress={onPress} style={containerStyle}>
      <Text style={textStyle}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  containerPrimary: {
    height: 60,
    backgroundColor: variaveis.primaryColor,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  containerSecondary: {
    height: 60,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.8,
  },
  textPrimary: {
    fontSize: 15,
    fontWeight: "bold",
    color: "white",
  },
  textSecondary: {
    fontSize: 15,
    fontWeight: "bold",
    color: "black",
  },
});
