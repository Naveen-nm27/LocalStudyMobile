import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Tabs
        initialRouteName="index"
        screenOptions={{
          sceneStyle: { backgroundColor: '#ffffff' },
          tabBarActiveTintColor: '#245a4a',
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Today' }} />
        <Tabs.Screen name="library" options={{ title: 'Library' }} />
      </Tabs>
    </>
  );
}
