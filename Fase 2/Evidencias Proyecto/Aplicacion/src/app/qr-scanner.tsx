import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { getCurrentUserRole, getLinkedPatientByCode, linkPatientToCurrentUser } from '@/lib/linkcare-data';

export default function QRScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [scanStatus, setScanStatus] = useState<'escaneando' | 'detectado' | 'error'>('escaneando');
  const [manualCode, setManualCode] = useState('');
  const [patientName, setPatientName] = useState('Sin paciente detectado');
  const [isValidating, setIsValidating] = useState(false);
  const lastScannedRef = useRef<string | null>(null);

  const openSettings = async () => {
    try {
      await Linking.openSettings();
    } catch {
      Alert.alert('No se pudo abrir la configuración del sistema.');
    }
  };

  useEffect(() => {
    if (permission && !permission.granted && !permission.canAskAgain) {
      return;
    }

    if (permission && !permission.granted) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  const validateCode = async (code?: string) => {
    const normalized = (code ?? manualCode).trim();

    if (!normalized) {
      setScanStatus('error');
      return;
    }

    setIsValidating(true);
    try {
      const role = await getCurrentUserRole();
      const result = role === 'medico'
        ? await linkPatientToCurrentUser({ patientCode: normalized })
        : await getLinkedPatientByCode(normalized);

      if (!result.success) {
        setScanStatus('error');
        lastScannedRef.current = null;
        Alert.alert(
          role === 'medico' ? 'No se pudo vincular al paciente' : 'Acceso denegado',
          result.error ?? (role === 'medico'
            ? 'El código QR no es válido.'
            : 'El código no es válido o el paciente no está asociado a tu cuenta.'),
        );
        return;
      }

      setPatientName(result.patientName ?? 'Paciente vinculado');
      setScanStatus('detectado');
      router.push(role === 'medico'
        ? { pathname: '/medico/patient-history' as any, params: { patientId: result.patientId } }
        : { pathname: '/qr-patient-summary' as any, params: { patientId: result.patientId } });
    } finally {
      setIsValidating(false);
    }
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    const normalized = String(data).trim();
    if (!normalized || isValidating || lastScannedRef.current === normalized) {
      return;
    }

    lastScannedRef.current = normalized;
    await validateCode(normalized);
  };

  if (!permission) {
    return (
      <View style={styles.screen}>
        <Text style={styles.permissionMessage}>Cargando cámara...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.screenCentered}>
        <Text style={styles.permissionTitle}>Se necesita acceso a la cámara</Text>
        <Text style={styles.permissionText}>Permite el uso de la cámara para escanear el QR del paciente y validar la vinculación.</Text>
        <Pressable style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.primaryText}>Permitir cámara</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={openSettings}>
          <Text style={styles.secondaryText}>Abrir ajustes</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.title}>Escáner QR</Text>
      </View>

      <View style={styles.cameraFrame}>
        <CameraView
          style={styles.cameraPreview}
          facing="back"
          enableTorch={isFlashOn}
          flash={isFlashOn ? 'on' : 'off'}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleBarcodeScanned}
        />
        <View style={styles.cornerTopLeft} />
        <View style={styles.cornerTopRight} />
        <View style={styles.cornerBottomLeft} />
        <View style={styles.cornerBottomRight} />
        <Text style={styles.scanText}>
          {scanStatus === 'escaneando'
            ? 'Apunte la cámara al código QR del paciente'
            : scanStatus === 'detectado'
              ? 'Código detectado correctamente'
              : 'Código inválido o no encontrado'}
        </Text>
      </View>

      <View style={styles.toolbar}>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{isValidating ? 'Validando...' : scanStatus === 'detectado' ? 'Paciente validado' : scanStatus === 'error' ? 'Código inválido' : 'Leyendo...'}</Text>
        </View>
        <View style={styles.flashRow}>
          <Text style={styles.flashLabel}>Linterna</Text>
          <Switch value={isFlashOn} onValueChange={setIsFlashOn} />
        </View>
      </View>

      <Text style={styles.flashHint}>La linterna depende del hardware del teléfono y puede no estar disponible en todos los dispositivos.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Paciente asociado</Text>
        <Text style={styles.cardText}>{patientName}</Text>
        <Text style={styles.muted}>Escanea el código del paciente o ingresa su token QR.</Text>
      </View>

      <Text style={styles.label}>Código QR manual</Text>
      <TextInput
        value={manualCode}
        onChangeText={setManualCode}
        placeholder="Token QR del paciente"
        style={styles.input}
        autoCapitalize="characters"
        returnKeyType="go"
        onSubmitEditing={() => void validateCode()}
        accessibilityLabel="Código QR o token del paciente"
        accessibilityHint="Escribe el token que aparece en la ficha del paciente"
      />

      <Pressable style={[styles.primaryButton, isValidating && styles.disabledButton]} onPress={() => void validateCode()} disabled={isValidating || !manualCode.trim()} accessibilityRole="button" accessibilityLabel={isValidating ? 'Validando código' : 'Buscar paciente por código'}>
        <Text style={styles.primaryText}>{isValidating ? 'Validando...' : 'Buscar paciente'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F0F4F8',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 28,
  },
  screenCentered: {
    flex: 1,
    backgroundColor: '#F0F4F8',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionMessage: {
    color: '#023047',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  permissionTitle: {
    color: '#023047',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  permissionText: {
    color: '#4A5568',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 22,
  },
  secondaryButton: {
    marginTop: 12,
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  secondaryText: {
    color: '#023047',
    fontSize: 15,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backText: {
    fontSize: 20,
    color: '#023047',
    fontWeight: '700',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#023047',
  },
  cameraFrame: {
    height: 340,
    width: '100%',
    backgroundColor: '#0D2430',
    borderRadius: 24,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 18,
  },
  cameraPreview: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 18,
    left: 18,
    width: 46,
    height: 46,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#02C39A',
    borderTopLeftRadius: 12,
  },
  cornerTopRight: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 46,
    height: 46,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#02C39A',
    borderTopRightRadius: 12,
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 18,
    left: 18,
    width: 46,
    height: 46,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#02C39A',
    borderBottomLeftRadius: 12,
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 18,
    right: 18,
    width: 46,
    height: 46,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#02C39A',
    borderBottomRightRadius: 12,
  },
  scanText: {
    color: '#E2E8F0',
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 220,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusPill: {
    borderRadius: 999,
    backgroundColor: '#dffaf2',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusText: {
    color: '#0f766e',
    fontSize: 12,
    fontWeight: '700',
  },
  flashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  flashLabel: {
    color: '#023047',
    fontSize: 13,
    fontWeight: '600',
  },
  flashHint: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: {
    color: '#4A5568',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardText: {
    color: '#023047',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  muted: {
    color: '#64748B',
    fontSize: 12,
  },
  label: {
    color: '#023047',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dfeaf1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    color: '#023047',
  },
  primaryButton: {
    marginTop: 'auto',
    backgroundColor: '#028090',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: { opacity: 0.6 },
  primaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
