import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

type SkeletonBlockProps = {
  style?: Record<string, number | string>;
};

export function SkeletonBlock({ style }: SkeletonBlockProps) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={[styles.base, style, { opacity }]} />;
}

export function AppLoaderSkeleton() {
  return (
    <View style={styles.loaderScreen} accessibilityRole="image" accessibilityLabel="Cargando la aplicación">
      <View style={styles.logoGhostWrap}>
        <SkeletonBlock style={styles.logoGhost} />
        <SkeletonBlock style={styles.brandGhost} />
        <SkeletonBlock style={styles.textGhost} />
      </View>
    </View>
  );
}

export function DashboardSkeleton() {
  return (
    <View style={styles.dashboardScreen} accessibilityRole="image" accessibilityLabel="Cargando el panel principal">
      <View style={styles.headerRow}>
        <View>
          <SkeletonBlock style={styles.eyebrowGhost} />
          <SkeletonBlock style={styles.titleGhost} />
        </View>
        <SkeletonBlock style={styles.avatarGhost} />
      </View>

      <SkeletonBlock style={styles.heroGhost} />

      <View style={styles.metricRow}>
        <SkeletonBlock style={styles.metricCardGhost} />
        <SkeletonBlock style={styles.metricCardGhost} />
        <SkeletonBlock style={styles.metricCardGhost} />
      </View>

      <SkeletonBlock style={styles.cardGhostLarge} />
      <SkeletonBlock style={styles.cardGhostLarge} />
      <SkeletonBlock style={styles.cardGhostLarge} />
    </View>
  );
}

export function AuthFormSkeleton() {
  return (
    <View style={styles.authScreen} accessibilityRole="image" accessibilityLabel="Cargando formulario de acceso">
      <View style={styles.authCardGhost}>
        <SkeletonBlock style={styles.authBrandGhost} />
        <SkeletonBlock style={styles.authSubtitleGhost} />
        <View style={styles.authRowGhost}>
          <SkeletonBlock style={styles.authRoleGhost} />
          <SkeletonBlock style={styles.authRoleGhost} />
          <SkeletonBlock style={styles.authRoleGhost} />
        </View>
        <SkeletonBlock style={styles.authInputGhost} />
        <SkeletonBlock style={styles.authInputGhost} />
        <SkeletonBlock style={styles.authButtonGhost} />
        <SkeletonBlock style={styles.authLinkGhost} />
      </View>
    </View>
  );
}

export function ProfileSettingsSkeleton() {
  return (
    <View style={styles.profileScreen} accessibilityRole="image" accessibilityLabel="Cargando ajustes del perfil">
      <View style={styles.profileHeaderGhostRow}>
        <SkeletonBlock style={styles.backGhost} />
        <SkeletonBlock style={styles.titleGhostLarge} />
      </View>

      <SkeletonBlock style={styles.profileCardGhost} />
      <SkeletonBlock style={styles.sectionGhost} />
      <SkeletonBlock style={styles.sectionGhost} />
      <SkeletonBlock style={styles.sectionGhost} />
      <SkeletonBlock style={styles.buttonGhostLarge} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: '#dfeaf1',
    borderRadius: 14,
  },
  loaderScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#edf7fb',
    paddingHorizontal: 24,
  },
  logoGhostWrap: {
    alignItems: 'center',
    width: '100%',
  },
  logoGhost: {
    width: 104,
    height: 104,
    borderRadius: 32,
    marginBottom: 18,
  },
  brandGhost: {
    width: 180,
    height: 32,
    borderRadius: 12,
    marginBottom: 12,
  },
  textGhost: {
    width: 220,
    height: 18,
    borderRadius: 10,
  },
  dashboardScreen: {
    flex: 1,
    backgroundColor: '#edf7fb',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 40,
  },
  authScreen: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#edf7fb',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },
  authCardGhost: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  authBrandGhost: {
    width: 140,
    height: 30,
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 10,
  },
  authSubtitleGhost: {
    width: 120,
    height: 18,
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 20,
  },
  authRowGhost: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  authRoleGhost: {
    flex: 1,
    height: 42,
    borderRadius: 12,
  },
  authInputGhost: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    marginBottom: 12,
  },
  authButtonGhost: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    marginTop: 8,
    marginBottom: 12,
  },
  authLinkGhost: {
    width: 120,
    height: 18,
    borderRadius: 10,
    alignSelf: 'center',
  },
  profileScreen: {
    flex: 1,
    backgroundColor: '#edf7fb',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
  },
  profileHeaderGhostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backGhost: {
    width: 42,
    height: 42,
    borderRadius: 14,
    marginRight: 12,
  },
  titleGhostLarge: {
    width: 200,
    height: 28,
    borderRadius: 10,
  },
  profileCardGhost: {
    width: '100%',
    height: 100,
    borderRadius: 20,
    marginBottom: 18,
  },
  sectionGhost: {
    width: '100%',
    height: 140,
    borderRadius: 18,
    marginBottom: 18,
  },
  buttonGhostLarge: {
    width: '100%',
    height: 52,
    borderRadius: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  eyebrowGhost: {
    width: 90,
    height: 12,
    marginBottom: 8,
  },
  titleGhost: {
    width: 160,
    height: 28,
  },
  avatarGhost: {
    width: 46,
    height: 46,
    borderRadius: 16,
  },
  heroGhost: {
    width: '100%',
    height: 150,
    borderRadius: 24,
    marginBottom: 18,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  metricCardGhost: {
    width: '31%',
    height: 96,
    borderRadius: 18,
  },
  cardGhostLarge: {
    width: '100%',
    height: 110,
    borderRadius: 20,
    marginBottom: 16,
  },
});
