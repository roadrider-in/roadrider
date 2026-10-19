import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';

export const AppInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  suffix,
  onSuffixPress,
  secureTextEntry = false,
  keyboardType = 'default',
  editable = true,
  autoCapitalize = 'none',
  maxLength,
  multiline = false,
  numberOfLines = 1,
  style,
  onFocus,
  onBlur,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputBox,
          isFocused ? styles.inputFocused : null,
          error ? styles.inputError : null,
          !editable ? styles.inputDisabled : null,
          multiline ? { minHeight: 80, alignItems: 'flex-start', paddingTop: 10 } : null,
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.warmGrey}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          editable={editable}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
          multiline={multiline}
          numberOfLines={numberOfLines}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[
            styles.input,
            Platform.OS === 'web' && { outlineStyle: 'none', outlineWidth: 0 },
            multiline && { textAlignVertical: 'top' },
          ]}
        />
        {suffix && (
          <TouchableOpacity
            disabled={!onSuffixPress}
            onPress={onSuffixPress}
            style={styles.suffixWrapper}
          >
            {typeof suffix === 'string' ? (
              <Text style={styles.suffixText}>{suffix}</Text>
            ) : (
              suffix
            )}
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 13,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.charcoal,
    fontFamily: 'DM Sans, sans-serif',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputBox: {
    minHeight: 48,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: 'rgba(156, 154, 154, 0.35)',
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    transition: 'border-color 0.15s ease',
  },
  inputFocused: {
    borderColor: colors.terracotta,
    borderWidth: 1.5,
    backgroundColor: colors.white,
  },
  inputError: {
    borderColor: colors.danger,
    borderWidth: 1.5,
  },
  inputDisabled: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: 'rgba(156, 154, 154, 0.2)',
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: colors.black,
    fontFamily: 'DM Sans, sans-serif',
    paddingVertical: 10,
  },
  suffixWrapper: {
    paddingLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suffixText: {
    color: colors.terracotta,
    fontSize: 18,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 10.5,
    color: colors.danger,
    marginTop: 4,
    fontFamily: 'DM Sans, sans-serif',
    fontWeight: '500',
  },
});
