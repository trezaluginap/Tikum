import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { supabase } from '../../supabase';
import ConvoyDialog from '../components/common/ConvoyDialog';
import ConvoyToast from '../components/common/ConvoyToast';
import { HomeHeader } from '../components/home/HomeHeader';
import { colors, fonts, fontSize, radius, spacing } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { user, signOut } = useAuth();
  const { locale, changeLocale, t } = useLanguage();

  // ── Settings Toggles & Modals State ──
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeMap, setDarkModeMap] = useState(true);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  // ── Overlay Dialog & Toast State ──
  const [dialogConfig, setDialogConfig] = useState({ visible: false });
  const [toastConfig, setToastConfig] = useState({ visible: false });

  const showToast = (type, title, message, duration = 4000) => {
    setToastConfig({ visible: true, type, title, message });
    setTimeout(() => setToastConfig((prev) => ({ ...prev, visible: false })), duration);
  };

  const handleSignOut = async () => {
    setDialogConfig({
      visible: true,
      type: 'danger',
      icon: 'logout-variant',
      title: t('settings.signOutConfirmTitle'),
      message: t('settings.signOutConfirmMsg'),
      buttons: [
        { text: t('settings.signOutCancel'), style: 'secondary' },
        {
          text: t('settings.signOutOk'),
          style: 'danger',
          onPress: async () => {
            try {
              if (signOut) await signOut();
              else await supabase.auth.signOut();
            } catch (err) {
              console.warn('Signout error:', err);
            }
          },
        },
      ],
    });
  };

  const displayName = user?.user_metadata?.display_name || 'Pengguna';
  const profileInitial = displayName.substring(0, 2).toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Overlays */}
      <ConvoyToast
        visible={toastConfig.visible}
        type={toastConfig.type}
        title={toastConfig.title}
        message={toastConfig.message}
        onClose={() => setToastConfig((prev) => ({ ...prev, visible: false }))}
      />
      <ConvoyDialog
        visible={dialogConfig.visible}
        type={dialogConfig.type}
        icon={dialogConfig.icon}
        title={dialogConfig.title}
        message={dialogConfig.message}
        buttons={dialogConfig.buttons}
        onClose={() => setDialogConfig({ visible: false })}
      />

      {/* Language Selector Dialog */}
      <ConvoyDialog
        visible={languageModalVisible}
        type="info"
        icon="translate"
        title={t('settings.changeLang')}
        message="Pilih bahasa / Choose language / 言語を選択:"
        buttons={[
          {
            text: 'Bahasa Indonesia 🇮🇩',
            style: locale === 'id' ? 'primary' : 'secondary',
            onPress: () => {
              changeLocale('id');
              setLanguageModalVisible(false);
              showToast('success', 'Bahasa Diubah', 'Bahasa aplikasi berhasil diubah ke Bahasa Indonesia.');
            },
          },
          {
            text: 'English 🇬🇧',
            style: locale === 'en' ? 'primary' : 'secondary',
            onPress: () => {
              changeLocale('en');
              setLanguageModalVisible(false);
              showToast('success', 'Language Changed', 'App language successfully changed to English.');
            },
          },
          {
            text: 'Bahasa Melayu 🇲🇾',
            style: locale === 'ms' ? 'primary' : 'secondary',
            onPress: () => {
              changeLocale('ms');
              setLanguageModalVisible(false);
              showToast('success', 'Bahasa Ditukar', 'Bahasa aplikasi berjaya ditukar ke Bahasa Melayu.');
            },
          },
          {
            text: '日本語 🇯🇵',
            style: locale === 'ja' ? 'primary' : 'secondary',
            onPress: () => {
              changeLocale('ja');
              setLanguageModalVisible(false);
              showToast('success', '言語変更', 'アプリの言語が日本語に変更されました。');
            },
          },
          {
            text: locale === 'id' ? 'BATAL' : locale === 'ms' ? 'BATAL' : locale === 'ja' ? 'キャンセル' : 'CANCEL',
            style: 'secondary',
            onPress: () => setLanguageModalVisible(false),
          },
        ]}
        onClose={() => setLanguageModalVisible(false)}
      />

      {/* Header */}
      <HomeHeader
        displayName={displayName}
        profileInitial={profileInitial}
        profilePhotoUrl={user?.user_metadata?.profile_photo_url || null}
        onProfilePress={() => navigation.navigate('Profile')}
      />

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.scrollInner}>
        <View style={styles.tabContent}>
          <View style={styles.tabHeaderRow}>
            <MaterialCommunityIcons name="cog-outline" size={20} color={colors.primary} />
            <Text style={styles.tabTitle}>{t('settings.title')}</Text>
          </View>
          <Text style={styles.tabSubtitle}>{t('settings.subtitle')}</Text>

          {/* Account Card */}
          <View style={styles.settingsAccountCard}>
            <View style={styles.accountAvatarCircle}>
              <Text style={styles.accountInitial}>{profileInitial}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.accountName}>{displayName}</Text>
              <Text style={styles.accountEmail}>{user?.email || 'Akun Terverifikasi'}</Text>
            </View>
            <TouchableOpacity
              style={styles.profileEditBtn}
              onPress={() => navigation.navigate('Profile')}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="account-edit-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Settings Options Group */}
          <View style={styles.settingsGroup}>
            <Text style={styles.settingsGroupTitle}>{t('settings.prefRadar')}</Text>

            <View style={styles.settingItemRow}>
              <View style={styles.settingItemLeft}>
                <MaterialCommunityIcons name="bell-ring-outline" size={20} color={colors.primaryMuted} />
                <View>
                  <Text style={styles.settingItemTitle}>{t('settings.notifRealtime')}</Text>
                  <Text style={styles.settingItemSub}>{t('settings.notifSub')}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setNotificationsEnabled((prev) => !prev)} activeOpacity={0.8}>
                <MaterialCommunityIcons
                  name={notificationsEnabled ? 'toggle-switch' : 'toggle-switch-off-outline'}
                  size={36}
                  color={notificationsEnabled ? colors.primary : colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.settingItemRow}>
              <View style={styles.settingItemLeft}>
                <MaterialCommunityIcons name="map-clock-outline" size={20} color={colors.primaryMuted} />
                <View>
                  <Text style={styles.settingItemTitle}>{t('settings.darkMap')}</Text>
                  <Text style={styles.settingItemSub}>{t('settings.darkMapSub')}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setDarkModeMap((prev) => !prev)} activeOpacity={0.8}>
                <MaterialCommunityIcons
                  name={darkModeMap ? 'toggle-switch' : 'toggle-switch-off-outline'}
                  size={36}
                  color={darkModeMap ? colors.primary : colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            {/* Language Switcher Row */}
            <TouchableOpacity style={styles.settingItemRow} onPress={() => setLanguageModalVisible(true)} activeOpacity={0.7}>
              <View style={styles.settingItemLeft}>
                <MaterialCommunityIcons name="translate" size={20} color={colors.primaryMuted} />
                <View>
                  <Text style={styles.settingItemTitle}>{t('settings.changeLang')}</Text>
                  <Text style={styles.settingItemSub}>{t('settings.changeLangSub')}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: fontSize.xs, fontFamily: fonts.bold, color: colors.primaryMuted }}>
                  {locale === 'id' ? 'Indonesia' : locale === 'en' ? 'English' : locale === 'ms' ? 'Melayu' : '日本語'}
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.settingsGroup}>
            <Text style={styles.settingsGroupTitle}>{t('settings.locationPerform')}</Text>

            <TouchableOpacity
              style={styles.settingItemRow}
              onPress={() => showToast('success', t('settings.clearCache'), t('settings.cacheToast'))}
              activeOpacity={0.7}
            >
              <View style={styles.settingItemLeft}>
                <MaterialCommunityIcons name="broom" size={20} color={colors.primaryMuted} />
                <View>
                  <Text style={styles.settingItemTitle}>{t('settings.clearCache')}</Text>
                  <Text style={styles.settingItemSub}>{t('settings.clearCacheSub')}</Text>
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Logout Button */}
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
            <MaterialCommunityIcons name="logout-variant" size={18} color={colors.danger} style={{ marginRight: 6 }} />
            <Text style={styles.signOutBtnText}>{t('settings.signOut')}</Text>
          </TouchableOpacity>

          <Text style={styles.appVersionFooter}>TiKum Radar v1.4.0 · Build MVP Phase 1</Text>
        </View>
        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollInner: { paddingBottom: 20 },
  tabContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  tabHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  tabTitle: { fontSize: fontSize.lg, fontFamily: fonts.black, color: colors.textPrimary, letterSpacing: -0.5 },
  tabSubtitle: { fontSize: fontSize.xs, fontFamily: fonts.medium, color: colors.textMuted, lineHeight: 16, marginBottom: spacing.md },

  // Settings Styling
  settingsAccountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.55)',
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.28)',
  },
  accountAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  accountInitial: { color: colors.white, fontFamily: fonts.black, fontSize: fontSize.md },
  accountName: { fontSize: fontSize.md, fontFamily: fonts.bold, color: colors.textPrimary },
  accountEmail: { fontSize: fontSize.xs, fontFamily: fonts.medium, color: colors.textMuted, marginTop: 1 },
  profileEditBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsGroup: { marginBottom: spacing.lg },
  settingsGroupTitle: { fontSize: 10, fontFamily: fonts.bold, color: colors.textMuted, letterSpacing: 1, marginBottom: spacing.sm },
  settingItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(30, 41, 59, 0.45)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.xs + 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingItemLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  settingItemTitle: { fontSize: fontSize.xs + 1, fontFamily: fonts.bold, color: colors.textPrimary },
  settingItemSub: { fontSize: 10, fontFamily: fonts.medium, color: colors.textMuted, marginTop: 1 },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  signOutBtnText: { fontSize: fontSize.xs + 1, fontFamily: fonts.bold, color: colors.danger },
  appVersionFooter: { fontSize: 10, fontFamily: fonts.medium, color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg, letterSpacing: 0.5 },
});
