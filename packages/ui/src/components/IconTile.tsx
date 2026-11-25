import type { ReactNode } from 'react';
import { StyleSheet, Text as NativeText, View } from 'react-native';

export type IconTileProps = {
  /** An emoji, or an icon element sized to fit the tile. */
  icon: ReactNode;
  color: string;
  size?: number;
};

/** A rounded square of color holding one emoji or icon, as in category lists. */
export function IconTile({ icon, color, size = 40 }: IconTileProps) {
  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: size * 0.3, backgroundColor: color },
      ]}>
      {typeof icon === 'string' ? (
        <NativeText style={{ fontSize: size * 0.5 }} allowFontScaling={false}>
          {icon}
        </NativeText>
      ) : (
        icon
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center' },
});
