import React from "react";
import { View, StyleSheet } from "react-native";

export const StepIndicator = ({ currentStep, colors, isDarkMode }) => (
  <View style={styles.stepIndicator}>
    {[0, 1].map((step) => (
      <View
        key={step}
        style={[
          styles.stepDot,
          {
            backgroundColor: currentStep >= step ? colors.primary : isDarkMode ? "#4B5563" : colors.disabled,
            width: currentStep === step ? 12 : 8,
            height: currentStep === step ? 12 : 8,
          },
        ]}
      />
    ))}
  </View>
);

const styles = StyleSheet.create({
  stepIndicator: { 
    flexDirection: "row", 
    justifyContent: "center", 
    marginTop: 30 
  },
  stepDot: { 
    borderRadius: 6, 
    marginHorizontal: 5, 
    opacity: 0.9 
  },
});