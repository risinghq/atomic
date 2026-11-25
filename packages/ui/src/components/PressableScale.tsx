import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import {
  createAnimatedComponent,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { haptic, type HapticKind } from '../theme/haptics';
import { pressScale, springs } from '../theme/motion';

const AnimatedPressable = createAnimatedComponent(Pressable);

export type PressableScaleProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /**
   * The haptic played on press. A plain press plays none; a haptic marks a
   * commit such as saving or switching tabs.
   */
  feedback?: HapticKind | false;
  /** How far the control shrinks while held. */
  scaleTo?: number;
};

/** A pressable that shrinks under the finger and springs back on release. */
export function PressableScale({
  feedback = false,
  scaleTo = pressScale,
  disabled,
  onPressIn,
  onPressOut,
  onPress,
  style,
  ...props
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }), [scale]);

  return (
    <AnimatedPressable
      accessibilityRole="button"
      aria-disabled={!!disabled}
      {...props}
      disabled={disabled}
      onPressIn={(event) => {
        scale.value = withSpring(scaleTo, springs.snappy);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.value = withSpring(1, springs.snappy);
        onPressOut?.(event);
      }}
      onPress={(event) => {
        if (feedback) haptic(feedback);
        onPress?.(event);
      }}
      style={[style, animatedStyle]}
    />
  );
}
