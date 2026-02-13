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
import type { LoginScreenProps } from '../navigation/types';
import { useLogin } from '../hooks/useAuthMutations';

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const theme = useTheme();
  const loginMutation = useLogin();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ username: false, password: false });

  const usernameError = touched.username && username.length < 3;
  const passwordError = touched.password && password.length < 6;
  const canSubmit = username.length >= 3 && password.length >= 6 && !loginMutation.isPending;

  const handleLogin = () => {
    if (!canSubmit) return;
    loginMutation.mutate({ username, password });
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
              PDF Invoice Manager
            </Text>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              Sign in to continue
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

            {loginMutation.isError && (
              <HelperText type="error" visible>
                {loginMutation.error?.message ?? 'Login failed. Please try again.'}
              </HelperText>
            )}

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loginMutation.isPending}
              disabled={!canSubmit}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              Sign In
            </Button>

            <Button
              mode="text"
              onPress={() => navigation.navigate('Register')}
              style={styles.link}
            >
              Don't have an account? Register
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
    marginBottom: 40,
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
