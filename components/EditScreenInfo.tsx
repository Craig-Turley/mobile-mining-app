import { Text, View, Pressable } from 'react-native';
import { useAppTheme } from 'theme/theme-provider';

interface EditScreenInfoProps {
  path: string;
}

export const EditScreenInfo: React.FC<EditScreenInfoProps> = ({ path }) => {
  const title = 'Open up the code for this screen:';
  const description =
    'Change any of the text, save the file, and your app will automatically update.';
  const { theme, toggleTheme } = useAppTheme();


  return (
    <View>
      <View className={styles.getStartedContainer}>
        <Text className={styles.getStartedText}>{title}</Text>
        <View className={`${styles.codeHighlightContainer} ${styles.homeScreenFilename}`}>
          <Text>{path}</Text>
        </View>
        <Text className={styles.getStartedText}>{description}</Text>
        <Pressable
          onPress={toggleTheme}
          className="mt-6 rounded-xl bg-primary px-5 py-3"
        >
          <Text className="font-semibold text-primaryForeground">
            Toggle theme
          </Text>
        </Pressable>

      </View>
    </View >
  );
};

const styles = {
  codeHighlightContainer: `rounded-md px-1`,
  getStartedContainer: `items-center mx-12`,
  getStartedText: `text-lg leading-6 text-center`,
  homeScreenFilename: `my-2`,
};
