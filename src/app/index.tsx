// app/index.tsx
import { Redirect } from 'expo-router';
import * as NavigationBar from "expo-navigation-bar";

// Set navigation bar properties
NavigationBar.setPositionAsync("absolute");
NavigationBar.setBackgroundColorAsync("#ffffff01");
NavigationBar.setButtonStyleAsync('dark');

export default function Index() {
  return <Redirect href="/(tabs)" />;
}