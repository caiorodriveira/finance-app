import React, { ReactNode, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from 'expo/node_modules/@expo/vector-icons';
import { useAppStore } from '../store';
import { getNomeMes } from '../services/financas';
import { colors } from '../theme/colors';

interface AppShellProps {
  title: string;
  children: ReactNode;
}

const MENU_ITEMS = [
  { route: 'Dashboard', label: 'Dashboard', description: 'Visao geral do mes', icon: 'view-grid-outline' as const },
  { route: 'Despesas', label: 'Despesas', description: 'Contas e vencimentos', icon: 'file-document-plus-outline' as const },
  { route: 'Receitas', label: 'Receitas', description: 'Entradas e recebimentos', icon: 'bank-outline' as const },
  { route: 'Cartoes', label: 'Cartoes', description: 'Limites e faturas', icon: 'credit-card-outline' as const },
];

const DRAWER_WIDTH = Math.min(Dimensions.get('window').width * 0.78, 320);

export default function AppShell({ title, children }: AppShellProps) {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { currentMonth } = useAppStore();
  const [menuVisible, setMenuVisible] = useState(false);
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const openMenu = () => {
    setMenuVisible(true);
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 70,
        friction: 11,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeMenu = () => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -DRAWER_WIDTH,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(() => setMenuVisible(false));
  };

  const handleNavigate = (screen: string) => {
    if (route.name !== screen) {
      navigation.navigate(screen);
    }
    closeMenu();
  };

  const edgeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          !menuVisible && gesture.moveX < 36 && gesture.dx > 12 && Math.abs(gesture.dy) < 20,
        onPanResponderMove: (_, gesture) => {
          const next = Math.min(0, -DRAWER_WIDTH + Math.max(0, gesture.dx));
          translateX.setValue(next);
          backdropOpacity.setValue(Math.min(1, Math.max(0, gesture.dx / DRAWER_WIDTH)));
          if (!menuVisible) {
            setMenuVisible(true);
          }
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx > DRAWER_WIDTH * 0.28) {
            openMenu();
          } else {
            closeMenu();
          }
        },
        onPanResponderTerminate: () => closeMenu(),
      }),
    [menuVisible]
  );

  const drawerResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => menuVisible && gesture.dx < -8 && Math.abs(gesture.dy) < 24,
        onPanResponderMove: (_, gesture) => {
          const next = Math.max(-DRAWER_WIDTH, Math.min(0, gesture.dx));
          translateX.setValue(next);
          backdropOpacity.setValue(1 - Math.min(1, Math.abs(gesture.dx) / DRAWER_WIDTH));
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx < -DRAWER_WIDTH * 0.22) {
            closeMenu();
          } else {
            openMenu();
          }
        },
        onPanResponderTerminate: () => openMenu(),
      }),
    [menuVisible]
  );

  return (
    <View style={styles.container}>
      <View style={styles.edgeZone} {...edgeResponder.panHandlers} />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.menuButton} onPress={openMenu} activeOpacity={0.85}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.brand}>Check Contas</Text>
          <Text style={styles.headerTitle}>{title}</Text>
        </View>

        <View style={styles.monthBadge}>
          <Text style={styles.monthBadgeText}>{currentMonth.split('-')[1]}</Text>
        </View>
      </View>

      <View style={styles.content}>{children}</View>

      {menuVisible && (
        <View style={styles.overlayRoot} pointerEvents="box-none">
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
            <Pressable style={styles.backdropPress} onPress={closeMenu} />
          </Animated.View>

          <Animated.View
            style={[styles.drawer, { paddingTop: insets.top + 18, transform: [{ translateX }] }]}
            {...drawerResponder.panHandlers}
          >
            <View style={styles.drawerAvatarWrap}>
              <View style={styles.drawerAvatarOuter}>
                <View style={styles.drawerAvatarInner} />
              </View>
              <View style={styles.drawerStatusDot} />
            </View>

            <Text style={styles.drawerTitle}>Check Contas</Text>
            <Text style={styles.drawerSubtitle}>Premium Finance</Text>

            <View style={styles.drawerList}>
              {MENU_ITEMS.map(item => {
                const isActive = route.name === item.route;

                return (
                  <TouchableOpacity
                    key={item.route}
                    style={[styles.drawerItem, isActive && styles.drawerItemActive]}
                    onPress={() => handleNavigate(item.route)}
                    activeOpacity={0.9}
                  >
                    <View style={styles.drawerItemRow}>
                      <MaterialCommunityIcons
                        name={item.icon}
                        size={20}
                        color={isActive ? colors.primary : '#546175'}
                      />
                      <View style={styles.drawerTextWrap}>
                        <Text style={[styles.drawerItemLabel, isActive && styles.drawerItemLabelActive]}>
                          {item.label}
                        </Text>
                        <Text style={[styles.drawerItemDescription, isActive && styles.drawerItemDescriptionActive]}>
                          {item.description}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.drawerFooter}>
              <Text style={styles.drawerFooterText}>Deslize para a esquerda para fechar</Text>
            </View>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  edgeZone: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 24,
    zIndex: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 14,
    gap: 12,
    backgroundColor: 'rgba(12, 19, 33, 0.6)',
  },
  menuButton: {
    width: 46,
    height: 46,
    borderRadius: 18,
    backgroundColor: 'rgba(50, 57, 73, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  headerCenter: {
    flex: 1,
  },
  brand: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  headerTitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  monthBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surface,
  },
  monthBadgeText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  content: {
    flex: 1,
  },
  overlayRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  backdropPress: {
    flex: 1,
  },
  drawer: {
    width: DRAWER_WIDTH,
    height: '100%',
    backgroundColor: '#101726',
    paddingHorizontal: 18,
    borderTopRightRadius: 30,
    borderBottomRightRadius: 30,
  },
  drawerAvatarWrap: {
    marginBottom: 16,
    width: 72,
    height: 72,
  },
  drawerAvatarOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#172132',
  },
  drawerAvatarInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f2cbbb',
  },
  drawerStatusDot: {
    position: 'absolute',
    right: 4,
    bottom: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.income,
  },
  drawerTitle: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  drawerSubtitle: {
    color: colors.textSoft,
    fontSize: 14,
    marginBottom: 26,
  },
  drawerList: {
    gap: 10,
  },
  drawerItem: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  drawerItemActive: {
    backgroundColor: colors.surface,
  },
  drawerItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  drawerTextWrap: {
    flex: 1,
  },
  drawerItemLabel: {
    color: '#546175',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  drawerItemLabelActive: {
    color: colors.primary,
  },
  drawerItemDescription: {
    color: '#445061',
    fontSize: 12,
  },
  drawerItemDescriptionActive: {
    color: colors.textMuted,
  },
  drawerFooter: {
    marginTop: 'auto',
    paddingVertical: 24,
  },
  drawerFooterText: {
    color: colors.textSoft,
    fontSize: 12,
  },
});
