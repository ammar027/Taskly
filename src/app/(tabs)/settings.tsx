import { View, Text, StyleSheet, Pressable, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="moon" size={22} color="#1c1c1e" style={styles.settingIcon} />
            <Text style={styles.settingText}>Dark Mode</Text>
          </View>
          <Switch value={false} onValueChange={() => {}} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Voice Settings</Text>
        <Pressable style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="language" size={22} color="#1c1c1e" style={styles.settingIcon} />
            <Text style={styles.settingText}>Language</Text>
          </View>
          <View style={styles.settingRight}>
            <Text style={styles.settingValue}>English</Text>
            <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
          </View>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="notifications" size={22} color="#1c1c1e" style={styles.settingIcon} />
            <Text style={styles.settingText}>Push Notifications</Text>
          </View>
          <Switch value={true} onValueChange={() => {}} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Pressable style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="information-circle" size={22} color="#1c1c1e" style={styles.settingIcon} />
            <Text style={styles.settingText}>Version</Text>
          </View>
          <Text style={styles.settingValue}>1.0.0</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8e8e93',
    marginLeft: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#c6c6c8',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 12,
  },
  settingText: {
    fontSize: 16,
    color: '#1c1c1e',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 16,
    color: '#8e8e93',
    marginRight: 4,
  },
});