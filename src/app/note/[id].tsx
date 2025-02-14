// app/note/[id].tsx
import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function NoteDetails() {
  const { id } = useLocalSearchParams();
  // Fetch note details using id
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text>Note Details for ID: {id}</Text>
    </View>
  );
}