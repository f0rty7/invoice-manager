import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { TextInput, Button, Text, HelperText, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RegisterScreenProps } from '../navigation/types';
import { useRegister } from '../hooks/useAuthMutations';

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const theme = useTheme();
  const registerMutation = useRegister();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({
    username: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  const usernameError = touched.username && username.length < 3;
  const passwordError = touched.password && password.length < 6;
  const confirmError = touched.confirmPassword && password !== confirmPassword;
  const canSubmit =
    username.length >= 3 &&
    password.length >= 6 &&
    password === confirmPassword &&
    !registerMutation.isPending;

  const handleRegister = () => {
    if (!canSubmit) return;
    registerMutation.mutate({
      username,
      password,
      ...(email ? { email } : {}),
    });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text variant="headlineLarge" style={[styles.title, { color: theme.colors.primary }]}>
              Create Account
            </Text>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              Register to get started
            </Text>
          </View>

          <View style={styles.form}>
            <TextInput
              label="Username"
              value={username}
              onChangeText={setUsername}
              onBlur={() => setTouched((t) => ({ ...t, username: true }))}
              autoCapitalize="none"
              autoCorrect={false}
              left={<TextInput.Icon icon="account" />}
              error={usernameError}
              mode="outlined"
            />
            <HelperText type="error" visible={usernameError}>
              Username must be at least 3 characters
            </HelperText>

            <TextInput
              label="Email (optional)"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              left={<TextInput.Icon icon="email" />}
              mode="outlined"
            />
            <HelperText type="info" visible={false}>
              {' '}
            </HelperText>

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              secureTextEntry={!showPassword}
              left={<TextInput.Icon icon="lock" />}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
              error={passwordError}
              mode="outlined"
            />
            <HelperText type="error" visible={passwordError}>
              Password must be at least 6 characters
            </HelperText>

            <TextInput
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              onBlur={() => setTouched((t) => ({ ...t, confirmPassword: true }))}
              secureTextEntry={!showPassword}
              left={<TextInput.Icon icon="lock-check" />}
              error={confirmError}
              mode="outlined"
            />
            <HelperText type="error" visible={confirmError}>
              Passwords do not match
            </HelperText>

            {registerMutation.isError && (
              <HelperText type="error" visible>
                {registerMutation.error?.message ?? 'Registration failed.'}
              </HelperText>
            )}

            <Button
              mode="contained"
              onPress={handleRegister}
              loading={registerMutation.isPending}
              disabled={!canSubmit}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              Register
            </Button>

            <Button
              mode="text"
              onPress={() => navigation.navigate('Login')}
              style={styles.link}
            >
              Already have an account? Sign In
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontWeight: '700',
    marginBottom: 8,
  },
  form: {
    gap: 4,
  },
  button: {
    marginTop: 16,
    borderRadius: 12,
  },
  buttonContent: {
    paddingVertical: 6,
  },
  link: {
    marginTop: 8,
  },
});
