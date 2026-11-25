import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { radii, space } from '../theme/layout';
import { useTheme } from '../theme/ThemeProvider';
import { PressableScale } from './PressableScale';
import { Text, type ColorName } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'plain';

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: 'regular' | 'small';
  icon?: ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const labelColor: Record<ButtonVariant, ColorName> = {
  primary: 'onAccent',
  secondary: 'text',
  plain: 'text',
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'regular',
  icon,
  disabled = false,
  style,
}: ButtonProps) {
  const { colors } = useTheme();
  const fill = { primary: colors.accent, secondary: colors.surface, plain: 'transparent' }[variant];

  return (
    <PressableScale
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.base,
        size === 'small' ? styles.small : styles.regular,
        { backgroundColor: fill },
        disabled && styles.disabled,
        style,
      ]}>
      {icon ? <View>{icon}</View> : null}
      <Text
        variant={size === 'small' ? 'subheadline' : 'headline'}
        weight="semibold"
        color={labelColor[variant]}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  regular: { minHeight: 52, paddingHorizontal: space.xl, borderRadius: radii.lg },
  small: { minHeight: 36, paddingHorizontal: space.lg, borderRadius: radii.full },
  disabled: { opacity: 0.4 },
});
