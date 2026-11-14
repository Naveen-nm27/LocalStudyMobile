import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useWindowDimensions, type ColorValue } from 'react-native';
import { Brand, colors, Icon, type IconName } from '../components/ui';
import { StudyProvider } from '../study/StudyProvider';

const tabIcon = (name: IconName) => ({ color }: { color: ColorValue }) => <Icon name={name} color={color} />;

export default function RootLayout() {
  const wide = useWindowDimensions().width >= 900;

  return <StudyProvider>
    <StatusBar style="light" />
    <Tabs screenOptions={{
      headerStyle: { backgroundColor: colors.night },
      headerShadowVisible: false,
      headerTitleAlign: 'left',
      headerTitle: () => <Brand />,
      sceneStyle: { backgroundColor: colors.paper },
      tabBarPosition: wide ? 'left' : 'bottom',
      tabBarVariant: wide ? 'material' : 'uikit',
      tabBarActiveTintColor: wide ? '#ffce72' : colors.action,
      tabBarInactiveTintColor: wide ? colors.nightMuted : colors.muted,
      tabBarActiveBackgroundColor: wide ? '#3e2648' : colors.card,
      tabBarLabelStyle: { fontWeight: '800', fontSize: wide ? 14 : 11 },
      tabBarStyle: wide ? { width: 196, minWidth: 196, backgroundColor: colors.night, borderRightWidth: 0, paddingHorizontal: 12 } : { backgroundColor: colors.card, borderTopColor: colors.border },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: tabIcon('sun') }} />
      <Tabs.Screen name="library" options={{ title: 'Library', tabBarIcon: tabIcon('book') }} />
      <Tabs.Screen name="memory" options={{ title: 'Memory', tabBarIcon: tabIcon('curve') }} />
    </Tabs>
  </StudyProvider>;
}
