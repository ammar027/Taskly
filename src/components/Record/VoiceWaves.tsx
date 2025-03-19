import React from "react";
import { View, Animated, StyleSheet } from "react-native";

export const VoiceWaves = ({ showVoiceWaves, recognizing, waveAnim1, waveAnim2, waveAnim3, colors }) => {
  if (showVoiceWaves && recognizing) {
    const waveCount = 7;
    const waves = [];
    for (let i = 0; i < waveCount; i++) {
      let animSource = i % 3 === 0 ? waveAnim1 : i % 3 === 1 ? waveAnim2 : waveAnim3;
      const centerDistance = Math.abs(i - Math.floor(waveCount / 2));
      const magnitude = 1 - centerDistance * 0.15;
      waves.push(
        <Animated.View
          key={`wave-${i}`}
          style={[
            styles.voiceWave,
            {
              transform: [{
                scaleY: animSource.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 1.5 * magnitude],
                }),
              }],
              backgroundColor: colors.primary,
              opacity: 0.6 + magnitude * 0.4,
            },
          ]}
        />
      );
    }
    return <View style={styles.voiceWavesContainer}>{waves}</View>;
  }
  return null;
};

const styles = StyleSheet.create({
  voiceWavesContainer: { 
    flexDirection: "row", 
    justifyContent: "center", 
    alignItems: "center", 
    height: 80, 
    width: "100%", 
    marginBottom: 20 
  },
  voiceWave: { 
    width: 6, 
    height: 40, 
    borderRadius: 3, 
    marginHorizontal: 5 
  },
});