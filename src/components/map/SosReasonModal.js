import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fonts, fontSize, radius, spacing } from '../../constants/theme';
import { useLanguage } from '../../contexts/LanguageContext';

export default function SosReasonModal({ visible, onSendReason, onClose }) {
  const { t } = useLanguage();
  const [countdown, setCountdown] = useState(5);

  const reasons = [
    { id: 'fuel', label: t('sos.reasonFuel'), icon: 'gas-station', color: '#F59E0B' },
    { id: 'accident', label: t('sos.reasonAccident'), icon: 'car-wash', color: '#EF4444' },
    { id: 'engine', label: t('sos.reasonEngine'), icon: 'wrench', color: '#EC4899' },
    { id: 'lost', label: t('sos.reasonLost'), icon: 'compass-off', color: '#38BDF8' },
    { id: 'other', label: t('sos.reasonOther'), icon: 'alert-circle', color: '#8B5CF6' },
  ];

  useEffect(() => {
    let timer = null;
    if (visible) {
      setCountdown(5);
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setTimeout(() => {
              if (onSendReason) onSendReason(t('sos.reasonGeneral'));
            }, 0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.iconBg}>
              <MaterialCommunityIcons name="alert-rhombus" size={28} color={colors.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{t('sos.sentTitle')}</Text>
              <Text style={styles.subTitle}>{t('sos.chooseReason')} ({countdown}s):</Text>
            </View>
          </View>

          <View style={styles.reasonList}>
            {reasons.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.reasonBtn, { borderColor: item.color + '40' }]}
                onPress={() => onSendReason(item.label)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name={item.icon} size={20} color={item.color} style={{ marginRight: spacing.md }} />
                <Text style={styles.reasonText}>{item.label}</Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.closeText}>{t('sos.close')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  card: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  title: {
    fontSize: fontSize.md,
    fontFamily: fonts.black,
    color: colors.danger,
  },
  subTitle: {
    fontSize: fontSize.xs,
    fontFamily: fonts.medium,
    color: colors.textMuted,
    marginTop: 2,
  },
  reasonList: {
    gap: spacing.xs + 2,
    marginBottom: spacing.md,
  },
  reasonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  reasonText: {
    flex: 1,
    fontSize: fontSize.xs + 1,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  closeBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  closeText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
});
