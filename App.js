import { useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import LoginScreen from './src/screens/LoginScreen.js';
import RegisterScreens from './src/screens/RegisterScreens.js';

export default function App() {
  const [screen, setScreen] = useState('register');

  const handleRegistered = () => {
    setScreen('login');
  };

  return (
    <SafeAreaView style={styles.container}>
      {screen === 'register' ? (
        <RegisterScreens onRegistered={handleRegistered} />
      ) : (
        <LoginScreen onBackToRegister={() => setScreen('register')} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});